# Invite Planning Panel + Printable Roster — Implementation Plan

**Feature:** Per-invite side panel on the Manage Invites page (edit seat assignment, planner notes; view QR; quick actions) plus a printable day-of roster filtered to confirmed-attending guests.
**Scope:** Companion plan to `qr-code-implementation-plan.md`. Subsumes the deferred **Task 5** (dashboard QR surface) from that plan — the panel replaces the standalone `InviteQrModal`. Two additive schema fields on `Invite`; one new API route; two new UI surfaces (panel + roster).
**Effort estimate:** ~2.5 dev days across 6 small PRs.
**Owner:** _TBD_
**Status:** Draft

---

## 1. Goals and Non-Goals

**Goals**

- Organizers can open a per-invite side panel from the Manage Invites table (`/dashboard/events/[id]/invites`) that anchors all per-guest operations in one place: view details, view/download QR, copy invite link, edit seat assignment, edit planner notes.
- Seat assignment and planner notes persist to the `Invite` row and are visible wherever invite data is rendered.
- The panel **replaces** Task 5 of the QR plan — there is no standalone QR modal.
- Organizers can open a printable roster filtered to confirmed-attending guests (`rsvp.response === "YES"` only). The roster is a web page with print stylesheet; organizers use the browser's native print / save-as-PDF.
- Roster columns: **Guest name**, **Seat assignment**, **Planner notes**. (A QR column is explicitly excluded — see §2.7.)
- Schema changes are additive and non-breaking; organizers who never open the panel see no UI change.
- Panel URL state is deep-linkable: `/dashboard/events/[id]/invites?invite=<id>` opens the panel for that invite. Browser back closes it.

**Non-Goals (for this plan)**

- **Interactive seating chart / drag-and-drop seating plan.** Seat assignment is a freeform string. A venue diagram with draggable tokens is a separate, much larger feature.
- **Bulk seat assignment.** No "assign seats to selected rows" affordance in MVP; organizers edit one guest at a time.
- **CSV import of seat assignments.** Export already exists (`/api/events/[id]/invites/export`) and will gain the new columns; import is deferred.
- **Role-based visibility of planner notes.** Anyone with event-edit permission sees them. A private / shared notes split is deferred.
- **Check-in column on the roster.** Pre-GA work. Roster shows scheduled attendance only.
- **QR codes on the printed roster.** Excluded, not deferred. See §2.7 for the full reasoning — briefly: scanning a paper QR in the MVP resolves to the same guest/name/RSVP already printed on the row, so the column adds no distinct outcome. Revisit when backend check-in ships and scanning produces a state change.

---

## 2. Architectural Decisions

### 2.1 Panel is an overlay, not a route

The panel opens on the existing `/dashboard/events/[id]/invites` page. It does not navigate. Rationale: organizers moving between guests want the invite list visible underneath, and rapid open/close should not trigger a full route transition. URL state is synced via `router.replace` (no history pollution).

### 2.2 Deep-linkable via `?invite=<id>` search param

Search param state is preferred over modal-internal-only state so that:
- Sharing a URL with a teammate opens the same panel.
- Browser back closes the panel.
- Page refresh preserves the open state.

When the search param is present but the invite is absent/deleted, the panel renders an empty state ("invite not found") with a Close action. It does not 404 the whole page.

### 2.3 Debounced auto-save on planning fields

Seat assignment and planner notes auto-save 500ms after the user stops typing. A subtle status indicator shows `Saving…` → `Saved ✓` (fades after 2s). Rationale: planning fields are low-stakes and frequently edited; a modal with an explicit Save button is heavier than needed.

**Error handling.** Save failure surfaces as an inline red `Save failed — retry` link next to the field. The optimistic local value is preserved so the user's text is not lost. No toast, no global notification — the error belongs to the field.

### 2.4 Roster is a dedicated printable route

