# QR Codes in Invitation Emails — Implementation Plan

**Feature:** Embed scannable QR codes in invite emails. The QR doubles as an "access pass" at the venue — door staff scan a guest's QR, see guest identity + RSVP status, and grant access based on visual verification.
**Scope:** Email attachment + dashboard display + dedicated pass view. Full backend check-in (record check-in timestamps, prevent double-entry) remains **pre-GA**, not MVP.
**Effort estimate:** ~2 dev days across 7 small PRs
**Owner:** _TBD_
**Status:** Ready to pick up

> **Revision note.** This version supersedes the original draft in `implementation-docs-archive/qr-code-implementation-plan.md`. Changes: adds pass-view route, attachment-plumbing task, broken-image fallback, revoked-invite handling in the QR route; switches QR target URL from `/rsvp/[token]` to `/invite/[token]/pass`; fixes factual error about the Mailgun SDK; narrows dashboard UX to Pattern 2 (action-menu + modal).

---

## 1. Goals and Non-Goals

**Goals**

- Every `INVITE` email includes an inline QR code that, when scanned at the venue, opens a **"pass view"** showing guest identity and RSVP status — optimized for door staff glancing at a phone, not for animated delight.
- Organizers can view and download each invite's QR from the dashboard (Pattern 2: action-menu + modal).
- Implementation respects existing email queue / retry semantics (no duplicate sends, no orphaned jobs).
- Feature is additive: no changes to existing RSVP or email flows for guests. The email body's "RSVP Now" CTA continues to point at the animated invitation card (`/invite/[token]`); only the QR encodes the pass URL.
- QR URL is **durable** — same token, same URL, reusable when pre-GA check-in infrastructure ships. No QR rotation.

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

For **SMTP** (Mailpit in dev), nodemailer accepts `attachments: [{ filename, content, cid }]` natively.

For **Mailgun**, the current code uses raw `fetch` + `FormData` — not the `mailgun.js` SDK. Inline attachments use `formData.append("inline", new Blob([buffer]), "rsvp-qr.png")` where "inline" (vs "attachment") is the Mailgun field name that produces CID-referenced images.

### 2.7 Cache QRs aggressively

The QR API route serves `Cache-Control: public, max-age=31536000, immutable`. Token → URL is a stable 1-to-1 mapping; revocation is handled at the pass view itself (which does a live DB read), not at the QR image layer. Aggressive caching keeps the dashboard snappy and CDN costs minimal.

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
```

`buildPassUrl(token)` returns `${NEXT_PUBLIC_BASE_URL}/invite/${token}/pass`.

**Acceptance criteria**

- [ ] All exports fully typed; no `any`.
- [ ] `buildPassUrl` throws a clear error if `NEXT_PUBLIC_BASE_URL` is unset.
- [ ] `buildPassUrl` handles trailing slash in base URL correctly.
- [ ] Default error correction level is `M`, documented in a code comment with rationale.
- [ ] Unit tests cover: URL construction, trailing-slash normalization, missing env var, SVG output shape, PNG buffer non-empty.
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
      cid?: string;              // If present, referenceable as cid:<value> in HTML
      contentType?: string;      // Defaults to application/octet-stream
    }>;
  };
  ```
- In `sendEmailViaSMTP`: pass `attachments` through to nodemailer's `sendMail` as-is; nodemailer's native shape matches.
- In `sendEmailViaMailgun`: for each attachment, append to FormData as `"inline"` (when `cid` is set) or `"attachment"` (otherwise), using `new Blob([content], { type: contentType ?? "application/octet-stream" })`.

**Acceptance criteria**

- [ ] `SendEmailOptions.attachments` is optional; existing callers compile unchanged.
- [ ] Nodemailer SMTP path forwards the array to `transporter.sendMail({ attachments })`.
- [ ] Mailgun path produces correct FormData field names (`inline` vs `attachment`) per cid presence.
- [ ] Unit tests: (a) SMTP receives attachments in `sendMail` call; (b) Mailgun FormData contains both `inline` and `attachment` fields when given mixed input.
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
- On success: pass the buffer through the new `attachments` option with `filename: "rsvp-qr.png"`, `cid: "rsvp-qr.png"`, `contentType: "image/png"`. Also set `qrAvailable: true` in the template payload.
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
        Save this QR or take a screenshot — scan at the venue for faster check-in.
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

