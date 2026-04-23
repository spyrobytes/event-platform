# QR Codes in Invitation Emails — Implementation Plan

**Feature:** Embed scannable QR codes in invite emails. The QR doubles as an "access pass" at the venue — door staff scan a guest's QR, see guest identity + RSVP status, and grant access based on visual verification.
**Scope:** Email attachment + dashboard display + dedicated pass view. Full backend check-in (record check-in timestamps, prevent double-entry) remains **pre-GA**, not MVP.
**Effort estimate:** ~2 dev days across 7 small PRs
**Owner:** _TBD_
**Status:** Ready to pick up

> **Revision note.** This version supersedes the original draft (kept out-of-repo). Initial revision: adds pass-view route, attachment-plumbing task, broken-image fallback, revoked-invite handling in the QR route; switches QR target URL from `/rsvp/[token]` to `/invite/[token]/pass`; fixes factual error about the Mailgun SDK; narrows dashboard UX to Pattern 2 (action-menu + modal). Second revision (2026-04-23) applies reviewer feedback: B1 (inline-attachment abstraction), B2 (`force-dynamic`), B3 (phone-only cohort), B4 (copy-link action), S1–S4 (pass-view state & fields), S5 (OG privacy), S6 (email copy), S7 (multipart boundary), S8 (single Prisma call), and selected polish items (N1, N2, N4, N6, N7, N8).

---

## 1. Goals and Non-Goals

**Goals**

- Every `INVITE` email includes an inline QR code that, when scanned at the venue, opens a **"pass view"** showing guest identity and RSVP status — optimized for door staff glancing at a phone, not for animated delight.
- Organizers can view and download each invite's QR from the dashboard (Pattern 2: action-menu + modal).
- Implementation respects existing email queue / retry semantics (no duplicate sends, no orphaned jobs).
- Feature is additive: no changes to existing RSVP or email flows for guests. The email body's "RSVP Now" CTA continues to point at the animated invitation card (`/invite/[token]`); only the QR encodes the pass URL.
- QR URL is **durable** — same token, same URL, reusable when pre-GA check-in infrastructure ships. No QR rotation.
- **Phone-only invite handling.** Invitees created without an email address (`Invite.email === null`) do not receive a QR via automated delivery in the MVP. The organizer-driven workflow (manually copy the invite link from the dashboard, send via SMS/WhatsApp) continues to function: the tokenized link the guest receives opens the pass view directly on their phone at the venue. Organizers who want to supply a QR image to phone-only invitees can download the PNG from the dashboard modal and attach it to the message. Automated SMS/WhatsApp delivery via Twilio is deferred to GA.

**Non-Goals (for this plan)**

- **Backend check-in state** (scanning writes a `checkedInAt` timestamp, prevents double-entry). Pre-GA work. The MVP is visual verification only.
- QR codes in `CONFIRMATION` or `REMINDER` emails — low marginal value; guest already has the invite email.
- Branded QR codes with logo overlay — requires bumping error correction to `H` and design input. Deferred until organizers request it.
- Apple / Google Wallet passes — significant infra lift; only worth doing once pre-GA check-in is live and demand is proven.
- Staff scanner UI (camera-based scan page) — pre-GA, if the check-in flow needs it.

---

## 2. Architectural Decisions

Decisions worth making explicitly so they're not relitigated in PR review.

### 2.1 Generate QR at send-time, not queue-time

`EmailOutbox.payload` is `Json`. Serializing a binary PNG into the payload would require base64 bloat (+33% size per invite) or separate storage. QR generation is deterministic and takes ~5ms, so we regenerate on each send attempt.

**Consequences:**
- No migration to `EmailOutbox` needed.
- Retries after transient Mailgun or network errors regenerate the QR safely.
- In-flight queued invites (sent after this ships) automatically get QRs without backfill.

### 2.2 PNG for email, SVG for web

- **PNG in emails** — universally rendered across clients (Outlook desktop, Gmail app, Apple Mail). SVG support in email is inconsistent; not worth the fight.
- **SVG on dashboard** — ~500 bytes, crisp at any zoom, prints cleanly.

### 2.3 CID inline attachments, not hotlinked images

Email QR is embedded as `cid:rsvp-qr.png`, not `<img src="https://…/qr">`. Most email clients block external images by default. CID inline renders immediately even with images disabled as a default.

