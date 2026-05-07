# QR Codes in Invitation Emails — Implementation Plan

**Feature:** Embed scannable QR codes in RSVP confirmation emails for guests who responded YES. The QR doubles as an "access pass" at the venue — door staff scan a guest's QR, see guest identity + RSVP status, and grant access based on visual verification.
**Scope:** Email attachment + dashboard display + dedicated pass view. Full backend check-in (record check-in timestamps, prevent double-entry) remains **pre-GA**, not MVP.
**Effort estimate:** ~2 dev days across 10 small PRs
**Owner:** _TBD_
**Status:** Ready to pick up

> **Sixth revision (2026-05-07).** Slims Task 5 — drops the dashboard modal (image preview, focus trap, Esc handling, Download PNG action) in favor of a single "Copy pass link" row action gated on `rsvp.response === "YES"`. Rationale: organizers don't browse the dashboard to admire QRs, and the only real use case is failure-mode recovery (YES-RSVP'd guest whose confirmation email bounced/got lost — organizer copies the pass URL and shares via SMS/AirDrop). A copy-link action covers it without the UI weight. The dropped modal/PNG functionality moves to §8 Out of Scope as an opt-in for organizers who later want to print physical passes or supply images to phone-only invitees who refuse email at RSVP time. Updates §1 Goals, Task 5 spec, §6 Rollout, §8 Out of Scope.
>
> **Fifth revision (2026-05-07).** **Architectural correction:** the QR moves from INVITE emails to CONFIRMATION emails, gated on `response === "YES"`. Surfaced in production review of #73 / #75 — the QR is a venue access credential, and sending it to invitees who haven't confirmed (or who decline) is premature commitment for the ~30–50% who never attend. Adds Task 7 (migration); flips §1 Goals first bullet; adds §2.10 (email-type decision); removes the "QR codes in CONFIRMATION emails" line from §1 Non-Goals and §8 Out of Scope (REMINDER stays out); updates §4 count, §6 Rollout, §10 Reviewer Checklist. The QR generation pipeline (Task 1) and `sendEmail` attachment plumbing (Task 2a) are reusable as-is; only the trigger point changes.
>
> **Fourth revision (2026-05-07).** Adds Task 6 — per-event opt-out for QR attachment in invite emails (boolean column on `Event`, dashboard toggle, `processEmail()` short-circuit when off). Per-send override is intentionally deferred. Updates §1 Goals, §4 Task Breakdown count, §6 Rollout, §8 Out of Scope.
>
> **Revision note.** This version supersedes the original draft (kept out-of-repo). Initial revision: adds pass-view route, attachment-plumbing task, broken-image fallback, revoked-invite handling in the QR route; switches QR target URL from `/rsvp/[token]` to `/invite/[token]/pass`; fixes factual error about the Mailgun SDK; narrows dashboard UX to Pattern 2 (action-menu + modal). Second revision (2026-04-23) applies reviewer feedback: B1 (inline-attachment abstraction), B2 (`force-dynamic`), B3 (phone-only cohort), B4 (copy-link action), S1–S4 (pass-view state & fields), S5 (OG privacy), S6 (email copy), S7 (multipart boundary), S8 (single Prisma call), and selected polish items (N1, N2, N4, N6, N7, N8). **Third revision (2026-05-06) — Option B.** Switches the pass-view URL from `/invite/[token]/pass` to `/invite/pass/[passId]`, where `passId` is a new non-secret `Invite` column. Rationale: (a) makes QRs durable across token regenerations (token-keyed URLs broke on regen, contradicting the plan's own durability goal); (b) eliminates the dashboard's chicken-and-egg with raw tokens — the invite list never carries raw tokens for previously-created invites, so a token-keyed QR endpoint couldn't serve them; (c) decouples the read-only display credential (`passId`) from the write-action token (raw token); (d) keeps pass URLs stable into the pre-GA check-in feature. Adds Task 0 (schema migration). Updates Tasks 1, 2b, 3.5, 4, 5; rollout, risks, reviewer checklist. Fix-up after PR review: §2.5 records why `passId` is intentionally non-rotatable; §2.9 documents the `/invite/pass` literal-path collision (graceful 404); §8 captures the CSV-export deferral.

---

## 1. Goals and Non-Goals

**Goals**

- Every `CONFIRMATION` email sent to a guest who responded **YES** includes an inline QR code that, when scanned at the venue, opens a **"pass view"** showing guest identity and RSVP status — optimized for door staff glancing at a phone, not for animated delight. INVITE emails do not carry the QR (see §2.10). MAYBE and NO confirmations also do not — staff can look up MAYBE attendees by name from the dashboard if they show.
- Organizers can copy a YES-RSVP'd guest's pass link from the dashboard (single "Copy pass link" row action — Task 5). Used for failure-mode recovery: a guest whose confirmation email bounced or got lost can be sent the pass URL via SMS/AirDrop. The action is greyed-out on pre-RSVP, MAYBE, and NO rows because the pass URL would show "pending" or "declined" status, which isn't useful to share.
- Organizers can opt out of the email QR attachment per event (Task 6). The pass view and dashboard "Copy pass link" action are unaffected — the toggle gates the CONFIRMATION-email attachment only.
- Implementation respects existing email queue / retry semantics (no duplicate sends, no orphaned jobs).
- Feature is additive: no changes to existing RSVP or email flows for guests. The email body's "RSVP Now" CTA continues to point at the animated invitation card (`/invite/[token]`); only the QR encodes the pass URL.
- QR URL is **durable** — the encoded pass URL is keyed on `Invite.passId`, which is generated at row creation and never rotated. Token regenerations leave previously-distributed QRs intact. Reusable when pre-GA check-in infrastructure ships.
- **Phone-only invite handling.** Invitees created without an email address (`Invite.email === null`) do not receive a QR via automated delivery in the MVP. The organizer-driven workflow (manually copy the invite link from the dashboard, send via SMS/WhatsApp) continues to function: the tokenized link the guest receives opens the animated invite directly on their phone. Once a phone-only invitee RSVPs YES (supplying email at the public portal), they receive a confirmation email with the inline QR. If they decline to supply an email, organizers can copy the pass link from the dashboard row action and share it via SMS/WhatsApp instead. Sending a QR image directly (PNG download) is deferred — see §8 Out of Scope. Automated SMS/WhatsApp delivery via Twilio is deferred to GA.

**Non-Goals (for this plan)**

- **Backend check-in state** (scanning writes a `checkedInAt` timestamp, prevents double-entry). Pre-GA work. The MVP is visual verification only.
- QR codes in `REMINDER` emails — low marginal value once it ships in `CONFIRMATION`. Could help phone-only invitees who supply an email at RSVP time, but adds payload-type complexity; revisit if phone-only invitees report difficulty at venues in practice.
- Branded QR codes with logo overlay — requires bumping error correction to `H` and design input. Deferred until organizers request it.
- Apple / Google Wallet passes — significant infra lift; only worth doing once pre-GA check-in is live and demand is proven.
- Staff scanner UI (camera-based scan page) — pre-GA, if the check-in flow needs it.

---

## 2. Architectural Decisions

Decisions worth making explicitly so they're not relitigated in PR review.

### 2.1 Generate QR at send-time, not queue-time

`EmailOutbox.payload` is `Json`. Serializing a binary PNG into the payload would require base64 bloat (+33% size per invite) or separate storage. QR generation is deterministic and takes ~5ms, so we regenerate on each send attempt.

**Consequences:**
- No migration to `EmailOutbox` needed. (The schema migration this plan adds is to `Invite` — a new `passId` column. See §2.5 and Task 0.)
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

### 2.5 QR encodes `/invite/pass/[passId]`, keyed on a new `Invite.passId` column

The pass view is a **read-only display surface** (guest identity, RSVP status, event header). The token used elsewhere in the invite system is a **write credential** — RSVP submission, unsubscribe, eventually check-in. Coupling the pass URL to the raw token (the prior revision's design) creates two structural problems:

1. **Token regenerations break in-flight QRs.** Organizers can regenerate a token (up to `MAX_REGENERATIONS = 3` times per invite — see `src/app/api/events/[id]/invites/[id]/regenerate/route.ts`). Each regeneration replaces the credential, so any previously-printed/sent/saved QR resolves to a 404. The plan's stated durability goal can't hold under a token-keyed URL.
2. **The dashboard never sees raw tokens for older invites.** Tokens are stored only as hashes (`Invite.tokenHash`, never the raw value). The client-side `tokenCache` in `InviteManager` only holds raw tokens for invites just-created or just-regenerated *in the current session*. Without a separate identifier, "View QR" in the dashboard couldn't work for invites the organizer didn't create that session — i.e. the majority of any non-trivial event.

The fix: introduce `Invite.passId` — a non-secret, stable, public-by-design identifier. The pass URL becomes `/invite/pass/[passId]`. The dashboard QR API route is keyed on `passId`. The pass-view page does `findUnique({ where: { passId } })`.

`passId` is a UUID v4, generated server-side by Postgres at row creation (`DEFAULT gen_random_uuid()`). It is stored in plain text — there's no hash, because it's not a write credential, only a lookup key for read-only state. UUID v4 entropy (~122 bits) is far above any plausible enumeration risk.

**Consequences:**
- One schema migration (`add_invite_pass_id`, Task 0). One column, one unique index, one backfill statement.
- Token regenerations leave QRs untouched.
- Dashboard returns `passId` in the invite list response; the "Copy pass link" action (Task 5) reads it directly, gated on YES-RSVP'd rows.
- Pre-GA check-in still gates *write* actions behind staff auth — `passId` only identifies which row a staff scan refers to, not what staff is allowed to do with it.
- The pass URL has fewer entropy bits than a token URL (122 vs 256). Still infeasible to enumerate, and the worst case if guessed is "stranger sees a guest's name + RSVP status." No write capability follows from possession of a `passId`.

**Why no `passId` rotation knob.** `passId` is intentionally write-once — there's no API to rotate it and no `passIdRegenerateCount` column. Rationale: the *only* harm from a leaked passId is a stranger seeing one guest's name and RSVP state, while the *cost* of rotation is invalidating every printed/saved/shared QR for that invite. For a leak severe enough to act on, the right action is `revoke` (which the pass view already detects via `invite.revokedAt`) or delete the invite entirely. If a future stakeholder asks for rotation, revisit; do not add it speculatively.

### 2.6 Extend `sendEmail()` to support attachments

The current `SendEmailOptions` at `src/lib/email.ts:49` has no `attachments` field, and neither `sendEmailViaSMTP` nor `sendEmailViaMailgun` passes any. This must be added as a separate, inert-until-used task before QR code propagation.

For **SMTP** (Mailpit in dev), nodemailer accepts `attachments: [{ filename, content, cid }]` natively. We set `cid === filename` so the HTML reference `cid:${filename}` works on both providers.

For **Mailgun**, the current code uses raw `fetch` + `FormData` — not the `mailgun.js` SDK. Inline attachments use `formData.append("inline", new Blob([buffer]), "rsvp-qr.png")` where "inline" (vs "attachment") is the Mailgun field name that produces CID-referenced images. The filename passed to FormData is the CID identifier, so `filename` must equal whatever `cid:<…>` value is referenced in the HTML.

The `SendEmailOptions.attachments` shape normalizes this with a single `inline?: boolean` flag instead of exposing a separate `cid` field (which cannot be honored independently by Mailgun). See Task 2a.

### 2.7 Cache QRs aggressively

The QR API route serves `Cache-Control: public, max-age=31536000, immutable`. `passId → pass URL` is a stable mapping by construction (passId is never rotated). Revocation is handled at the pass view itself (which does a live DB read), not at the QR image layer. Aggressive caching keeps the dashboard snappy and CDN costs minimal.

### 2.8 State detection uses timestamps, not status enum

The pass view reads `invite.revokedAt`, `invite.expiresAt`, `event.endAt`, and `event.status` directly. The `InviteStatus` enum is treated as denormalized display state for dashboard listings — not as authoritative access control. If an invite's `revokedAt` is non-null, the pass view treats it as revoked regardless of whether `InviteStatus` has been updated.

### 2.9 Route map — three routes, two identifier kinds

| Route | Audience | Rendering | Identifier | Auth |
|---|---|---|---|---|
| `/invite/[token]` | Guest (email CTA) | Animated invitation card | Raw token (256-bit) | Token in URL |
| `/invite/pass/[passId]` | Staff / guest at venue | Compact, no animation | `passId` (UUID v4) | passId in URL |
| `/rsvp/[token]` | Guest (direct-link RSVP flow) | RSVP form | Raw token (256-bit) | Token in URL |

The email's "RSVP Now" CTA points at `/invite/[token]`. The QR encodes `/invite/pass/[passId]`. `/rsvp/[token]` remains the target of direct RSVP links.

The split is intentional: the *animated invite* and the *RSVP write flow* both gate on the raw token (which is bearer-equivalent for write actions). The *visual pass* gates on `passId` (which is bearer-equivalent only for the read-only display).

**Route-collision note.** Next.js's App Router resolves the longer-prefix segment first, so `/invite/pass/<uuid>` always reaches the pass-view page and `/invite/<token>` always reaches the animated card. The one edge case worth naming: the literal path `/invite/pass` (no third segment) routes to `/invite/[token]/page.tsx` with `token = "pass"` — the existing handler hashes that, fails to find a row, and returns 404. Graceful but not obvious; documenting here so future maintainers don't burn time diagramming it.

### 2.10 QR ships with confirmation, not invitation

Tasks 2b and 3 originally attached the QR to INVITE emails. Production review surfaced an operational issue: the QR is a venue access credential, and an invite is sent before the recipient has agreed to attend. Distributing a credential to the ~30–50% of any guest list who decline or never respond is premature commitment that clutters their inbox and confuses the act of "I'm thinking about attending" with "I have a pass."

The trigger moves to the CONFIRMATION email, gated on `payload.response === "YES"`:

| Response | CONFIRMATION email | Why |
|---|---|---|
| YES | inline QR + visible block | guest committed to attending; pass is meaningful |
| MAYBE | no QR | too ambiguous to issue a credential; staff look up by name from the dashboard if the guest shows |
| NO | no QR | guest declined; no venue use case |

The pass view (`/invite/pass/[passId]`) and the QR API route (`/api/qr/[passId]`) are **unchanged** — they remain available to organizers for every invite regardless of RSVP state. The dashboard surface is the slim "Copy pass link" row action (Task 5), which is enabled only on YES-RSVP'd rows so organizers don't accidentally share a "pending" or "declined" pass URL.

This decision supersedes the original Tasks 2b/3 framing. The migration is captured as Task 7. Reusable as-is: the QR utility module (Task 1), the `sendEmail` attachment plumbing (Task 2a), the failure-handling contract (§2.4), and the URL/identifier model (§2.5). Only the trigger point in `processEmail()` changes.

---

## 3. Prerequisites

**Install**

```bash
npm install qrcode
npm install -D @types/qrcode
```

**Schema migration:** one — `add_invite_pass_id` (Task 0). Per the project's "Prisma migrations are manual" workflow (see `internal-docs/PRE_DEPLOYMENT_CHECKLIST.md` §5), the operator runs `npx prisma migrate deploy` against staging and prod before the dependent code merges.

**Runtime:** Node (default for existing Route Handlers and cron). No Edge runtime work.

**Environment variables:** none new. Reuses `NEXT_PUBLIC_BASE_URL`.

---

## 4. Task Breakdown

Ten atomic, independently-mergeable PRs. Each PR should be under ~300 lines of diff. Task 0 must merge first; after that, Tasks 1, 2a, 3.5, and 4 can be parallelized by multiple developers. **Task 7 supersedes Tasks 2b and 3** as the source of truth for QR email delivery — those tasks shipped against INVITE and Task 7 migrates them to CONFIRMATION (see §2.10). Task 6 lands after Task 7 once the new on/off branches are verified end-to-end.

### Task 0 — Schema migration: add `Invite.passId`

**Branch:** `feat/invite-pass-id`
**PR title:** `feat: add Invite.passId for pass-view URLs`
**Depends on:** none (must merge before any other QR task)

**Files**

- `prisma/schema.prisma` _(edit)_
- `prisma/migrations/<timestamp>_add_invite_pass_id/migration.sql` _(new, generated by `prisma migrate dev`; may be hand-edited for the safe-on-large-table form below)_

**Schema change**

```prisma
model Invite {
  // ... existing fields above tokenHash
  passId String @unique @default(dbgenerated("gen_random_uuid()")) @map("pass_id") @db.Uuid
  // ... existing fields below
}
```

**Migration SQL (default form — small/medium tables)**

```sql
ALTER TABLE "invites"
  ADD COLUMN "pass_id" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "invites_pass_id_key" ON "invites"("pass_id");
```

This is what `prisma migrate dev` will generate. It works correctly but rewrites the table because `gen_random_uuid()` is a *volatile* default — every existing row needs a freshly generated value. For invitation-only-launch volumes this is fine.

**Migration SQL (safe form — large/hot tables, optional)**

If the production `invites` table is large enough that a full rewrite under `ACCESS EXCLUSIVE` would cause noticeable downtime, hand-edit the migration to the multi-statement form before `migrate deploy`:

```sql
-- 1. Add the column nullable, no default → no rewrite
ALTER TABLE "invites" ADD COLUMN "pass_id" UUID;

-- 2. Backfill (chunk if needed; ~200k rows/sec on a quiet box)
UPDATE "invites" SET "pass_id" = gen_random_uuid() WHERE "pass_id" IS NULL;

-- 3. Lock down going forward
ALTER TABLE "invites" ALTER COLUMN "pass_id" SET DEFAULT gen_random_uuid();
ALTER TABLE "invites" ALTER COLUMN "pass_id" SET NOT NULL;

-- 4. Unique index — CONCURRENTLY needs to run outside the migration tx; if you take this path, split the index creation into a follow-up migration that uses `BEGIN; SET LOCAL statement_timeout = 0; CREATE UNIQUE INDEX CONCURRENTLY ...` per the project's conventions
CREATE UNIQUE INDEX "invites_pass_id_key" ON "invites"("pass_id");
```

Pick the form based on staging row counts. Document the choice in the PR description.

**Acceptance criteria**

- [ ] Migration applies cleanly on a staging snapshot of production data; existing rows have a non-null, unique `pass_id`.
- [ ] `npx prisma migrate dev` produces consistent DDL with the committed `migration.sql` (no drift).
- [ ] `npm run db:generate` regenerates the client; `Invite.passId` is a typed `string` field.
- [ ] No code changes outside `prisma/`. No reads or writes against `passId` yet — that lands in subsequent tasks.
- [ ] PR description states which migration form (default vs safe) was used and why.

---

### Task 1 — QR utility module

**Branch:** `feat/qr-utility-module`
**PR title:** `feat: add QR code generation utility`
**Depends on:** Task 0

**Files**

- `src/lib/qr.ts` _(new)_
- `tests/unit/qr.test.ts` _(new)_

**Exports**

```ts
buildPassUrl(passId: string): string
generateQrSvg(url: string, size?: number): Promise<string>
generateQrPngBuffer(url: string, size?: number): Promise<Buffer>
generateQrDataUrl(url: string): Promise<string>
buildQrFilename(guestName: string | null, passId: string): string
```

`buildPassUrl(passId)` returns `${NEXT_PUBLIC_BASE_URL}/invite/pass/${passId}`.

`buildQrFilename(guestName, passId)` centralizes download filename sanitization so the deferred PNG-download surface (§8 Out of Scope), future bulk-export, and any ad-hoc tooling all produce the same shape. Reference implementation:

```ts
export function buildQrFilename(guestName: string | null, passId: string): string {
  const safe = (guestName ?? "invite")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "invite";
  return `rsvp-${safe}-${passId.slice(0, 8)}.png`;
}
```

The 8-char passId prefix disambiguates when organizers download multiple guests with the same first name. (UUID's first segment is 8 hex chars, so this is a natural cut.)

**Acceptance criteria**

- [ ] All exports fully typed; no `any`.
- [ ] `buildPassUrl` throws a clear error if `NEXT_PUBLIC_BASE_URL` is unset.
- [ ] `buildPassUrl` handles trailing slash in base URL correctly.
- [ ] Default error correction level is `M`, documented in a code comment with rationale.
- [ ] `buildQrFilename` covers: null name → `"invite"` base, diacritics stripped, non-alphanumerics collapsed to hyphens, leading/trailing hyphens trimmed, 32-char cap, passId prefix preserved.
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

> **⚠ Superseded.** Shipped in #73 against INVITE; superseded by Task 7 (§2.10) which moved the trigger to CONFIRMATION (YES responses only). Section retained as historical context — do not implement against INVITE again.

**Branch:** `feat/qr-email-integration`
**PR title:** `feat: attach QR code to invite emails`
**Depends on:** Task 1, Task 2a

**Files**

- `src/lib/email.ts` _(edit)_
- `src/app/api/events/[id]/invites/route.ts` _(edit — include `passId` in the post-create select; thread it into the email payload)_
- `tests/unit/email.test.ts` _(extend)_

**Changes**

- Add `passId: string` to `InviteEmailPayload`.
- In `src/app/api/events/[id]/invites/route.ts`, the bulk and single create paths already select fields from the just-inserted invite. Add `passId: true` to those selects, and pass it through to `queueInviteEmail()` in the payload.
- In the `INVITE` case of `processEmail()`, after payload extraction:
  - Read `passId` from `payload`. If absent (legacy outbox row created before this feature shipped, then re-queued through the recovery sweep), fall back to a single `db.invite.findUnique({ where: { id: email.inviteId }, select: { passId: true } })` lookup.
  - Call `generateQrPngBuffer(buildPassUrl(passId))`.
- On success: pass the buffer through the new `attachments` option with `filename: "rsvp-qr.png"`, `inline: true`, `contentType: "image/png"`. The template references `cid:rsvp-qr.png` — the CID value matches the filename on both providers (see §2.6, Task 2a). Also set `qrAvailable: true` in the template payload.
- On failure (or if the fallback lookup returns no invite): `logger.warn("QR generation failed", { inviteId, error })`, set `qrAvailable: false`, send the email without the attachment. Never throw.
- Leave `CONFIRMATION`, `REMINDER`, `NO_RESPONSE_REMINDER`, `VERIFICATION`, `PASSWORD_RESET` cases untouched.

**Acceptance criteria**

- [ ] INVITE emails include QR PNG attachment on the happy path.
- [ ] Other email types are byte-for-byte unchanged (snapshot-verified).
- [ ] QR generation failure is logged at `warn` and the email still sends successfully with `qrAvailable: false`.
- [ ] Mailgun `messageId` is still captured and persisted to `EmailOutbox`.
- [ ] All existing `email.test.ts` tests pass unchanged.
- [ ] New test: forced QR generation failure does not throw out of `processEmail()`.
- [ ] New test: payload missing `passId` triggers the fallback DB lookup; lookup hit succeeds, lookup miss (invite deleted) logs and proceeds with `qrAvailable: false`.
- [ ] New test: `passId` present in payload skips the fallback lookup (assert call count).

---

### Task 3 — Update `InviteEmail` template (conditional QR block)

> **⚠ Superseded.** Shipped in #75 against `InviteEmail.tsx`; superseded by Task 7 (§2.10) which moved the QR block to `ConfirmationEmail.tsx` (YES responses only). Section retained as historical context.

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
**Depends on:** Task 0 (schema)

**Files**

- `src/app/invite/pass/[passId]/page.tsx` _(new)_
- `src/app/invite/pass/[passId]/pass.module.css` _(new, optional — or inline Tailwind)_

**Behavior**

Server component. Explicitly opts into dynamic rendering and reads the invite by `passId` in a single Prisma call with `rsvp` and `event` included. Renders a compact layout optimized for staff scanning a phone at arm's length.

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
  where: { passId },
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

**Auth model.** Unauthenticated. `passId` is a *narrower* credential than the raw token used by `/invite/[token]` and `/rsvp/[token]`: it grants only the read-only pass-view rendering, not RSVP submission, unsubscribe, or any write action. Those routes still gate on the raw token. UUID v4 entropy (~122 bits) makes enumeration infeasible.

**`X-Robots-Tag` response header (optional belt-and-braces).** The `metadata.robots` export covers HTML-parsing crawlers; it does not cover HEAD-only bots (Slackbot link previews, some email scanners). Setting `X-Robots-Tag: noindex, nofollow` on the response requires either a `headers()` rule in `next.config.ts` matching `/invite/pass/:passId` or a middleware rule — pick one and note the choice in the PR. Not a blocker for first merge if `metadata.robots` is in place.

**Acceptance criteria**

- [ ] `export const dynamic = "force-dynamic"` is set; build output lists the pass route as `ƒ` (dynamic), not `○` (static).
- [ ] Pass view renders with exactly one DB query per request (single `findUnique` with `include`).
- [ ] Lookup uses `where: { passId }`. The route param is validated as a UUID before the DB call (return 404 on malformed input, no DB hit).
- [ ] Renders the four key fields (guest, RSVP, party, event) legibly at 375px viewport.
- [ ] Guest name fallback chain is implemented in the order above; pass view renders when `invite.name` is null and no RSVP exists.
- [ ] Party label uses `rsvp.guestCount` when an RSVP exists; `1 + plusOnesAllowed` cap only when no RSVP exists.
- [ ] Color-coded RSVP badge matches `rsvp.response`.
- [ ] Revoked, cancelled, expired, and event-ended states each render a blocking banner that dominates the view.
- [ ] `event.endAt === null` does not trigger the event-ended banner under any condition.
- [ ] Returns 404 for unknown `passId` values.
- [ ] SSR-rendered; no hydration-required components in the MVP.
- [ ] `metadata.robots = { index: false, follow: false }` is set.
- [ ] `metadata.openGraph` contains no guest-identifying data — social link preview in iMessage/Slack shows generic text only.
- [ ] Smoke-tested: visit `/invite/pass/<test-passId>` on a phone, hold at arm's length, confirm guest name + RSVP badge are legible without zoom.

---

### Task 4 — QR API route for dashboard

**Branch:** `feat/qr-api-route`
**PR title:** `feat: add QR code API route keyed on passId`
**Depends on:** Task 0, Task 1

**Files**

- `src/app/api/qr/[passId]/route.ts` _(new)_
- `tests/unit/qr-route.test.ts` _(new)_

**Behavior**

- `GET /api/qr/[passId]` → SVG (default).
- `GET /api/qr/[passId]?format=png` → PNG.
- Any other `format` value falls back silently to SVG.
- Validate `passId` shape (UUID) before the DB call; return 404 on malformed input.
- Validate existence via `db.invite.findUnique({ where: { passId }, select: { id: true } })`. Return 404 if not found.
- If `Invite.revokedAt` is set: still return 200 with the QR (the image itself isn't revoked — the pass view enforces access). The pass view handles the revoked-state display.
- Cache headers on 200:
  ```
  Cache-Control: public, max-age=31536000, immutable
  CDN-Cache-Control: public, max-age=31536000
  ```

**Security note (document in code):** the route is intentionally unauthenticated — `passId` is a public-by-design read-only credential per §2.5. UUID v4 entropy is ~122 bits, so enumeration is not a realistic threat. The QR image's payload is the same pass URL `/invite/pass/[passId]`, which is already public.

**Acceptance criteria**

- [ ] 200 with correct `Content-Type` for both SVG and PNG.
- [ ] 404 for invalid (non-UUID) and unknown `passId`.
- [ ] Cache headers present on 200, absent on 404.
- [ ] Tests cover: valid passId returns SVG, valid passId returns PNG, malformed passId returns 404 without DB hit, unknown passId returns 404 with one DB hit, unsupported format falls back to SVG.
- [ ] Route file includes a comment explaining the auth-free design and why revoked invites still return the image.

---

### Task 5 — Dashboard "Copy pass link" row action

> **Slimmed (sixth revision, 2026-05-07).** The original spec was an action-menu + modal with QR image preview, Download PNG button, focus trap, and Esc handling. Slimmed to a single "Copy pass link" row action — covers failure-mode recovery (bounced/lost confirmation email) without the UI weight. Image preview + PNG download moved to §8 Out of Scope; revisit when organizers ask for printable badges or phone-only invitees who refuse email become a meaningful cohort.

**Branch:** `feat/qr-pass-link-action`
**PR title:** `feat: add Copy pass link row action to invite manager`
**Depends on:** Task 0 (`passId` column).

**Files**

- `src/app/api/events/[id]/invites/route.ts` _(edit — include `passId` in the GET select; thread it through to the response)_
- `src/components/features/InviteManager/InviteManager.tsx` _(edit — extend the `Invite` type with `passId`; add a `handleCopyPassLink` handler matching the existing `handleCopyLink` pattern)_
- `src/components/features/InviteManager/InviteTable.tsx` _(edit — add "Copy pass link" action sibling to the existing "Copy Link" entry; gate enabled state on `rsvp?.response === "YES"`)_

**Behavior**

- Surface `passId` in the GET invites response and the client-side `Invite` type. (No extra round-trips: it's a column on the row already being selected.)
- Add a "Copy pass link" entry to the row's action menu, sibling to the existing "Copy Link" action.
- **Enabled** only when `invite.rsvp?.response === "YES"`. Pre-RSVP, MAYBE, and NO rows show the action **greyed-out / disabled** with a tooltip — e.g. *"Available after guest confirms attendance"*. Shown rather than hidden so organizers learn the action exists.
- Click → `navigator.clipboard.writeText(buildPassUrl(invite.passId))`; swap label to `"Copied ✓"` for ~2s after click, then revert (matches the existing `handleCopyLink` pattern at `InviteManager.tsx:315-323`).
- `buildPassUrl` from `src/lib/qr.ts` (Task 1) is the single source of truth for URL construction.

**Note on terminology — keep "Copy pass link" and "Copy Link" distinct.** The dashboard already has a "Copy Link" action (`InviteManager.tsx:315-323`) that copies the *write-credential invite URL* (`/e/<slug>?tk=<token>` for email invitees, `/rsvp/<token>` for phone-only). The new "Copy pass link" action copies the *read-only pass URL* (`/invite/pass/<passId>`). They serve different audiences (pre-RSVP guest vs YES-RSVP'd guest at venue) and have different security models (256-bit write token vs UUID-v4 read identifier). Visually distinct labels are required so an organizer doesn't paste the wrong one into an SMS.

**Acceptance criteria**

- [ ] "Copy pass link" appears in the row action menu, distinct from the existing "Copy Link".
- [ ] Action is enabled only when `invite.rsvp?.response === "YES"`. Pre-RSVP / MAYBE / NO rows show the action greyed-out with an explanatory tooltip.
- [ ] Click copies the pass URL (`/invite/pass/<passId>`) to clipboard and shows `"Copied ✓"` feedback for ~2s.
- [ ] No new modal, no image preview, no PNG download.
- [ ] Verified manually: regenerating an invite's token does NOT change the pass URL — passId is stable.
- [ ] Existing "Copy Link" action behavior is unchanged.

---

### Task 6 — Per-event QR opt-out

**Branch:** `feat/qr-event-toggle`
**PR title:** `feat: per-event toggle to skip QR attachment in confirmation emails`
**Depends on:** Task 0 (schema), Task 7 (QR pipeline now lives in CONFIRMATION branch). **Merge order: ship after Task 7** so the on/off branches are verified end-to-end before the gating switch lands.

**Files**

- `prisma/schema.prisma` _(edit — add `attachQrToConfirmation` to `Event`)_
- `prisma/migrations/<timestamp>_add_event_attach_qr/migration.sql` _(new)_
- `src/lib/email.ts` _(edit — read flag in `processEmail()` CONFIRMATION branch; short-circuit QR pipeline when false)_
- `src/schemas/event.ts` _(edit — accept the new field on event update)_
- `src/app/api/events/[id]/route.ts` _(edit — pass field through to update)_
- Invitation design panel page _(edit — toggle in the dashboard)_
- `tests/unit/email-qr.test.ts` _(extend — flag-off skips QR generation case)_

**Schema change**

```prisma
model Event {
  // ... existing fields
  attachQrToConfirmation Boolean @default(true) @map("attach_qr_to_confirmation")
}
```

**Migration SQL**

```sql
ALTER TABLE "events"
  ADD COLUMN "attach_qr_to_confirmation" BOOLEAN NOT NULL DEFAULT TRUE;
```

The DEFAULT is constant (not volatile like `gen_random_uuid()`), so Postgres can fast-path this without rewriting the table. Existing events default to opted-in — no behavior change for any current event.

**Behavior**

- When `event.attachQrToConfirmation === false`, `processEmail()` CONFIRMATION branch:
  - Skips both the `Invite.findUnique` fallback (for `passId`) and `generateQrPngBuffer`, even when `response === "YES"`.
  - Renders the template with `qrAvailable: false`.
  - Sends without `attachments`.
- The pass view (`/invite/pass/[passId]`), QR API route (`/api/qr/[passId]`), and dashboard "Copy pass link" row action (Task 5) are **not** gated by this flag. Organizers can still copy the pass URL for confirmed guests even when email attachment is disabled.
- MAYBE/NO confirmations are unaffected — they never carried a QR regardless of the flag (see §2.10).

**Reading the flag — payload vs. live lookup**

The flag must be read at send-time, not queue-time, so a toggle made between queue and send is honored (≤5 min window, but real). Implementation can either:

1. Add one column to whatever event lookup `processEmail()` already does (preferred — none today, so this means one new query per CONFIRMATION send for YES responses), or
2. Embed the flag in the queued payload and accept the read-after-write tear (organizer toggling after queue does not affect the in-flight send).

Pick option 1 unless the extra query shows up in cron-tick timing. ~1ms cost on a small column read is well within the 50ms cron budget.

**Dashboard surface**

A single toggle in the invitation design panel: *"Include scannable QR code in confirmation email"*, default on. Persisted via the existing event update endpoint — no new write surface.

**Acceptance criteria**

- [ ] Migration applies cleanly. Existing rows have `attach_qr_to_confirmation = true`.
- [ ] `processEmail()` CONFIRMATION branch skips the QR pipeline when the flag is false; the email still sends; `qrAvailable: false` reaches the template; no `attachments` on the send call.
- [ ] Dashboard toggle persists across reloads.
- [ ] Pass view and dashboard "Copy pass link" row action continue to work regardless of the flag.
- [ ] New test in `email-qr.test.ts`: with `response: "YES"` and flag-off, zero calls to `generateQrPngBuffer` and zero calls to `Invite.findUnique` for passId.
- [ ] Existing Task 7 tests unchanged when flag is `true` (default preserves YES-response QR behavior).

**Out of scope (intentional)**

Per-send override (e.g. a checkbox in the "Send invites" dialog). Not in this iteration — per-event covers the stated need; per-send adds UI surface without a concrete demand. Revisit only if organizers ask.

---

### Task 7 — Migrate QR from INVITE to CONFIRMATION emails

**Branch:** `feat/qr-in-confirmation`
**PR title:** `feat: send QR with confirmation email instead of invitation`
**Depends on:** Tasks 2b (#73) and 3 (#75) — already shipped against INVITE. Supersedes their target email type (see §2.10).

**Background**

In production review of #73 and #75 the team caught that the QR — a venue access credential — was being attached to invitations, before the recipient had agreed to attend. The correct trigger is a positive RSVP. This task migrates the pipeline + template block from INVITE to CONFIRMATION, gated on `response === "YES"`.

**Files**

- `src/lib/email.ts` _(edit)_:
  - Remove `passId` and `qrAvailable` from `InviteEmailPayload`.
  - Remove the QR pipeline from the INVITE branch in `processEmail()` (revert most of the Task 2b changes).
  - Add `passId?: string` and `qrAvailable?: boolean` to `ConfirmationEmailPayload`.
  - Add the QR pipeline to the CONFIRMATION branch in `processEmail()`, gated on `payload.response === "YES"`. Same try/catch contract as before — failures degrade to no-QR, never throw.
- `src/emails/InviteEmail.tsx` _(edit)_:
  - Remove the conditional QR `<Section>`, the four `qr*` style objects, the `QR_ATTACHMENT_FILENAME` import, and the `qrAvailable` prop.
- `src/emails/ConfirmationEmail.tsx` _(edit)_:
  - Add the conditional QR `<Section>` (mirror the styling from the InviteEmail version), the four `qr*` styles, the `QR_ATTACHMENT_FILENAME` import, and the `qrAvailable` prop.
- `src/app/api/events/[id]/invites/route.ts` _(edit)_:
  - Drop `passId: invite.passId` from the INVITE payload threading. The select can also drop `passId: true` if no other consumer needs it (verify before removing).
- RSVP submission path _(edit)_:
  - Wherever `queueConfirmationEmail` is called (likely under `src/app/api/rsvp/...` or similar), thread `passId: invite.passId` into the payload. The Invite row is already in scope for the RSVP write — adding `passId: true` to the existing select is a one-line change.
- `tests/unit/email-qr.test.ts` _(rewrite)_:
  - INVITE-branch QR tests become CONFIRMATION-branch QR tests.
  - Add coverage: `response: "YES"` triggers QR pipeline; `response: "MAYBE"` and `response: "NO"` do not.
  - Drop tests that asserted INVITE attachment behavior — those facts no longer hold.
- `tests/unit/invite-email-template.test.ts` _(delete)_:
  - InviteEmail no longer renders QR. The four tests in this file are obsolete.
- `tests/unit/confirmation-email-template.test.ts` _(new)_:
  - Render the ConfirmationEmail template with `qrAvailable: true` + `response: "YES"` → block renders. With `qrAvailable: false`, with `response: "MAYBE"`, with `response: "NO"` → block omitted. RSVP details remain present in all cases.

**Behavior**

- **INVITE emails** revert to pre-#73 behavior: no QR attachment, no QR template block.
- **CONFIRMATION emails** for `response === "YES"`: generate QR PNG via `generateQrPngBuffer(buildPassUrl(passId))`, attach as inline `cid:rsvp-qr.png`, render block in template. Failure → log warn, ship confirmation without QR.
- **CONFIRMATION emails** for `response === "MAYBE"` or `response === "NO"`: no QR pipeline, no attachment, no template block. The confirmation acknowledges the response and routes to the portal CTA as before.

**Acceptance criteria**

- [ ] Rendered INVITE HTML contains zero references to `cid:rsvp-qr.png`. (Add a regression test if not implicit.)
- [ ] Rendered CONFIRMATION HTML contains the QR block iff `response === "YES"` AND `qrAvailable === true`.
- [ ] `processEmail()` CONFIRMATION branch generates QR only on YES; never on MAYBE/NO. Asserted via mocked `generateQrPngBuffer`.
- [ ] CONFIRMATION email for YES response includes the inline attachment `{ filename: QR_ATTACHMENT_FILENAME, inline: true, contentType: "image/png" }`.
- [ ] Same try/catch contract as Task 2b: a failed lookup or generation produces a warn log and a QR-less email — never throws.
- [ ] `queueConfirmationEmail` callers thread `passId` into the payload. Fallback `Invite.findUnique` retained in `processEmail()` for legacy queued rows that predate this PR.
- [ ] All existing tests rewritten or deleted; full suite passes; lint + typecheck clean.

**Reviewer note**

Two reviewer expectations specific to this PR:
1. Confirm INVITE email rendered HTML is byte-for-byte identical to its pre-#73 form (modulo unrelated changes in main since then).
2. Confirm the gate is on `response === "YES"` — not on truthy `response` (which would also let MAYBE through). The `response` field is a `RsvpResponse` enum (`YES` | `MAYBE` | `NO`); strict equality is the intended check.

---

## 5. Testing Strategy

**Unit tests (Vitest)** — covered in each task's AC above. No shared fixtures needed beyond the existing `email.test.ts` mock Mailgun client.

**Migration test** — apply Task 0's migration on a snapshot with existing invite rows; verify all rows have a non-null, unique `pass_id`; verify `Invite.passId` is a typed `string` after `npm run db:generate`.

**Integration tests** — not required for MVP. Existing API route tests cover the general shape; adding integration tests for binary responses adds complexity without catching realistic bugs. Exception: write a lightweight test that asserts attachments propagate through both `sendEmailViaSMTP` (via a mocked nodemailer) and `sendEmailViaMailgun` (via a mocked fetch that inspects the FormData).

**Manual smoke test checklist (before production deploy)**

1. Run `npx prisma migrate deploy` against staging; verify all existing invites now have a non-null `passId`.
2. Create event → add invite → send invitation with QR.
3. Confirm QR appears in the received email across 3+ clients (Gmail web, Apple Mail, Outlook web).
4. Scan QR with a phone camera → opens `/invite/pass/<passId>` with guest name, RSVP badge, event title visible without scrolling.
5. Hold the phone at arm's length — guest name and RSVP badge readable without zoom on a 6.1" display.
6. Visit `/api/qr/<passId>` directly in a browser → SVG renders inline.
7. Visit `?format=png` → PNG renders / downloads.
8. Dashboard "Copy pass link" row action → enabled on YES-RSVP'd rows; click copies `/invite/pass/<passId>` to clipboard with `"Copied ✓"` feedback; greyed-out with tooltip on pre-RSVP / MAYBE / NO rows.
9. Force a QR generation error (e.g. temporarily throw in `generateQrPngBuffer`) → verify email still sends, no broken-image icon, warning logged.
10. Revoke an invite (`UPDATE invites SET revoked_at = now() WHERE id = …`) → scan its QR → pass view shows the "revoked" banner.
11. **Regenerate an invite's token** (via the planning panel's Regenerate action) → confirm the previously-distributed QR still resolves to the pass view (passId unchanged); confirm the dashboard "Copy pass link" action still copies the same URL.

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
| Task 0 | `Invite.passId` column + backfill | None (no code reads it yet) |
| Task 1 + Task 2a (parallel) | Utilities + attachment plumbing (unused by any email yet) | None |
| Task 3.5 | Pass view reachable at `/invite/pass/[passId]` (not yet referenced by any email) | None |
| Task 4 | QR API route callable (no UI references it yet) | None |
| Task 2b + Task 3 (together) | INVITE emails include QR attachment + conditional template block | _Shipped against INVITE in #73/#75; superseded by Task 7 (see §2.10)._ |
| Task 7 | QR migrates from INVITE to CONFIRMATION (YES responses only) | Newly-sent INVITE emails revert to pre-feature behavior (no QR). New CONFIRMATION emails for YES responses include the QR; MAYBE/NO confirmations do not. Already-sent INVITE emails with QRs in inboxes remain functional — `passId` is durable, the linked pass view still resolves. |
| Task 5 | Dashboard "Copy pass link" row action enabled on YES-RSVP'd invites | Organizers can copy the pass URL for confirmed guests — covers failure-mode recovery (bounced/lost confirmation email). Greyed out for pre-RSVP / MAYBE / NO rows. No image preview or PNG download (slim scope; see §8). |
| Task 6 | Per-event "Include QR in confirmation email" toggle (default on) | No change to existing events. New events can opt out before any invites are sent. Toggling mid-flight skips the QR on subsequent CONFIRMATION sends only. |

**Rollback**

- Two schema migrations across the plan: Task 0 (`add_invite_pass_id`) and Task 6 (`add_event_attach_qr`). Both are additive — rolling either back is a `DROP COLUMN`, non-destructive because no other data depends on them. Roll back later tasks in reverse order without touching the columns.
- Emails already delivered with a QR remain functional forever — `passId` is stable and the URL is durable across token regenerations.

### 6.5 Post-ship monitoring (stub)

Not in scope for the MVP tasks above, but worth capturing so the owner of observability picks it up alongside ship. Define dashboards / alerts for:

- **QR generation failure rate** (count of `processEmail()` CONFIRMATION branch that logged `"QR generation failed"` / `"QR pipeline failed"`). Target <0.1%.
- **CONFIRMATION emails sent with `response: "YES"` and `qrAvailable: false`** — counter; should be ~0. Non-zero indicates a systematic issue (e.g. env var drift, fallback DB lookup failing). Excludes events with the per-event opt-out from Task 6 — query should filter on `event.attachQrToConfirmation = true`.
- **Pass view 404 rate** — baseline, then alert on sustained spikes. Under Option B, the most likely cause of a 404 is a deleted invite or a malformed URL — *not* a regenerated token (which can no longer break the QR).
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
| `passId` enumeration via the QR or pass-view route | Negligible | Low | UUID v4: ~122 bits of entropy. Worst case if guessed: stranger sees a guest's name + RSVP status. No write capability follows from passId possession. |
| Migration on a hot `invites` table locks writes too long | Low | Medium | Default migration form does a full table rewrite (volatile DEFAULT). Use the safe multi-statement form for large tables; benchmark on a staging snapshot of production size before `migrate deploy`. See Task 0. |
| Pass view renders slowly and door queue backs up | Low | Medium | SSR server component, minimal dependencies, no client JS. Measure first real use at a small event before scaling. |
| Revoked invite still opens pass view with QR screenshot | Low | Medium | Pass view does a live DB read; revoked banner overrides all other content. The stale QR image itself is not revocable, but the content it links to is. |
| Phone-only invitee has no credential accessible offline at venue | Low | Low | The SMS link opens the pass view in a browser; most mobile browsers cache the rendered page and will display stale content offline. Staff can also look up by name in the dashboard from a connected device. Not a blocker for venues with normal connectivity. |

Risk *removed* in this revision: under the prior token-keyed design, regenerating an invite's token invalidated previously-distributed QRs (404 on scan). With Option B, `passId` is stable across the invite's lifetime; this failure mode no longer exists.

---

## 8. Out of Scope (Future Work)

Deliberately deferred; all reusable with the MVP QRs (passId is stable, no rotation required).

- **Pre-GA backend check-in.** Adds `checkedInAt` timestamp (one field on `Invite` or a new `CheckIn` table), `POST /api/invite/pass/[passId]/check-in` endpoint, and a staff-auth "Check In" button on the pass view. Estimated 2–3 days of additive work; the QRs shipped in this plan remain valid because `passId` is stable.
- **Staff scanner UI.** Dedicated `/admin/events/[id]/check-in` page that uses the browser camera API to scan QRs directly. Only needed once the backend check-in flow exists and venues request faster throughput than the "open phone, hold for staff" flow.
- **Branded QR codes with logo overlay.** Requires error correction `H` and design input.
- **QR code on the pass view itself.** Not useful for MVP (visual verification only). Becomes valuable when backend check-in ships because scanning the pass-view QR from a staff scanner would then trigger a state write rather than re-display the same information.
- **QR codes in REMINDER emails.** Once the QR ships in CONFIRMATION (Task 7), reminder emails for confirmed YES guests carry low marginal value — the recipient already has the QR. Revisit only if guests report misplacing the confirmation email closer to the event.
- **Apple / Google Wallet passes.** Significant infra lift; only worth doing once check-in is live and demand is proven.
- **Dashboard QR image preview and PNG download.** The original Task 5 spec included an action-menu modal with the QR image rendered from `/api/qr/<passId>` and a Download PNG button. Slimmed in the sixth revision to a copy-link-only row action. Reintroducing image preview / PNG download is justified if (a) organizers need to print physical badges pre-event or (b) phone-only invitees who refuse to supply email at RSVP become a meaningful cohort and SMS-able images become preferred over SMS-able links. Both are realistic but unproven; defer until asked. The QR API route (Task 4) remains in place — reintroducing the modal is purely a UI addition, no backend work.
- **Token-regeneration UX polish.** Schema has `Invite.tokenRegenerateCount`. Under Option B, regenerating a token does **not** invalidate the QR (pass URL is keyed on the stable `passId`) — the prior revision's "QR rotated by regen" warning no longer applies. Remaining polish: (1) the pass view 404 should render a branded *"This invitation is no longer valid — contact the organizer"* page instead of a generic Next.js 404 (relevant if an invite is deleted entirely); (2) the dashboard regen flow should clarify that the *RSVP link* is invalidated by regen, separate from the *pass link*, so organizers know what they're rotating. Neither is a ship blocker.
- **`passId` in the CSV export.** The invite CSV export at `/api/events/[id]/invites/export` deliberately omits `passId` for MVP. Including it would put a public-by-design lookup key into spreadsheets that organizers commonly share (with co-organizers, venues, vendors), and the `passId` is a bearer credential for guest-name + RSVP-state disclosure. If organizers ask for a row identifier in exports, either (a) include `Invite.id` (already private-by-default), or (b) include `passId` with explicit "treat this column as sensitive" framing in the export UI. Defer until a real ask appears.

---

## 9. Pre-GA Check-In: How the MVP Extends

This section describes how the pre-GA check-in feature builds on the MVP. Not in scope for this plan — captured here so reviewers understand that the MVP's URL and identifier choices are future-compatible.

**Additive work when check-in ships:**

1. **DB migration** — add `checkedInAt DateTime?` and `checkedInBy String?` to `Invite` (or introduce a `CheckIn` model if multi-venue / per-event history is needed). One additive migration.
2. **Endpoint** — `POST /api/invite/pass/[passId]/check-in`, staff-auth required, writes the timestamp, returns the same pass-view payload plus the check-in state.
3. **Pass view extension** — when the session is an authenticated staff user of the event's organization, render a "Check In" button; on subsequent loads, render "Checked in at 6:32 PM" instead. Guest-facing view (unauthenticated scan) is unchanged.
4. **AuthZ** — staff session is the gate for the *write*; `passId` only identifies the row. Event-creator + org-member check. Event-scoped staff roles if multi-role support is needed.
5. **Edge cases** — double-scan idempotency, manual check-in fallback from the dashboard, offline buffering if venue Wi-Fi is unreliable.

`passId` stays stable across the entire invite lifecycle. Guests never need to receive a replacement QR, even if their token is regenerated for unrelated reasons.

---

## 10. Reviewer Checklist (Feature-Specific)

In addition to the standard reviewer expectations in `CLAUDE.md` and `CONTRIBUTING.md`:

- [ ] Architectural decisions in §2 are respected (especially: send-time generation, `inline: true` attachments per §2.6, non-fatal QR failures, **passId-keyed pass view per §2.5**, **CONFIRMATION-not-INVITE delivery per §2.10**, timestamp-driven state detection per §2.8).
- [ ] No new environment variables introduced.
- [ ] One schema migration only (`add_invite_pass_id`, Task 0). No changes to `EmailOutbox` schema or shape. Migration form (default vs safe) is justified in PR description against staging row counts.
- [ ] Email cases other than the one the PR targets are provably unchanged (test evidence, not just claim) — e.g. for Task 7, all non-CONFIRMATION cases must be byte-for-byte stable.
- [ ] Pass view is dynamically rendered (`force-dynamic`), reads DB live by `passId` in a single query, validates UUID shape before DB hit, correctly renders revoked / cancelled / expired / event-ended states, applies the documented guest-name fallback chain, and does not leak guest identity in OG metadata.
- [ ] `sendEmail` attachment extension uses the `inline` boolean abstraction (no `cid` field); inline attachments render correctly on both SMTP and Mailgun paths; no manual Content-Type header set on the Mailgun FormData request.
- [ ] Dashboard slim Task 5 is implemented as specified: a "Copy pass link" row action sibling to the existing "Copy Link", **enabled only when `rsvp?.response === "YES"`** (greyed-out with tooltip on pre-RSVP / MAYBE / NO rows); copy uses `buildPassUrl` from `src/lib/qr.ts` and shows `"Copied ✓"` feedback for ~2s; verbally and visually distinct from the existing "Copy Link" (§Task 5 terminology note). No modal, no image preview, no PNG download.
- [ ] Token regeneration spot-check: regenerating an invite's token does NOT change the pass URL or what the dashboard's "Copy pass link" action copies (passId is the source of truth for the pass-view layer).

---

_Last updated: 2026-05-07 (sixth revision: slim Task 5 to copy-link-only row action gated on YES; modal + PNG download deferred to §8)_
