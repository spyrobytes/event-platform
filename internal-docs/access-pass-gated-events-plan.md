# Access-Pass-Gated Events — Implementation Plan

**Feature:** Organizers designate which sub-event(s) the Access Pass gates entry to (e.g., "Reception", "Gala Banquet", "Welcome Dinner"). The Pass card renders that gated list rather than the Event's primary `startAt`. Template-agnostic (works for weddings, conferences, parties).

**Effort estimate:** ~1.5–2 dev days across 5 PRs
**Owner:** _TBD_
**Status:** **Deferred.** A scaled-back version ships first — see "Status & Phasing" below.

---

## Status & Phasing

A wedding-aware default (Pass card prefers `InvitationConfig.receptionStartAt` when set, falls back to `event.startAt`) ships first as a ~1-hour change in PR A of the post-QR-launch smoke-test fix-up. That PR aligns the Pass card with the rule the invite-email pipeline already applies (`src/app/api/events/[id]/invites/route.ts:99-131`).

The full feature in this document is **deferred** until there's demand beyond weddings (banquet conferences, multi-day events with selective access). When it ships, it slots in **above** the reception default in `resolvePassMoment`:

```
accessPassGatedEvents (this plan)  →  receptionStartAt (shipped)  →  event.startAt (default)
```

So the scaled-back work is forward-compatible — no rework needed when this plan revives.

---

## 1. Goals and Non-Goals

**Goals**

- Each Event can carry zero or more "gated events" — `{ label, startAt, venue?, address? }` — that the Access Pass admits to.
- The Pass card at `/invite/pass/[passId]` renders the gated list when present; falls back to the existing `event.startAt + event.venueName` line when empty.
- Dashboard editor lives next to the QR opt-out (Task 6 of the QR plan) since it's the same conceptual surface: "what does the Access Pass cover?".
- Wedding organizers can prefill from existing `InvitationConfig` ceremony/reception fields with one click; non-wedding organizers enter manually.
- Empty/null list is the default — no migration backfill needed; existing events render exactly as today.

**Non-Goals**

- **Per-gated-event check-in.** Pre-GA. The Pass remains a visual-verification credential; gated-event granularity at the door (per-event scan log) ships with the backend check-in feature.
- **QR per gated event.** One QR per invite, one Pass URL per invite. The list is informational on the Pass card, not a multi-credential split.
- **Time-window enforcement** (e.g., "Pass valid only during Reception hours"). Out of scope; door staff still verify visually.
- **Per-guest gating** (Guest A allowed at Reception only, Guest B at Welcome Dinner + Reception). The gated list is event-level, not invite-level. Revisit if organizers ask.
- **Pulling from EventPage schedule sections** in v1. Manual entry + wedding-prefill ships now; schedule-pull is a v2 affordance.

---

## 2. Architectural Decisions

### 2.1 Storage: JSON column on `Event`, not a relation table

Each event has ≤5 gated entries in practice. No cross-event queries, no FK requirements, no per-entry permissions. A `Json?` column with a Zod-validated shape is materially simpler than a relation table for this use case.

```prisma
model Event {
  // ...
  accessPassGatedEvents Json? @map("access_pass_gated_events")
}
```

Tradeoff: querying "which events gate Reception?" requires JSON ops. We don't have that use case.

### 2.2 Empty/null = fallback, not a UX state

`accessPassGatedEvents IS NULL` and `accessPassGatedEvents = []` both mean "fall back to `event.startAt + event.venueName`". The Pass card never shows an empty gated-events block. Keeps existing events working without a migration backfill or organizer action.

### 2.3 Validation lives in Zod, not the DB

Postgres `Json` is unconstrained. Validation (label non-empty, startAt parseable, max 5 entries) happens at the API boundary via a shared Zod schema reused by the dashboard form. The DB stores whatever Zod approved.

### 2.4 No `endAt` per gated entry (yet)

A gated event is identified by its start. End times are useful for the time-window enforcement non-goal; until we ship that, an `endAt` field is dead weight. Add it when enforcement ships.

### 2.5 Wedding prefill is a UI affordance, not a coupling

The dashboard offers "Add from invitation details" buttons that read `InvitationConfig.{ceremony,reception}{StartAt,Venue,Address}` and populate a new entry. Once added, the entry is independent — editing it doesn't write back to `InvitationConfig`. Keeps the Pass system decoupled from wedding-specific schema while still being one click for the common case.

### 2.6 Single resolver in `resolvePassMoment`

The Pass page reads gated events through one helper that encodes the priority ladder. The shipped reception-default version of this helper occupies the lower two rungs:

```
1. accessPassGatedEvents (this plan; deferred)
2. invitationConfig.receptionStartAt (shipped)
3. event.startAt (default fallback)
```

When this plan revives, the only render change in `page.tsx` is selecting `accessPassGatedEvents` and letting the helper consult it first. The render block already iterates a list (the shipped version returns a single-entry list), so multi-entry support is render-cheap.