### 2.4 QR generation failures do NOT fail the email

If `generateQrPngBuffer()` throws, the email sends without the QR and we log a warning. The template conditionally renders the `<Img>` block based on a `qrAvailable` flag, so recipients never see a broken-image icon.

Rationale:

- A missing QR is a degraded experience; a failed email is a lost invite.
- The cron retry loop would otherwise re-attempt failing jobs indefinitely.
- The RSVP link in the email body is always functional on its own.

### 2.5 QR encodes `/invite/[token]/pass`, not `/invite/[token]` or `/rsvp/[token]`

The existing `/invite/[token]` route renders the animated invitation card (FlipFlap reveal, envelope opening, etc.) — designed for guest delight on first receipt. Forcing door staff through a 2-second reveal animation while a line backs up is poor UX.

The **pass view** at `/invite/[token]/pass` renders the same underlying data (guest name, RSVP status, event details) in a compact, scannable layout with no animations. Same token, different presentation.

**Consequences:**
- Guests tapping the email's "RSVP Now" button → animated card (unchanged).
- Door staff scanning the QR → fast pass view.
- Pre-GA check-in extends the pass view with a staff-authenticated "Check In" button. No QR rotation required.

### 2.6 Extend `sendEmail()` to support attachments

The current `SendEmailOptions` at `src/lib/email.ts:49` has no `attachments` field, and neither `sendEmailViaSMTP` nor `sendEmailViaMailgun` passes any. This must be added as a separate, inert-until-used task before QR code propagation.

For **SMTP** (Mailpit in dev), nodemailer accepts `attachments: [{ filename, content, cid }]` natively. We set `cid === filename` so the HTML reference `cid:${filename}` works on both providers.

For **Mailgun**, the current code uses raw `fetch` + `FormData` — not the `mailgun.js` SDK. Inline attachments use `formData.append("inline", new Blob([buffer]), "rsvp-qr.png")` where "inline" (vs "attachment") is the Mailgun field name that produces CID-referenced images. The filename passed to FormData is the CID identifier, so `filename` must equal whatever `cid:<…>` value is referenced in the HTML.

The `SendEmailOptions.attachments` shape normalizes this with a single `inline?: boolean` flag instead of exposing a separate `cid` field (which cannot be honored independently by Mailgun). See Task 2a.

### 2.7 Cache QRs aggressively

The QR API route serves `Cache-Control: public, max-age=31536000, immutable`. Token → URL is a stable 1-to-1 mapping; revocation is handled at the pass view itself (which does a live DB read), not at the QR image layer. Aggressive caching keeps the dashboard snappy and CDN costs minimal.

### 2.8 State detection uses timestamps, not status enum

The pass view reads `invite.revokedAt`, `invite.expiresAt`, `event.endAt`, and `event.status` directly. The `InviteStatus` enum is treated as denormalized display state for dashboard listings — not as authoritative access control. If an invite's `revokedAt` is non-null, the pass view treats it as revoked regardless of whether `InviteStatus` has been updated.

### 2.9 Route map — three routes share the same token

| Route | Audience | Rendering | Auth |
|---|---|---|---|
| `/invite/[token]` | Guest (email CTA) | Animated invitation card | Token in URL |
| `/invite/[token]/pass` | Staff / guest at venue | Compact, no animation | Token in URL |
| `/rsvp/[token]` | Guest (direct-link RSVP flow) | RSVP form | Token in URL |

The email's "RSVP Now" CTA points at `/invite/[token]`. The QR encodes `/invite/[token]/pass`. `/rsvp/[token]` remains the target of direct RSVP links and is still live; a future cleanup pass may consolidate it behind `/invite/[token]` but that is out of scope here.

---

## 3. Prerequisites

**Install**

```bash
npm install qrcode
npm install -D @types/qrcode
```

**Runtime:** Node (default for existing Route Handlers and cron). No Edge runtime work.

**Environment variables:** none new. Reuses `NEXT_PUBLIC_BASE_URL`.

---

## 4. Task Breakdown

Seven atomic, independently-mergeable PRs. Each PR should be under ~300 lines of diff. Dependencies are explicit; Task 1, 2a, 3.5, and 4 can be parallelized by multiple developers.

### Task 1 — QR utility module