`/dashboard/events/[id]/invites/roster` is a full server-rendered page with a print stylesheet. The browser handles PDF export via Ctrl+P → "Save as PDF". Rationale:

- Avoids a server-side PDF dependency (Puppeteer, pdfkit, etc.).
- Print settings (paper size, orientation, margins) stay user-controlled.
- Same HTML is previewable on-screen before printing.

### 2.5 Schema: two nullable strings on `Invite`, not a separate table

Add `Invite.seatAssignment String?` and `Invite.plannerNotes String?`. No `InvitePlanning` side-table. Rationale:

- 1:1 relationship with `Invite`.
- No multi-venue / multi-session planning in the MVP.
- Additive, single migration, zero read-path changes.

If a future feature needs per-session planning (e.g., a multi-day conference where seat differs by session), the fields can be deprecated in favor of a side-table at that point.

### 2.6 Reuse existing CSV export; do not create a parallel export

`/api/events/[id]/invites/export?filter=attending` already exists and produces a CSV of YES RSVPs. This plan extends it with two new columns (`seat_assignment`, `planner_notes`). Rationale: organizers already know about the CSV export; adding columns is less surprising than introducing a second export surface.

### 2.7 No QR column on the printable roster

The roster is door-staff-facing paper. The MVP check-in flow is visual verification only (QR plan §1): staff scan a guest's phone QR, the pass view opens, staff eyeball the guest/name/RSVP. Scanning a paper QR on the roster resolves to *the same guest/name/RSVP that is already printed on the same row* — it produces no distinct outcome. Including it would:

- Add a column of noise to a day-of reference sheet.
- Require a new authenticated dashboard-to-token lookup (the existing QR API route is keyed on raw token, and the server-rendered roster only has invite ids / hashes on hand — not raw tokens).
- Create a token-leak surface if the roster URL is ever shared without thinking.

When backend check-in ships (QR plan §9), scanning a paper QR would trigger a state write — a genuinely distinct outcome. Revisit at that point.

### 2.8 Panel subsumes QR plan Task 5; QR plan ships without dashboard QR surface

The QR plan (revised 2026-04-23) ships Tasks 1–4, 2a, 2b, 3, 3.5 and explicitly defers Task 5. This plan's Task 3 (panel component) is the replacement. Between QR plan merge and this plan's Task 3 merge, organizers can still access QRs by visiting `/api/invites/[token]/qr` directly or through the pass view — there is no dashboard-native QR surface during the gap. See §7 for mitigation.

---

## 3. Prerequisites

**Upstream plan:** `qr-code-implementation-plan.md` — Tasks 1, 3.5, and 4 must be merged before this plan's Task 3. Specifically required:

- `buildPassUrl`, `generateQrSvg`, `buildQrFilename` from `src/lib/qr.ts` (QR Task 1).
- `/api/invites/[token]/qr` route (QR Task 4).
- `/invite/[token]/pass` route (QR Task 3.5) — referenced from the panel's "Preview pass view" link.

**No new npm deps.**

**No new environment variables.**

**Runtime:** Node (consistent with the rest of the dashboard).

---

## 4. Task Breakdown

Six tasks, sized for solo review. T1 is independent; T2 depends on T1; T3 depends on T2 and QR plan T1/T4; T4 depends on T3; T5 depends on T1 only; T6 depends on T1. T1 can merge on its own ahead of the others.

### Task 1 — Schema migration

**Branch:** `feat/invite-planning-fields`
**PR title:** `feat: add seatAssignment and plannerNotes to Invite`

**Files**

- `prisma/schema.prisma` _(edit)_
- `prisma/migrations/<timestamp>_add_invite_planning_fields/migration.sql` _(generated)_

**Changes**

Add to `Invite` model (after `plusOnesAllowed`):

```prisma
seatAssignment String? @map("seat_assignment")
plannerNotes   String? @map("planner_notes")
```

Run:

```bash
npx prisma migrate dev --name add_invite_planning_fields
npm run db:generate
```