---

## 3. Schema

**One additive migration:** `add_event_access_pass_gated_events`.

```sql
ALTER TABLE "events"
  ADD COLUMN "access_pass_gated_events" JSONB;
```

No `NOT NULL`, no default, no rewrite. Constant-time on any table size.

**Shape (Zod-validated, not DB-enforced):**

```ts
const gatedEventEntrySchema = z.object({
  id: z.string().min(1),                     // client-side stable id for editing
  label: z.string().min(1).max(80),          // "Reception", "Gala Banquet"
  startAt: z.string().datetime(),            // ISO 8601 UTC
  venue: z.string().max(120).nullable(),
  address: z.string().max(200).nullable(),
});

const accessPassGatedEventsSchema = z.array(gatedEventEntrySchema).max(5);
```

Cap of 5 is generous for the "Reception + Welcome Dinner" use case while bounding the Pass card's render budget.

---

## 4. Task Breakdown

Five atomic PRs. Tasks 1 and 2 must merge in order; 3, 4, 5 can parallelize after Task 2.

### Task 1 — Schema + Zod types

**Branch:** `feat/access-pass-gated-events-schema`
**PR title:** `feat: add Event.accessPassGatedEvents column + Zod schema`

**Files**
- `prisma/schema.prisma` _(edit — add `accessPassGatedEvents Json?`)_
- `prisma/migrations/<ts>_add_event_access_pass_gated_events/migration.sql` _(new)_
- `src/schemas/event.ts` _(edit — add `gatedEventEntrySchema`, `accessPassGatedEventsSchema`)_

**Acceptance**
- Migration applies; existing rows have `access_pass_gated_events = NULL`.
- `npm run db:generate` regenerates client; field typed as `Prisma.JsonValue | null`.
- Zod schema enforces: 0–5 entries, label 1–80 chars, valid ISO datetime, optional venue/address.
- Unit tests for Zod edge cases.

### Task 2 — API: accept on event update

**Branch:** `feat/access-pass-gated-events-api`
**PR title:** `feat: accept accessPassGatedEvents on event update`
**Depends on:** Task 1

**Files**
- `src/schemas/event.ts` _(edit — add the field to the update schema)_
- `src/app/api/events/[id]/route.ts` _(edit — thread through the PATCH)_
- `tests/unit/event-api.test.ts` _(extend)_

**Behavior**
- PATCH accepts `accessPassGatedEvents: GatedEventEntry[] | null`.
- Stored as-is after Zod validation; `null` and `[]` both clear the gating list.
- Authorization unchanged (event-owner only).

**Acceptance**
- PATCH round-trips a 3-entry list correctly.
- PATCH with `[]` and PATCH with `null` both produce a fallback Pass card render in Task 3.
- Invalid input (label > 80 chars, malformed datetime) returns 400.

### Task 3 — Pass card consults gated list before reception fallback

**Branch:** `feat/access-pass-gated-events-pass-view`
**PR title:** `feat: render gated events list on Pass card`
**Depends on:** Task 1 (schema)

**Files**
- `src/app/invite/pass/[passId]/page.tsx` _(edit — select `accessPassGatedEvents`, render list)_
- `src/app/invite/pass/[passId]/_helpers.ts` _(edit — extend `resolvePassMoment` to consult `accessPassGatedEvents` first; existing reception-default branch becomes the second rung)_
- Tests _(extend `_helpers.test.ts` covering the gated-list path, reception fallback, default fallback, and a malformed-JSON safety case)_

**Render**

When list non-empty, replace the single-line `eventDate · eventTime` block with a stacked list:

```
EVENT TITLE
─────────────
Reception
Saturday, June 21 · 6:00 PM
The Royal Hall · 123 Main St

Welcome Dinner
Friday, June 20 · 7:00 PM
Pier 4 Bistro · 14 Marina Blvd
```

When list empty/null: existing reception-default → startAt cascade unchanged.

**Acceptance**
- Empty/null list AND no reception → byte-identical render to current Pass card.
- Reception set, gated list empty → reception render (unchanged from shipped behavior).
- 1-entry gated list → renders that entry, ignores reception/startAt.
- Multi-entry gated list → all entries rendered in array order (organizer-controlled).
- Malformed JSON → fallback render + warn log; doesn't 500.
- Time formatting uses the existing `formatEventDateLong` / `formatEventTime` with `event.timezone`.

### Task 4 — Dashboard editor

**Branch:** `feat/access-pass-gated-events-editor`
**PR title:** `feat: gated events editor in invitation panel`
**Depends on:** Task 2 (API)

**Files**
- `src/components/features/AccessPassGatedEventsEditor/AccessPassGatedEventsEditor.tsx` _(new)_
- `src/components/features/AccessPassGatedEventsEditor/index.ts` _(new — barrel)_
- The invitation design panel page _(edit — slot the editor next to the QR opt-out toggle)_