**Branch:** `feat/qr-utility-module`
**PR title:** `feat: add QR code generation utility`

**Files**

- `src/lib/qr.ts` _(new)_
- `tests/unit/qr.test.ts` _(new)_

**Exports**

```ts
buildPassUrl(token: string): string
generateQrSvg(url: string, size?: number): Promise<string>
generateQrPngBuffer(url: string, size?: number): Promise<Buffer>
generateQrDataUrl(url: string): Promise<string>
buildQrFilename(guestName: string | null, token: string): string
```

`buildPassUrl(token)` returns `${NEXT_PUBLIC_BASE_URL}/invite/${token}/pass`.

`buildQrFilename(guestName, token)` centralizes download filename sanitization so the dashboard modal, future bulk-export, and any ad-hoc tooling all produce the same shape. Reference implementation:

```ts
export function buildQrFilename(guestName: string | null, token: string): string {
  const safe = (guestName ?? "invite")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "invite";
  return `rsvp-${safe}-${token.slice(0, 6)}.png`;
}
```

The 6-char token suffix disambiguates when organizers download multiple guests with the same first name.

**Acceptance criteria**

- [ ] All exports fully typed; no `any`.
- [ ] `buildPassUrl` throws a clear error if `NEXT_PUBLIC_BASE_URL` is unset.
- [ ] `buildPassUrl` handles trailing slash in base URL correctly.
- [ ] Default error correction level is `M`, documented in a code comment with rationale.
- [ ] `buildQrFilename` covers: null name → `"invite"` base, diacritics stripped, non-alphanumerics collapsed to hyphens, leading/trailing hyphens trimmed, 32-char cap, token suffix preserved.
- [ ] Unit tests cover: URL construction, trailing-slash normalization, missing env var, SVG output shape, PNG buffer non-empty, `buildQrFilename` cases above.
- [ ] JSDoc on each export explaining chosen options.

---

### Task 2a — Extend `sendEmail()` with attachments support

**Branch:** `feat/email-attachments`
**PR title:** `feat: plumb attachments through sendEmail`
**Depends on:** none

**Files**

- `src/lib/email.ts` _(edit)_
- `tests/unit/email.test.ts` _(extend)_

**Changes**

- Extend `SendEmailOptions`:
  ```ts
  type SendEmailOptions = {
    to: string;
    subject: string;
    html: string;
    text?: string;
    tags?: string[];
    attachments?: Array<{
      filename: string;
      content: Buffer;
      inline?: boolean;          // If true, attachment is embeddable via cid:<filename> in HTML
      contentType?: string;      // Defaults to application/octet-stream
    }>;
  };
  ```

  **Why `inline` and not `cid`.** Mailgun's REST API has no separate CID field — the FormData filename *is* the CID reference. Nodemailer allows an independent `cid`, but that asymmetry would silently diverge between providers (SMTP honors a custom cid, Mailgun ignores it and uses the filename). A single `inline` boolean sidesteps the divergence: callers reference the attachment in HTML as `cid:${filename}` on both paths.
- In `sendEmailViaSMTP`: for each attachment, forward to nodemailer's `sendMail` as `{ filename, content, contentType, cid: inline ? filename : undefined }` so the CID matches the filename.
- In `sendEmailViaMailgun`: for each attachment, append to FormData as `"inline"` (when `inline === true`) or `"attachment"` (otherwise), using `new Blob([content], { type: contentType ?? "application/octet-stream" })` with the filename.

**Acceptance criteria**

- [ ] `SendEmailOptions.attachments` is optional; existing callers compile unchanged.
- [ ] Nodemailer SMTP path forwards the array to `transporter.sendMail({ attachments })` with `cid` set to `filename` when `inline === true`.
- [ ] Mailgun path produces correct FormData field names (`inline` vs `attachment`) keyed off `inline === true`.
- [ ] `sendEmailViaMailgun` does **not** manually set a Content-Type header when the body is `FormData`; `fetch` derives the `multipart/form-data; boundary=…` header. Setting it manually corrupts the boundary.
- [ ] Unit tests: (a) SMTP path: inline attachment passed to `transporter.sendMail` with `cid === filename`; (b) Mailgun path: mocked `fetch` sees `inline` field for `inline: true` and `attachment` field for `inline: false/undefined`; (c) HTML reference `cid:rsvp-qr.png` renders correctly across both mocked transports.
- [ ] No behavior change for calls that omit `attachments` — verified via existing test suite.