**Acceptance criteria**

- [ ] Migration adds two nullable text columns; no default values; no backfill required.
- [ ] `npx prisma migrate diff --exit-code --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma` exits 0 (no drift) after apply.
- [ ] Existing invite queries compile unchanged; no callers read the new fields yet.
- [ ] Per `CLAUDE.md` migration runbook: migration file committed alongside the schema change in the same PR.

---

### Task 2 — API: PATCH endpoint for planning fields

**Branch:** `feat/invite-planning-api`
**PR title:** `feat: add PATCH /invites/[inviteId] for planning fields`
**Depends on:** Task 1

**Files**

- `src/app/api/events/[id]/invites/[inviteId]/route.ts` _(new)_
- `src/schemas/invite.ts` _(extend)_ — or equivalent location
- `tests/unit/invite-patch.test.ts` _(new)_

**Behavior**

- `PATCH /api/events/[id]/invites/[inviteId]` — authenticated, authorized via `requireEventOwner`, validates body with Zod, updates only the fields present in the request (partial update). Returns the updated invite row.
- Validation: `seatAssignment` and `plannerNotes` each nullable, each max 500 chars (conservative cap; server-side, mirror in the Zod schema).
- Other fields (email, name, status, tokens) are **not** editable through this endpoint — explicitly rejected with 400 if sent. Keeps the surface area small and obvious.

**Acceptance criteria**

- [ ] 200 with updated row on successful partial update of either field.
- [ ] 400 on field-length violation or unknown field in body.
- [ ] 401 unauthenticated; 403 when the caller is not the event owner.
- [ ] 404 when `inviteId` does not belong to the event in the route.
- [ ] Tests cover happy path, length cap, unknown field, cross-event inviteId (404), unauthenticated.
- [ ] No other fields on `Invite` are writeable through this route.

---

### Task 3 — `InvitePlanningPanel` component

**Branch:** `feat/invite-planning-panel`
**PR title:** `feat: add InvitePlanningPanel side sheet`
**Depends on:** Task 2, QR plan Task 1, QR plan Task 4

**Files**

- `src/components/features/InviteManager/InvitePlanningPanel.tsx` _(new)_
- `src/components/features/InviteManager/InvitePlanningPanel.module.css` _(new, as needed)_
- `src/components/features/InviteManager/index.ts` _(extend)_
- `src/hooks/useDebouncedSave.ts` _(new — reusable)_
- `tests/unit/invite-planning-panel.test.tsx` _(new)_

**Layout**

Side sheet, docked right on desktop (≥1024px, ~480px wide), full-height; bottom-sheet on mobile (<768px, ~75vh). Sections stacked vertically inside a scrollable container:

1. **Header** — guest name, Close button, visible status indicator for auto-save (`Saving…` / `Saved ✓` / `Save failed`).
2. **Overview** — email, phone, RSVP response badge (reuses existing badge component), party size (`rsvp.guestCount` if present, else `plusOnesAllowed` cap — consistent with pass view §3.5 of QR plan).
3. **QR code** — SVG image from `/api/invites/[token]/qr`, **Download PNG** button (using `buildQrFilename` helper), **Copy invite link** button (using `buildPassUrl`), link to `/invite/[token]/pass` labeled "Preview pass view".
4. **Planning** — two fields, auto-saving:
   - Seat assignment (single-line input, max 500 chars)
   - Planner notes (multi-line textarea, max 500 chars, character counter)
5. **Danger zone** (collapsed by default) — existing Regenerate / Revoke actions relocated from the table action menu (see Task 4).

**URL state**

- On open: `router.replace('?invite=<id>&${existing params}')`.
- On close: remove `invite` param.
- On mount, if `invite` search param is set, open the panel for that invite. If the invite is not in the visible list (e.g. filtered out), fetch it lazily or show "invite not found" empty state.

**Auto-save**

