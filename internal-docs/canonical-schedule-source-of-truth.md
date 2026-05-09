# Canonical Schedule — Source-of-Truth Consolidation

**Feature:** A single typed schedule on the Event row holds every sub-event's `{ label, startAt, venue, address, role? }`. All seven render surfaces (invite email, confirmation email, public event page, invitation card, Pass card, dashboard listings, calendar exports) derive from it. Wedding-specific timing fields on `InvitationConfig` are deprecated.

**Effort estimate:** ~1 dev week
**Owner:** _TBD_
**Status:** **Deferred.** A timezone-aware input fix ships first (the immediate bug); this plan is the followup that removes the underlying fragmentation.

---

## Status & phasing

A timezone fix to the existing fragmented-input model lands first (`src/lib/datetime.ts` helpers + EventForm + invitation panel). That unblocks correct local testing without changing the data model. The current document describes the deferred refactor that removes the duplication.

---

## 1. Why this matters

An organizer for a typical wedding currently enters their day's timing in **3–4 different places**, in **incompatible formats**:

| Place | Data shape | Drives |
|---|---|---|
| `Event.startAt` / `endAt` (real Date) | UTC instant + `Event.timezone` | Discovery, SEO, calendar exports |
| `InvitationConfig.ceremonyStartAt` / `receptionStartAt` (real Date) | UTC instant | Invite-email date lines, Pass card "Reception" detection |
| `InvitationConfig.ceremonyDate` / `ceremonyTime` / `receptionDate` / `receptionTime` (free text) | Strings like `"Saturday, the Twenty-First of June"`, `"Four O'Clock in the Afternoon"` | Invitation card display |
| `pageConfig.scheduleSection.items[]` (free text) | `{ time: "10:00 PM", title, location, description }` | Public event page schedule section |

Consequences:

- **Drift.** A change to ceremony time has to be made in 3 places. Organizers miss surfaces.
- **No timezone discipline.** Free-text strings carry no TZ information; the same time can disagree across surfaces by hours.
- **No single source for "what does the Access Pass admit to."** Today the Pass card hardcodes "Reception" detection via `InvitationConfig.receptionStartAt`. The deferred Access-Pass-Gated-Events plan (see `internal-docs/access-pass-gated-events-plan.md`) wants organizers to pick which sub-events the Pass covers — but it has no canonical sub-event list to pick FROM.
- **Wedding-only coupling.** `InvitationConfig.{ceremony,reception}*` are wedding-shaped. Banquets at conferences, multi-day events with selective Pass coverage have no equivalent home.

---

## 2. Target data model

```prisma
model Event {
  // ...existing
  startAt  DateTime  @map("start_at")  // primary moment — keeps SEO/discovery semantics
  endAt    DateTime? @map("end_at")
  timezone String    @default("UTC")
  schedule Json?     @map("schedule")  // canonical sub-event list (NEW)
}
```

`schedule` shape (Zod-validated):

```ts
const scheduleEntrySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),       // "Ceremony", "Reception", "Welcome Dinner"
  role: z.enum([                           // optional semantic tag
    "ceremony",
    "reception",
    "welcome",
    "rehearsal",
    "afterparty",
    "session",
    "banquet",
    "other"
  ]).optional(),
  startAt: z.string().datetime(),          // ISO 8601 UTC
  endAt: z.string().datetime().optional(),
  venue: z.string().max(120).nullable(),
  address: z.string().max(200).nullable(),
  description: z.string().max(500).optional(),
  isAccessPassGated: z.boolean().default(false),
});

const scheduleSchema = z.array(scheduleEntrySchema).max(20);
```

`role` is the bridge that lets render surfaces find the right entry by semantics rather than label string match (label is organizer-controlled and translatable; role is the contract).

---

## 3. What changes per render surface

### Invite email
- Remove `ceremonyDate/Time/Venue/Address` and `receptionDate/Time/Venue/Address` fields from `InviteEmailPayload`.
- Replace with `schedule: ScheduleEntry[]` filtered to "what to mention in the invite" (likely entries where `role` is one of `ceremony`, `reception`, `welcome`).
- Render dates via `formatInTimeZone(entry.startAt, event.timezone, …)` — same formatter as today, derived from typed input rather than free-text.