---

### Task 2b — Wire QR into `processEmail()` for INVITE

**Branch:** `feat/qr-email-integration`
**PR title:** `feat: attach QR code to invite emails`
**Depends on:** Task 1, Task 2a

**Files**

- `src/lib/email.ts` _(edit)_
- `tests/unit/email.test.ts` _(extend)_

**Changes**

- In the `INVITE` case of `processEmail()`, after payload extraction, call `generateQrPngBuffer(buildPassUrl(payload.token))`.
- On success: pass the buffer through the new `attachments` option with `filename: "rsvp-qr.png"`, `inline: true`, `contentType: "image/png"`. The template references `cid:rsvp-qr.png` — the CID value matches the filename on both providers (see §2.6, Task 2a). Also set `qrAvailable: true` in the template payload.
- On failure: `logger.warn("QR generation failed", { inviteId, error })`, set `qrAvailable: false`, send the email without the attachment. Never throw.
- Leave `CONFIRMATION`, `REMINDER`, `NO_RESPONSE_REMINDER`, `VERIFICATION`, `PASSWORD_RESET` cases untouched.
- The INVITE email payload must include `token` — verify this is present in `queueInviteEmail` callers or add a clear error.

**Acceptance criteria**

- [ ] INVITE emails include QR PNG attachment on the happy path.
- [ ] Other email types are byte-for-byte unchanged (snapshot-verified).
- [ ] QR generation failure is logged at `warn` and the email still sends successfully with `qrAvailable: false`.
- [ ] Mailgun `messageId` is still captured and persisted to `EmailOutbox`.
- [ ] All existing `email.test.ts` tests pass unchanged.
- [ ] New test: forced QR generation failure does not throw out of `processEmail()`.
- [ ] New test: payload with missing token is handled defensively (logged, no attachment, email still sent).

---

### Task 3 — Update `InviteEmail` template (conditional QR block)

**Branch:** `feat/qr-invite-email-template`
**PR title:** `feat: render QR code in invite email`
**Depends on:** Task 2b

**Files**

- `src/emails/InviteEmail.tsx` _(edit)_
- `src/lib/email.ts` _(edit — `InviteEmailPayload` type)_

**Changes**

- Add `qrAvailable?: boolean` to `InviteEmailPayload`.
- In the template, conditionally render the QR block only when `qrAvailable === true`:
  ```tsx
  {qrAvailable && (
    <Section>
      <Img
        src="cid:rsvp-qr.png"
        alt={`RSVP and check-in QR code for ${eventTitle}`}
        width={200}
        height={200}
        style={qrImageStyles}
      />
      <Text style={qrHelperStyles}>
        Show this QR at the venue — staff can verify your invitation at a glance.
      </Text>
    </Section>
  )}
  ```
- Place the QR block above the existing "RSVP Now" CTA (design call; coordinate with designer).
- The email body always also includes the plain `rsvpUrl` link (existing behavior) — the QR is a convenience, never the only path to the invite.

**Acceptance criteria**

- [ ] QR renders in React Email dev server preview when `qrAvailable: true`.
- [ ] With `qrAvailable: false` or undefined, the QR block is not rendered and no broken-image icon appears.
- [ ] Manually verified in: Gmail web, Gmail iOS, Apple Mail, Outlook web (at minimum).
- [ ] Alt text is descriptive and includes the event title.
- [ ] Mobile rendering: image does not overflow narrow viewports.
- [ ] Text-only fallback (e.g. Outlook with images blocked) shows the alt text plus the RSVP link; never a broken-image icon as the only cue.

---

### Task 3.5 — Pass view page (scanner-optimized invite summary)

**Branch:** `feat/invite-pass-view`
**PR title:** `feat: add pass view for venue scanner use`
**Depends on:** none (can parallelize with 1, 2a, 4)

**Files**

- `src/app/invite/[token]/pass/page.tsx` _(new)_
- `src/app/invite/[token]/pass/pass.module.css` _(new, optional — or inline Tailwind)_

**Behavior**

Server component. Explicitly opts into dynamic rendering and reads the invite in a single Prisma call with `rsvp` and `event` included. Renders a compact layout optimized for staff scanning a phone at arm's length.