Server component. Reads the invite by hashed token, loads the related RSVP (if any), renders a compact layout optimized for staff scanning a phone at arm's length:

1. **Guest name** — extra-large (~48px), top of viewport.
2. **RSVP status badge** — prominent color-coded pill:
   - Green "Attending" for `RSVP.response === "YES"`.
   - Amber "Maybe" for `RSVP.response === "MAYBE"`.
   - Red "Declined" for `RSVP.response === "NO"`.
   - Gray "RSVP pending" if no RSVP row exists.
3. **Plus-ones** — "Party of {1 + plusOnesAllowed}" if `plusOnesAllowed > 0`.
4. **Event title and date** — smaller; lets staff verify the right event.
5. **Access-blocking overlays** (render these *instead of* the above when applicable):
   - **Revoked banner** — full-bleed red if `Invite.revokedAt` is set.
   - **Expired banner** — amber if `Invite.expiresAt < now`.

No client JS required for MVP. No animations. Meta `robots: noindex` (per-invite content must not be indexed).

**Security/auth:** unauthenticated. The token itself is the credential. Matches the existing `/rsvp/[token]` and `/invite/[token]` auth model.

**Acceptance criteria**

- [ ] Renders the four key fields (guest, RSVP, plus-ones, event) legibly at 375px viewport.
- [ ] Color-coded badge matches RSVP response.
- [ ] Revoked or expired state is shown as a blocking banner that dominates the view.
- [ ] Returns 404 for unknown token hashes.
- [ ] SSR-rendered; no hydration-required components in the MVP.
- [ ] `robots: noindex` in metadata.
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
  - **Download PNG** button → targets `?format=png` with `download="rsvp-{guestFirstName}.png"` attribute. Filename convention: first name only for brevity, or `{shortToken}` if no name is known. Sanitize non-filename-safe chars.
  - **Close** button; focus trap; `Esc` closes.
- Explicit `width`/`height` on the `<img>` inside the modal to prevent layout shift while the SVG loads.

**Acceptance criteria**

- [ ] "View QR" action is discoverable in every invite row.
- [ ] Modal opens with QR, guest name, event title; focus is trapped inside.
- [ ] Download produces a usable PNG file with a sensible filename.
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

---

## 8. Out of Scope (Future Work)

Deliberately deferred; all reusable with the MVP QRs (no rotation required).

- **Pre-GA backend check-in.** Adds `checkedInAt` timestamp (one field on `Invite` or a new `CheckIn` table), `POST /api/invites/[token]/check-in` endpoint, and a staff-auth "Check In" button on the pass view. Estimated 2–3 days of additive work; the QRs shipped in this plan remain valid.
- **Staff scanner UI.** Dedicated `/admin/events/[id]/check-in` page that uses the browser camera API to scan QRs directly. Only needed once the backend check-in flow exists and venues request faster throughput than the "open phone, hold for staff" flow.
- **Branded QR codes with logo overlay.** Requires error correction `H` and design input.
- **QR codes in CONFIRMATION / REMINDER emails.** Low marginal value; guest already has the invite email with the QR.
- **Apple / Google Wallet passes.** Significant infra lift; only worth doing once check-in is live and demand is proven.

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

- [ ] Architectural decisions in §2 are respected (especially: send-time generation, CID attachments, non-fatal QR failures, pass-view URL as the QR target).
- [ ] No new environment variables introduced.
- [ ] No changes to `EmailOutbox` schema or shape.
- [ ] Non-INVITE email cases are provably unchanged (test evidence, not just claim).
- [ ] Pass view is SSR, reads DB live, correctly renders revoked/expired states.
- [ ] `sendEmail` attachment extension is fully tested against both send paths before Task 2b lands.
- [ ] Dashboard Pattern 2 (action-menu + modal) is implemented as specified; no inline thumbnail variant crept in.

---

_Last updated: 2026-04-23_