### Confirmation email + Pass card
- Pass card's "Reception" lookup becomes: find the entry with `role === "reception"`, fall back to the first `isAccessPassGated` entry, fall back to `event.startAt`.
- The deferred Access-Pass-Gated-Events plan composes naturally: instead of a parallel `accessPassGatedEvents` JSON column, the gating lives on `schedule[].isAccessPassGated`.

### Invitation card (templates)
- Wedding templates currently read `InvitationConfig.ceremonyDate/Time/receptionDate/Time` (free-text). Switch to formatting `schedule[role="ceremony"|"reception"]` via `formatInTimeZone`.
- Free-text fields kept as overrides only — if `ceremonyDate` is non-null, use it; else format from schedule. Migration path lets existing data display unchanged.

### Public event page schedule section
- Merge with `Event.schedule`. The current free-text `scheduleSection.items[]` becomes a fallback display layer over the typed schedule. New events use only the typed schedule; existing events render their free-text items until migration.

### Dashboard
- New "Schedule" section in the event editor (a single editor that the invitation panel + public page editor both reference).
- Wedding-specific fields move to "Add ceremony" / "Add reception" prefill buttons that populate a `schedule` entry with the right `role`.

---

## 4. Migration path

Two migrations:

1. **Additive** — adds `Event.schedule Json?`. No backfill; existing events have `schedule: null`.
2. **Backfill (data)** — for every Event with an `InvitationConfig`, populate `schedule` with up to two entries: ceremony + reception, drawn from `ceremonyStartAt`/`ceremonyVenue`/`ceremonyAddress` and `receptionStartAt`/`receptionVenue`/`receptionAddress`. Leave free-text `*Date` and `*Time` fields untouched (display-only overrides).

Once the new model is the source of truth on all render surfaces, the wedding-specific fields on `InvitationConfig` become deprecation candidates. They stay as nullable overrides initially; full removal requires a follow-up migration after we're confident no surface still reads them directly.

---

## 5. Task breakdown (sketch)

| # | Task | Depends on |
|---|---|---|
| 1 | Schema migration: add `Event.schedule Json?` + Zod schema | none |
| 2 | API: accept `schedule` on event update + return on read | 1 |
| 3 | Backfill: data migration for existing wedding events | 1, 2 |
| 4 | Pass card: read `schedule[role="reception"]` first, fall back to existing `resolvePassMoment` rungs | 3 |
| 5 | Invite email: switch payload to typed `schedule` | 3 |
| 6 | Invitation card templates: switch to schedule + free-text override | 3 |
| 7 | Public event page schedule: merge typed schedule with free-text fallback | 3 |
| 8 | Dashboard editor: schedule editor + wedding prefill buttons | 2 |
| 9 | Cleanup: remove `InvitationConfig.{ceremony,reception}*` after deprecation window | all |

Tasks 4–8 can parallelize after Task 3.

---

## 6. Cross-references

- **Access-Pass-Gated-Events plan** (`internal-docs/access-pass-gated-events-plan.md`): `accessPassGatedEvents` JSON column proposed there is **superseded** by `Event.schedule[].isAccessPassGated` here. When this plan revives, the access-pass-gated plan becomes a renaming exercise on a flag that already exists.
- **QR-code plan** (`internal-docs/qr-code-implementation-plan.md`): the Pass card's reception detection (`resolvePassMoment` in `_helpers.ts`) gains a higher-priority rung that consults `schedule[role="reception"]`. Existing rungs remain as fallback.

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backfill mis-populates entries for unusual wedding configs | Medium | Medium | Dry-run on staging snapshot first; surface "schedule was auto-populated" banner in dashboard so organizers verify before publishing |
| Free-text `ceremonyDate` etc. drift after migration | Low | Low | Display-layer reads typed schedule first; free-text only as override. Drift becomes invisible over time |
| Surface-by-surface migration leaves intermediate inconsistency | Medium | Medium | Each render task (4–7) ships behind a small read-side helper that prefers typed → falls back to legacy. No flag-day switch |
| Schedule editor UX exceeds estimate | Medium | Low | Reuse the access-pass-gated-events editor work (deferred but already planned) — same component shape |

---

## 8. Out of scope

- Per-guest gating (Guest A allowed at Reception only). Event-level gating only.
- Calendar-export per sub-event. Calendar export remains keyed on `Event.startAt/endAt`.
- Recurring events (every Wednesday for 6 weeks). Single-occurrence events only.