`useDebouncedSave(value, save, { delay: 500 })`:
- Fires `save(value)` 500ms after last change.
- Skips firing when value equals last-saved value.
- Exposes status: `idle | saving | saved | error`, which drives the header indicator.
- On error, the last user input is preserved; clicking the inline retry link re-fires the save.

**Acceptance criteria**

- [ ] Panel opens on row click in `InviteTable` and on `?invite=<id>` initial load.
- [ ] Closing the panel removes the search param; browser back closes the panel (does not navigate away from the page).
- [ ] Seat and notes fields auto-save 500ms after last edit; indicator transitions `Saving… → Saved ✓`.
- [ ] Save failure: inline retry link appears next to the field; typing in the field does not lose the unsaved value.
- [ ] Character cap enforced client-side (hard limit) and server-side (Task 2).
- [ ] Download PNG uses `buildQrFilename(guestName, token)` from QR plan Task 1 — no bespoke sanitization in this component.
- [ ] "Copy invite link" copies `buildPassUrl(token)` and shows `Copied ✓` for ~2s.
- [ ] Focus is trapped inside the panel when open; `Esc` closes; focus returns to the triggering row.
- [ ] Mobile layout at 375px is usable — sheet docks to bottom, field labels don't overflow.
- [ ] Panel renders an empty state when `invite` param points to a missing row (not a 404 for the page).

---

### Task 4 — Wire panel into `InviteTable`; remove action-menu QR entry

**Branch:** `feat/invite-table-panel-integration`
**PR title:** `feat: open planning panel from invite row`
**Depends on:** Task 3

**Files**

- `src/components/features/InviteManager/InviteTable.tsx` _(edit)_
- `src/components/features/InviteManager/InviteManager.tsx` _(edit)_

**Changes**