```tsx
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitation",
  description: "Event invitation details",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Event Invitation",
    description: "View your invitation details",
  },
};

const invite = await db.invite.findUnique({
  where: { tokenHash },
  include: {
    rsvp: true,
    event: { select: { title: true, startAt: true, endAt: true, status: true } },
  },
});
```

**Render order (happy path):**

1. **Guest name** — extra-large (~48px), top of viewport. Fallback chain (first non-null wins):
   1. `rsvp.guestName` if RSVP exists.
   2. `invite.name`.
   3. Email local-part (`invite.email.split("@")[0]`) if `invite.email` is set.
   4. `"Guest"`.
2. **RSVP status badge** — prominent color-coded pill:
   - Green "Attending" for `rsvp.response === "YES"`.
   - Amber "Maybe" for `rsvp.response === "MAYBE"`.
   - Red "Declined" for `rsvp.response === "NO"`.
   - Gray "RSVP pending" if no RSVP row exists.
3. **Party label** — use the *actual* declared size, not the cap:
   - If `rsvp` exists and `rsvp.guestCount > 1`: `"Party of ${rsvp.guestCount}"`.
   - Else if no RSVP and `invite.plusOnesAllowed > 0`: `"Up to ${1 + invite.plusOnesAllowed} guests"`.
   - Else: omitted.
4. **Event title and start date** — smaller; lets staff verify the right event.

**Access-blocking overlays** (render one of these *instead of* the render order above; priority top-to-bottom):

- **Revoked banner** — full-bleed red if `invite.revokedAt` is set.
- **Cancelled banner** — full-bleed red if `event.status === "CANCELLED"`.
- **Expired banner** — amber if `invite.expiresAt && invite.expiresAt < now`.
- **Event-ended banner** — gray if `event.endAt && event.endAt < now`. When `event.endAt === null`, skip this state (do not guess from `startAt`); a null-end event has no reliable "ended" signal.

State detection uses timestamps/enums directly per §2.8 — do not rely on `InviteStatus`.

No client JS required for MVP. No animations.

**Security/auth:** unauthenticated. The token itself is the credential. Matches the existing `/rsvp/[token]` and `/invite/[token]` auth model.

**`X-Robots-Tag` response header (optional belt-and-braces).** The `metadata.robots` export covers HTML-parsing crawlers; it does not cover HEAD-only bots (Slackbot link previews, some email scanners). Setting `X-Robots-Tag: noindex, nofollow` on the response requires either a `headers()` rule in `next.config.ts` matching `/invite/:token/pass` or a middleware rule — pick one and note the choice in the PR. Not a blocker for first merge if `metadata.robots` is in place.

**Acceptance criteria**

- [ ] `export const dynamic = "force-dynamic"` is set; build output lists the pass route as `ƒ` (dynamic), not `○` (static).
- [ ] Pass view renders with exactly one DB query per request (single `findUnique` with `include`).
- [ ] Renders the four key fields (guest, RSVP, party, event) legibly at 375px viewport.
- [ ] Guest name fallback chain is implemented in the order above; pass view renders when `invite.name` is null and no RSVP exists.
- [ ] Party label uses `rsvp.guestCount` when an RSVP exists; `1 + plusOnesAllowed` cap only when no RSVP exists.
- [ ] Color-coded RSVP badge matches `rsvp.response`.
- [ ] Revoked, cancelled, expired, and event-ended states each render a blocking banner that dominates the view.
- [ ] `event.endAt === null` does not trigger the event-ended banner under any condition.
- [ ] Returns 404 for unknown token hashes.
- [ ] SSR-rendered; no hydration-required components in the MVP.
- [ ] `metadata.robots = { index: false, follow: false }` is set.
- [ ] `metadata.openGraph` contains no guest-identifying data — social link preview in iMessage/Slack shows generic text only.
- [ ] Smoke-tested: visit `/invite/<test-token>/pass` on a phone, hold at arm's length, confirm guest name + RSVP badge are legible without zoom.

---

### Task 4 — QR API route for dashboard

**Branch:** `feat/qr-api-route`
**PR title:** `feat: add QR code API route for invite tokens`
**Depends on:** Task 1

**Files**