**UI**
- Section header: *"Access Pass coverage"* with helper text *"Choose which event(s) the QR Pass admits to. Leave empty to use the event's primary date and venue."*
- List of existing entries (rows: label, date/time, venue, "Edit" / "Remove").
- "Add event" button → inline form with: label (text), date+time picker, venue (text), address (text). Save / cancel.
- Empty state: *"No gated events configured. Pass will use the event's primary details."*
- Saves on each add/edit/remove via PATCH (debounced) — same pattern as other invitation panel fields.
- Reordering: drag handle (use existing dnd-kit if already in the project, else simple up/down arrows for v1).

**Wedding prefill** *(optional in this PR; ok to defer to Task 5)*
- If the event template is `wedding_*` AND `InvitationConfig.ceremonyStartAt` is set, show *"Add from invitation: Ceremony"* button. Same for Reception. Click prefills a new entry; saved like any other.

**Acceptance**
- Editor adds/edits/removes round-trip via PATCH.
- Empty list saves as `null` (or `[]`) — both yield fallback Pass render.
- Form validation matches Zod (label required, datetime required, max 5 entries).
- Removing the last entry clears the field; Pass falls back.
- Loads existing entries on mount; state-of-the-art doesn't flicker on save.

### Task 5 — Wedding prefill helpers (split if Task 4 ships without it)

**Branch:** `feat/access-pass-gated-events-wedding-prefill`
**PR title:** `feat: prefill gated events from wedding ceremony/reception`
**Depends on:** Task 4

**Files**
- `src/components/features/AccessPassGatedEventsEditor/AccessPassGatedEventsEditor.tsx` _(edit)_

**Behavior**
- For wedding-template events, fetch `InvitationConfig.{ceremony,reception}{StartAt,Venue,Address}` alongside the editor data.
- Render up to two "Add from invitation: Ceremony" / "Reception" buttons — only when the underlying timestamps are set.
- Click → prefills a new entry with `label = "Ceremony"` (or "Reception"), the timestamp, venue, address. Saves on confirm like a manual entry.

**Acceptance**
- Buttons render only for `templateId LIKE 'wedding_%'` events.
- Buttons render only when the corresponding `*StartAt` is non-null.
- Click produces an editable entry — organizer can rename "Reception" to "Reception Dinner" before saving.
- Once saved, editing the entry doesn't write back to `InvitationConfig`.

---

## 5. Rollout

| Merge order | What becomes live | User impact |
|---|---|---|
| Task 1 | `accessPassGatedEvents` column + Zod schema | None |
| Task 2 | API accepts the field | None (no UI yet) |
| Task 3 | Pass card consults gated list, falls back to reception, then startAt | None until Task 4 lets organizers populate it |
| Task 4 | Dashboard editor | Organizers can configure gated events; Pass card immediately reflects changes |
| Task 5 | Wedding prefill | One-click prefill for wedding ceremony/reception |

**Rollback:** All additive. Drop the column to undo Task 1; later PRs no-op without it. The shipped reception-default behavior is unaffected by any rollback in this plan.

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| JSON shape drift over time | Medium | Low | Zod schema is the single source; Pass card parses defensively (malformed → fallback + warn). |
| Pass card overflows on phones with 4+ entries | Low | Low | Cap of 5 is forgiving; render uses compact stacked layout. Smoke-test with the cap. |
| Organizer saves the list and forgets to also update `event.startAt` for SEO/discovery surfaces | Medium | Low | The two are independent by design. Document that the Event's primary `startAt` still drives discovery + SEO; gated events drive the Pass only. |
| Wedding-prefill drift if organizer edits ceremony fields after prefilling | Low | Low | Documented in Task 5 AC: prefill copies, doesn't link. Editing `InvitationConfig` after prefill doesn't propagate. |
| Reception-default users adopt gated events and end up with both set | Low | Low | Resolver priority is unambiguous: gated list wins. Document in the editor's empty-state copy. |

---

## 7. Out of Scope

- Per-gated-event check-in (pre-GA, see QR plan §9).
- Time-window enforcement (Pass invalid outside the gated event's hours).
- Per-guest gating.
- Pulling entries from EventPage `scheduleSectionDataSchema` items.
- Surfacing the gated list in the confirmation email body (currently the email links to the Pass; the Pass shows the list).
- A "this is a gated event" badge on the public event page or invitation card.

---

## 8. Reviewer Checklist

- [ ] Single migration; additive; no backfill required.
- [ ] Zod schema is the only validation surface; DB column is unconstrained `Json`.
- [ ] Pass card render is byte-identical for events with `accessPassGatedEvents IS NULL` AND no reception (i.e. matches the pre-PR-A baseline).
- [ ] Pass card render with reception set + gated list empty/null is byte-identical to the shipped reception-default behavior.
- [ ] Editor saves `null`/`[]` interchangeably; both fall back on Pass render.
- [ ] Wedding prefill is one-way (copy, not link).
- [ ] No new environment variables.
- [ ] Cap of 5 entries enforced both client (form) and server (Zod).