- Row click opens the panel for that invite. Use a button or clickable row; not `<a>` (no navigation).
- Remove the action-menu "View QR" entry (never shipped in this plan's sequencing, but if it landed via any interim patch, remove here).
- Remove Regenerate / Revoke from the row action menu; surface them in the panel's Danger zone (Task 3) instead. Reduces row action-menu to just the open-panel default behavior.
- `InviteManager.tsx` holds the `?invite=<id>` ↔ open-panel state coordination.

**Acceptance criteria**

- [ ] Clicking any row opens the panel for that invite.
- [ ] Action menu on each row is simplified — no QR, regenerate, or revoke entries. If the action menu has no remaining entries, drop the kebab trigger entirely; rows just click to open.
- [ ] Keyboard: Enter on a focused row opens the panel; Tab order remains sensible.
- [ ] No regressions in existing invite-table behavior (filters, sort, pagination) — verified by existing test suite.

---

### Task 5 — Printable roster route

**Branch:** `feat/invite-roster-print`
**PR title:** `feat: add printable roster for confirmed attendees`
**Depends on:** Task 1

**Files**

- `src/app/(auth)/dashboard/events/[id]/invites/roster/page.tsx` _(new)_
- `src/app/(auth)/dashboard/events/[id]/invites/roster/roster.module.css` _(new)_

**Behavior**

Server component. Authenticated (same layout guard as the rest of `(auth)`). Authorized via `requireEventOwner`.

```ts
export const dynamic = "force-dynamic";

const invites = await db.invite.findMany({
  where: {
    eventId,
    rsvp: { response: "YES" },
  },
  select: {
    id: true,
    name: true,
    seatAssignment: true,
    plannerNotes: true,
    rsvp: { select: { guestName: true, guestCount: true, additionalGuestNames: true } },
  },
  orderBy: [{ seatAssignment: "asc" }, { name: "asc" }],
});
```

No raw token is read; no QR is rendered. See §2.7 for rationale.

**Layout (print-first CSS)**

- `@media print` stylesheet: no app chrome, no navigation, no hover effects.
- Page size: default to US Letter landscape (`@page { size: letter landscape; margin: 0.5in; }`); organizers can override in print dialog.
- Table: repeating `<thead>` on each page (`thead { display: table-header-group; }`).
- Row break control: `tr { break-inside: avoid; }`.
- Typography: 11pt minimum.

**On-screen view** renders the same HTML above-the-fold so organizers can review before printing. Include a `Print roster` button that calls `window.print()`.

**Acceptance criteria**

- [ ] Route is reachable from the Manage Invites page via a visible "Print roster" link.
- [ ] Returns only invites with a linked RSVP where `response === "YES"`.
- [ ] Columns: Guest, Seat, Notes. No QR column (per §2.7).
- [ ] Sort order: by seat assignment (nulls last), then guest name.
- [ ] `window.print()` produces a clean, chrome-free print preview.
- [ ] Long rosters (>50 guests) break cleanly across pages; header row repeats.
- [ ] Empty state: event with no YES RSVPs renders a friendly message, not a blank page.
- [ ] Party size > 1: additional guest names render inline in the Guest column (`Jane Doe + 2 (Alex Doe, Sam Doe)`).

---

### Task 6 — Extend CSV export with new columns

**Branch:** `feat/invite-csv-planning-columns`
**PR title:** `feat: include seat/notes in invite CSV export`
**Depends on:** Task 1

**Files**

- `src/app/api/events/[id]/invites/export/route.ts` _(edit)_
- `tests/unit/invite-export.test.ts` _(extend)_

**Changes**

- Include `seat_assignment` and `planner_notes` columns in the CSV output for all existing filter values.
- Columns are appended at the end; existing column order is preserved (no breakage for anyone parsing the CSV with positional reads).

**Acceptance criteria**

- [ ] New columns present in CSV output across all filter values.
- [ ] Existing columns unchanged in name, order, or formatting.
- [ ] Null values render as empty string (consistent with existing null handling).
- [ ] Tests cover: planning fields present, planning fields null, filter=attending includes the columns.

---

## 5. Testing Strategy

**Unit tests (Vitest)** — per-task AC above.

**Component tests** — Panel open/close state, auto-save debounce, retry on error, focus trap.

**Manual smoke test checklist (before production deploy)**

1. Create event → add 3 invites, RSVP 2 as YES (one solo, one party of 3), 1 as NO.
2. On the Manage Invites page, click a YES invite → panel opens, QR renders, RSVP badge shows green.
3. Type a seat assignment → see `Saving…` → `Saved ✓`. Refresh the page → value persists.
4. Type planner notes > 500 chars → client-side limit blocks input; server would 400.
5. Toggle airplane mode → type into seat field → see `Save failed — retry`; reconnect → click retry → save succeeds.
6. Close panel with `Esc` → URL param clears; focus returns to the row.
7. Share URL with `?invite=<id>` in a new tab → panel opens on that invite.
8. Delete an invite in a second tab → return to first tab with `?invite=<deletedId>` → panel shows "invite not found".
9. Visit `/dashboard/events/[id]/invites/roster` → shows only the 2 YES invites; party-of-3 renders inline additional names.
10. `Ctrl+P` → print preview is clean, no app chrome.
11. Export CSV (`?filter=attending`) → file has the new `seat_assignment` and `planner_notes` columns populated.

**Accessibility**

- Side sheet has `role="dialog"`, `aria-labelledby` pointing at the guest name heading, focus trap, `Esc` to dismiss.
- Inputs have associated `<label>` elements; character counters use `aria-live="polite"`.
- Print view uses semantic `<table>` with `<th scope="col">` for screen-reader compatibility.

---

## 6. Rollout Plan

| Merge order | What becomes live | User impact |
|---|---|---|
| T1 | Schema fields present; no UI yet | None |
| T2 | PATCH endpoint callable; no UI yet | None |
| T6 | CSV export gains two new columns | Organizers who use the export see two extra columns (always empty until panel lands) |
| T3 + T4 (together) | Panel replaces row action menu; editing enabled | Organizers see redesigned row behavior; click-to-open panel; QR accessible in the dashboard for the first time |
| T5 | Printable roster link appears on Manage Invites page | Organizers can print day-of roster |

**Interim state (QR plan merged, this plan not yet fully merged).** Organizers have no dashboard QR surface during the gap. See §7 R1.

**Rollback**

- T1 migration is additive; a rollback migration dropping the columns is safe (data loss of planning fields only).
- T2–T6 are independently revertable.
- No data migration or backfill.

---

## 7. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **R1.** Organizers request dashboard QR access during the QR-plan→panel-plan gap | Medium | Low | QR plan's Task 3.5 means organizers can still copy-paste a guest's pass URL from the address bar after visiting `/invite/[token]/pass`. Unglamorous but functional. Accelerate T3 if this becomes a friction point. |
| Auto-save loses data during flaky network | Medium | Medium | Optimistic local state preserved on error; inline retry link; no toast fatigue. Visible indicator avoids the "did it save?" question. |
| Print rendering breaks for >100 guests | Low | Low | Explicit `break-inside: avoid` on rows; repeating `<thead>`. Test with a seeded 200-row event before ship. |
| Panel `?invite=<id>` deep-link points to deleted invite | Medium | Low | Empty state inside the panel ("invite not found"); the page itself still renders. |
| Duplicate state between table filters and panel open | Low | Low | Panel fetches invite by id independently of the filter; a YES-only filter does not close an already-open NO-invite panel. |
| 500-char cap on planner notes is too short | Low | Low | Easy to raise in a follow-up; start conservative. Organizers with very long notes can use an external doc and paste a link. |

---

## 8. Out of Scope (Future Work)

- **QR column on the printable roster.** Deferred pending the dashboard-auth QR lookup helper (Task 5 note, option C). When it lands, add as a follow-up PR; the table layout already leaves space.
- **Interactive seating chart.** Canvas / SVG venue diagram with drag-and-drop seat tokens. Separate plan, separate design input.
- **Bulk-edit seat assignments.** Multi-select rows → bulk action → "assign seats A1–A20 round-robin" or similar.
- **CSV import of seat/notes.** Round-trip for organizers who prefer spreadsheet workflows.
- **Separate notes visibility (shared vs. private).** All planner notes are visible to anyone with event-edit access in the MVP.
- **Check-in column on the roster.** Depends on pre-GA backend check-in (QR plan §9).
- **Panel polish: keyboard navigation between guests** (←/→ to move to adjacent invite without closing the panel). Nice organizer workflow improvement; low MVP value.
- **Mobile dashboard deep polish.** The sheet works on mobile, but the full Manage Invites page is desktop-first. A proper mobile layout is a separate initiative.

---

## 9. Reviewer Checklist (Feature-Specific)

In addition to standard expectations in `CLAUDE.md` and `CONTRIBUTING.md`:

- [ ] Architectural decisions in §2 are respected (panel as overlay, URL state via search param, auto-save pattern, single migration, reuse of existing CSV export and QR API route).
- [ ] No new environment variables.
- [ ] No new npm dependencies.
- [ ] Single additive migration for the two new columns; no data migration.
- [ ] PATCH endpoint (Task 2) is strictly scoped to the two new fields — does not accidentally allow editing other invite fields.
- [ ] Panel (Task 3) uses `buildQrFilename` and `buildPassUrl` from the QR plan's `src/lib/qr.ts` — no duplicated sanitization or URL construction.
- [ ] Roster (Task 5) filters on `rsvp.response === "YES"` exactly; no MAYBE bleed-through.
- [ ] Print CSS is scoped to the roster route; does not affect other dashboard pages.
- [ ] Roster has **no** QR column and reads no raw tokens; exclusion reasoning matches §2.7.

---

_Last updated: 2026-04-23_