- `src/app/api/invites/[token]/qr/route.ts` _(new)_
- `tests/unit/qr-route.test.ts` _(new)_

**Behavior**

- `GET /api/invites/[token]/qr` → SVG (default).
- `GET /api/invites/[token]/qr?format=png` → PNG.
- Any other `format` value falls back silently to SVG.
- Validate token by hashing and looking up `Invite.tokenHash`. Return 404 if not found.
- If `Invite.revokedAt` is set: still return 200 with the QR (the image itself isn't revoked — the pass view enforces access). The pass view handles the revoked-state display.
- Cache headers on 200:
  ```
  Cache-Control: public, max-age=31536000, immutable
  CDN-Cache-Control: public, max-age=31536000
  ```

**Security note (document in code):** the route is intentionally unauthenticated — the token itself is the credential. This matches the existing `/rsvp/[token]` and `/invite/[token]` patterns. Token entropy is 256 bits (`crypto.randomBytes(32)` in `src/lib/tokens.ts`), so enumeration is not a realistic threat.

**Acceptance criteria**

- [ ] 200 with correct `Content-Type` for both SVG and PNG.
- [ ] 404 for invalid / unknown tokens.
- [ ] Cache headers present on 200, absent on 404.
- [ ] Tests cover: valid token returns SVG, valid token returns PNG, invalid token returns 404, unsupported format falls back to SVG.
- [ ] Route file includes a comment explaining the auth-free design and why revoked invites still return the image.

---

### Task 5 — Dashboard display (action-menu + modal)

**Branch:** `feat/qr-dashboard-display`
**PR title:** `feat: show QR code per invite in dashboard`
**Depends on:** Task 4

**Files**

- `src/components/features/InviteManager/InviteTable.tsx` _(edit — add action-menu item)_
- `src/components/features/InviteManager/InviteQrModal.tsx` _(new)_

**Changes**

Pattern chosen: **action-menu + modal** (not inline thumbnail). Reasons captured in the plan revision thread: row density, per-row HTTP cost, mobile friendliness.

- Add a "View QR" entry to each row's Actions menu in `InviteTable`.
- Click opens `InviteQrModal`, which renders:
  - Guest name (matching the row).
  - QR image loaded from `/api/invites/[token]/qr` (SVG for display).
  - Event title (so screenshots are self-contained at the door).
  - **Copy invite link** button (equal visual weight to Download PNG) → `navigator.clipboard.writeText(buildPassUrl(token))`; swap label to `"Copied ✓"` for ~2s after click, then revert. This is the primary tool for phone-only invites (see §1 Goals): organizers texting the link manually need the URL on their clipboard, not a file.
  - **Download PNG** button → targets `?format=png` with `download={buildQrFilename(guestName, token)}`. Use the shared helper from `src/lib/qr.ts` (Task 1, N4) rather than ad-hoc sanitization here.
  - **Close** button; focus trap; `Esc` closes.
- Explicit `width`/`height` on the `<img>` inside the modal to prevent layout shift while the SVG loads.

**Acceptance criteria**

- [ ] "View QR" action is discoverable in every invite row.
- [ ] Modal opens with QR, guest name, event title; focus is trapped inside.
- [ ] "Copy invite link" button copies the pass URL and shows a visible confirmation (`"Copied ✓"`) for ~2s, then reverts.
- [ ] Download produces a usable PNG file; filename is generated by `buildQrFilename`, not a per-PR re-implementation.
- [ ] `Esc` and the Close button both dismiss the modal.
- [ ] Mobile dashboard layout is not broken.
- [ ] No cumulative layout shift on modal open.

---

## 5. Testing Strategy

**Unit tests (Vitest)** — covered in each task's AC above. No shared fixtures needed beyond the existing `email.test.ts` mock Mailgun client.

**Integration tests** — not required for MVP. Existing API route tests cover the general shape; adding integration tests for binary responses adds complexity without catching realistic bugs. Exception: write a lightweight test that asserts attachments propagate through both `sendEmailViaSMTP` (via a mocked nodemailer) and `sendEmailViaMailgun` (via a mocked fetch that inspects the FormData).

**Manual smoke test checklist (before production deploy)**

1. Create event → add invite → send invitation with QR.
2. Confirm QR appears in the received email across 3+ clients (Gmail web, Apple Mail, Outlook web).
3. Scan QR with a phone camera → opens `/invite/<token>/pass` with guest name, RSVP badge, event title visible without scrolling.
4. Hold the phone at arm's length — guest name and RSVP badge readable without zoom on a 6.1" display.
5. Visit `/api/invites/<token>/qr` directly in a browser → SVG renders inline.
6. Visit `?format=png` → PNG renders / downloads.
7. Dashboard action-menu "View QR" → modal opens; download produces a valid PNG.
8. Force a QR generation error (e.g. temporarily throw in `generateQrPngBuffer`) → verify email still sends, no broken-image icon, warning logged.
9. Revoke an invite (`UPDATE invites SET revoked_at = now() WHERE id = …`) → scan its QR → pass view shows the "revoked" banner.

**Accessibility**

- Alt text on every QR image includes the event title.
- Email helper copy explains what the QR is for.
- Pass view uses semantic HTML (`<h1>` for guest name, `<main>` landmark) so screen readers announce the order correctly.
- Dashboard modal is keyboard-navigable; focus trap prevents tabbing behind it.

---

## 6. Rollout Plan

Ship in task order. Tasks are additive and non-breaking; rollback of any single PR is safe.

| Merge order | What becomes live | User impact |
|---|---|---|
| Task 1 + Task 2a (parallel) | Utilities + attachment plumbing (unused by any email yet) | None |
| Task 3.5 | Pass view reachable at `/invite/[token]/pass` (not yet referenced by any email) | None |
| Task 4 | QR API route callable (no UI references it yet) | None |
| Task 2b + Task 3 (together) | Emails include QR attachment + conditional template block | Next invite send includes QR. Already-queued-but-unsent invites also get the QR on send. Already-sent invites do **not** retroactively gain a QR — organizer can re-send if needed. |
| Task 5 | Dashboard action-menu "View QR" appears in every invite row | Organizers see QR per invite |

**Rollback**

- Each task is small and independently revertable.
- No DB migrations in any task.
- Emails already delivered with a QR remain functional forever — the URL encoded in the QR (`/invite/<token>/pass`) does not change.

### 6.5 Post-ship monitoring (stub)

Not in scope for the MVP tasks above, but worth capturing so the owner of observability picks it up alongside ship. Define dashboards / alerts for:

- **QR generation failure rate** (count of `processEmail()` INVITE branch that logged `"QR generation failed"`). Target <0.1%.
- **INVITE emails sent with `qrAvailable: false`** — counter; should be ~0. Non-zero indicates a systematic issue (e.g. env var drift).
- **Pass view 404 rate** — baseline, then alert on sustained spikes (indicates token leakage, stale QR after regeneration, or broken dashboard link).
- **Mailgun bounce / complaint delta** — compare 7-day pre/post-ship. Investigate if +0.5pp or more, especially bounce — PNG attachments can affect spam scoring.

Implementation is decoupled from this plan and should be filed against whichever observability system owns the rest of our email and HTTP metrics.

---

## 7. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mailgun rejects the FormData attachment shape | Low | Medium | Validate in staging first. The field names (`inline` / `attachment`) are stable REST API, not SDK-versioned. |
| QR generation slows cron throughput | Very Low | Low | ~5ms × 100 emails per batch = ~500ms; well within cron budget. |
| Guest's mail client strips CID attachments | Low | Low | RSVP URL in email body is unchanged and always works. Conditional `<Img>` block prevents broken-image rendering. |
| PNG attachment affects spam score | Very Low | Medium | Monitor bounce and complaint rates after ship; no action unless an actual delta appears. |
| Token enumeration via QR route | Negligible | Low | 256-bit token space; enumeration is infeasible. |
| Pass view renders slowly and door queue backs up | Low | Medium | SSR server component, minimal dependencies, no client JS. Measure first real use at a small event before scaling. |
| Revoked invite still opens pass view with QR screenshot | Low | Medium | Pass view does a live DB read; revoked banner overrides all other content. The stale QR image itself is not revocable, but the content it links to is. |
| Phone-only invitee has no credential accessible offline at venue | Low | Low | The SMS link opens the pass view in a browser; most mobile browsers cache the rendered page and will display stale content offline. Staff can also look up by name in the dashboard from a connected device. Not a blocker for venues with normal connectivity. |

---

## 8. Out of Scope (Future Work)

Deliberately deferred; all reusable with the MVP QRs (no rotation required).

- **Pre-GA backend check-in.** Adds `checkedInAt` timestamp (one field on `Invite` or a new `CheckIn` table), `POST /api/invites/[token]/check-in` endpoint, and a staff-auth "Check In" button on the pass view. Estimated 2–3 days of additive work; the QRs shipped in this plan remain valid.
- **Staff scanner UI.** Dedicated `/admin/events/[id]/check-in` page that uses the browser camera API to scan QRs directly. Only needed once the backend check-in flow exists and venues request faster throughput than the "open phone, hold for staff" flow.
- **Branded QR codes with logo overlay.** Requires error correction `H` and design input.
- **QR code on the pass view itself.** Not useful for MVP (visual verification only). Becomes valuable when backend check-in ships because scanning the pass-view QR from a staff scanner would then trigger a state write rather than re-display the same information.
- **QR codes in CONFIRMATION / REMINDER emails.** Redundant for email invitees who already have the invite email with the QR. Could help phone-only invitees who provide an email at RSVP time, but adds payload-type complexity; revisit if phone-only invitees report difficulty at venues in practice.
- **Apple / Google Wallet passes.** Significant infra lift; only worth doing once check-in is live and demand is proven.
- **Token-regeneration UX polish.** Schema has `Invite.tokenRegenerateCount`. When an organizer regenerates a token, the old QR still decodes to a URL that now 404s. Two post-ship polish items: (1) the pass view 404 should render a branded *"This invitation is no longer valid — contact the organizer"* page instead of a generic Next.js 404; (2) the dashboard should warn organizers that regenerating a token invalidates previously-distributed QRs and links. Neither is a ship blocker.

---

## 9. Pre-GA Check-In: How the MVP Extends

This section describes how the pre-GA check-in feature builds on the MVP. Not in scope for this plan — captured here so reviewers understand that the MVP's URL and token choices are future-compatible.

**Additive work when check-in ships:**

1. **DB migration** — add `checkedInAt DateTime?` and `checkedInBy String?` to `Invite` (or introduce a `CheckIn` model if multi-venue / per-event history is needed). One additive migration.
2. **Endpoint** — `POST /api/invites/[token]/check-in`, staff-auth required, writes the timestamp, returns the same pass-view payload plus the check-in state.
3. **Pass view extension** — when the session is an authenticated staff user of the event's organization, render a "Check In" button; on subsequent loads, render "Checked in at 6:32 PM" instead. Guest-facing view (unauthenticated scan) is unchanged.
4. **AuthZ** — event-creator + org-member check. Event-scoped staff roles if multi-role support is needed.
5. **Edge cases** — double-scan idempotency, manual check-in fallback from the dashboard, offline buffering if venue Wi-Fi is unreliable.

No QR rotation. Guests never need to receive a replacement QR.

---

## 10. Reviewer Checklist (Feature-Specific)

In addition to the standard reviewer expectations in `CLAUDE.md` and `CONTRIBUTING.md`:

- [ ] Architectural decisions in §2 are respected (especially: send-time generation, `inline: true` attachments per §2.6, non-fatal QR failures, pass-view URL as the QR target, timestamp-driven state detection per §2.8).
- [ ] No new environment variables introduced.
- [ ] No changes to `EmailOutbox` schema or shape.
- [ ] Non-INVITE email cases are provably unchanged (test evidence, not just claim).
- [ ] Pass view is dynamically rendered (`force-dynamic`), reads DB live in a single query, correctly renders revoked / cancelled / expired / event-ended states, applies the documented guest-name fallback chain, and does not leak guest identity in OG metadata.
- [ ] `sendEmail` attachment extension uses the `inline` boolean abstraction (no `cid` field); inline attachments render correctly on both SMTP and Mailgun paths; no manual Content-Type header set on the Mailgun FormData request.
- [ ] Dashboard Pattern 2 (action-menu + modal) is implemented as specified; "Copy invite link" and "Download PNG" actions are both present; download filename comes from `buildQrFilename`, not ad-hoc code.

---

_Last updated: 2026-04-23 (post-review revision: B1–B4, S1–S8, N1/N2/N4/N6/N7/N8, N3 stub, N5 flagged)_
