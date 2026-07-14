# Canonical Schedule — Source-of-Truth Consolidation

**Feature:** A single typed schedule on the Event row holds every sub-event's `{ label, startAt, venue, address, role? }`. All seven render surfaces (invite email, confirmation email, public event page, invitation card, Pass card, dashboard listings, calendar exports) derive from it. Wedding-specific timing fields on `InvitationConfig` are deprecated.

**Effort estimate:** ~1.5 dev weeks (raised from 1 after adding the temporal-segments surface, §3.6)
**Owner:** _TBD_
**Status:** **Deferred — gate: prod-verify PR #284.** Amended 2026-07-13 with the temporal-phase consumer, PR sequencing (§5), and backfill run discipline (§4).

---

## Status & phasing

The timezone groundwork is done: PRs #83–#86 shipped wall-clock-wins input end-to-end, and PR #284 extended the venue-timezone rule to the temporal *phase* system (venue-calendar "TODAY"/"yesterday" via `Intl`, plus a 6-hour assumed duration for events without `endAt`). The product rule is now explicit: **every temporal display is viewed from the venue's timezone, never the visitor's** — this refactor is what makes that rule derivable from one typed source instead of re-enforced per surface.

Remaining gate before starting: prod-verify #284 (venue-midnight "TODAY" flip + the 6h "Happening Now" window on a duplicated event).

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
- **The temporal system is blind to the day's shape.** The countdown strip's "Happening Now" (shared `TemporalHeroOverlay`, V2 + all V3) spans `startAt → endAt` as one block: a ceremony 10–12 + reception 4–11 day pulses "Happening Now" through the afternoon gap, and events without `endAt` need a hard-coded 6-hour assumption (`ASSUMED_EVENT_DURATION_MS`). Segment-aware states ("Ceremony underway", "Reception · 4:00 PM") need a typed sub-event list — the free-text `scheduleSection.items[].time` strings cannot drive UI state.

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
- Free-text fields become a **transitional shim, not a feature** (product decision 2026-07-13: free-text date/time was never well-thought-out and is slated for removal) — if `ceremonyDate` is non-null it still renders, so existing invitations display unchanged, but the editor stops offering the fields and they are removed in PR 6.
- The legitimate need free text served — formal invitation wording like "Four O'Clock in the Afternoon" — is met by a **formal formatter style** instead: e.g. `formatEventTimeFormal(date, timezone)` deriving spelled-out wording deterministically from the typed entry, offered as a wording-style toggle in the invitation editor. Style stays a rendering choice; the data stays typed.

### Public event page schedule section
- Merge with `Event.schedule`. The current free-text `scheduleSection.items[]` becomes a **legacy-only fallback**: it renders for existing events until they adopt the typed schedule, but the page editor stops offering free-text time entry once the schedule editor (PR 4) ships. New events are typed-only from day one.

### Dashboard
- New "Schedule" section in the event editor (a single editor that the invitation panel + public page editor both reference).
- Wedding-specific fields move to "Add ceremony" / "Add reception" prefill buttons that populate a `schedule` entry with the right `role`.

### Temporal phase system (countdown strip / "Happening Now") — NEW surface
- `TemporalProvider` gains optional `schedule: ScheduleEntry[]`; the hook derives `currentSegment` / `nextSegment` from the entries (all instant math — timezone-free; venue timezone only for calendar-day labels, per #284's `calendarDaysBetween`).
- Strip states become: before first entry → existing countdown; inside an entry → "**{label} underway**" live pill; in a gap between entries → "**Next: {label} · {time}**" (a next-up mini-countdown — better than pulsing through a 4-hour gap); after the last entry's end → post-event.
- Fallback ladder for `effectiveEndAt`: explicit `Event.endAt` → last schedule entry's `endAt` (or start + assumption) → `startAt + ASSUMED_EVENT_DURATION_MS`. The 6-hour assumption drops from "the rule for open-ended events" to the last rung.
- **No-regression guarantee:** events with no typed entries keep today's whole-span behavior exactly. Segment states activate only when entries exist.
- Multi-day grouping in the schedule display groups entries by **venue** calendar day (reuse `calendarDaysBetween` from `use-event-temporal.ts`), replacing the free-text `groups[].date` labels for typed entries.

---

## 4. Migration path

### 4.1 Schema migration (DDL, additive)

Adds `Event.schedule Json?`. No backfill; existing events have `schedule: null`. Nullable + additive = zero risk to existing reads.

Process (per project migration workflow — migrations are **manual**, no CI automation):

```bash
# locally, against the dev DB — NEVER --create-only (crashes the dev server, P2022)
npx prisma migrate dev --name add_event_schedule
npm run db:generate
```

The operator runs `npx prisma migrate deploy` against prod **before** the schema PR merges, so the deployed code never races the column.

### 4.2 Backfill (data migration, run once)

For every Event with an `InvitationConfig`, populate `schedule` with up to two entries — ceremony (`role: "ceremony"`, from `ceremonyStartAt`/`ceremonyVenue`/`ceremonyAddress`) and reception (`role: "reception"`, from `receptionStartAt`/…) — skipping whichever timing fields are null. Free-text `*Date`/`*Time` fields are left untouched (they remain display-only overrides). Entry ids via `crypto.randomUUID()`.

Ship it as a Node script (not raw SQL) with the safe destructive-op run sequence:

1. **Target banner** — script prints the DB host/name it's about to touch and requires confirmation.
2. **Idempotent by construction** — skips any event whose `schedule` is already non-null, so re-runs are safe.
3. **`--dry-run`** — report-only: how many events would gain entries, per-role counts, and any event whose `InvitationConfig` timing looks inconsistent (e.g. reception before ceremony) listed for manual review.
4. **`--event-id <id>` canary** — backfill one known event; verify its dashboard + invite render before proceeding.
5. **Full run.**
6. **`--dry-run` again — must report 0 remaining.**

Post-backfill: the dashboard shows a one-time "Schedule was auto-populated from your invitation settings — please verify" banner on affected events, so organizers confirm before the typed data drives guest-facing surfaces.

### 4.3 Deprecation — free-text date/time is END-OF-LIFE, not an override

Product decision (2026-07-13): free-text date/time entry was never well-thought-out and is to be **nixed**, not preserved as an override. The end state has **no free-text date/time anywhere** — all display derives from typed entries + formatter styles (including the formal-wording style, §3.3).

Sequenced as: (a) editors stop *offering* free-text inputs as soon as their typed replacement ships (PR 4 for the page schedule, the invitation panel alongside); (b) render fallbacks keep legacy rows displaying during the window, with logging on legacy-path reads; (c) PR 6 removes the reads, then the columns/fields — `InvitationConfig.{ceremonyDate,ceremonyTime,receptionDate,receptionTime,...}` and free-text `scheduleSection.items[].time` — after the grep-audit confirms zero remaining consumers.

---

## 5. PR sequencing

One PR per row; merged strictly in order within a lane (the main-branch ruleset requires up-to-date branches + green checks, so sequential siblings need update-branch + re-run — never `--admin`). Every consumer PR (C-lane) ships a read-side helper that prefers typed schedule → falls back to legacy, so there is no flag-day and each PR is independently revertible.

| PR | Contents | Depends on | Notes |
|----|----------|------------|-------|
| **PR 0** | Formatter centralization (§9): route all renderers through `formatEventDate*` helpers in `lib/utils`; lint guard against raw `Intl.DateTimeFormat`/`toLocale*` in renderer files | none — **can ship today**, independent of the gate | Hardens the venue-timezone rule the rest builds on; ~12 files, mechanical |
| **PR 1** | Schema: `Event.schedule Json?` migration (§4.1) + `scheduleEntrySchema` Zod in `src/schemas/` + API accept/return on event read/update | gate lifted | Authorization + validation at API boundary as usual |
| **PR 2** | Backfill script + docs (§4.2); operator runs the sequence after merge | PR 1 | Banner UI included here |
| **PR 3a** | Pass card: `schedule[role="reception"]` as highest `resolvePassMoment` rung | PR 2 | C-lane — 3a–3d parallelize; if two need a shared new helper, duplicate it byte-identically in both branches (parallel-PR shared-file rule) |
| **PR 3b** | Invite + confirmation emails: typed `schedule` payload | PR 2 | |
| **PR 3c** | Invitation card templates: schedule-derived dates, free-text as override | PR 2 | |
| **PR 3d** | Public page schedule section: typed entries render first, free-text items as fallback; venue-day grouping | PR 2 | |
| **PR 4** | Dashboard schedule editor + ceremony/reception prefill buttons; invitation panel + page editor reference it; **free-text date/time inputs removed from editors** (existing values still render via fallback); formal-wording style toggle (§3.3) | PR 1 (parallel with 3-lane) | Largest UX surface; ThemePicker toggle pattern for controls |
| **PR 5** | Temporal segments (§3.6): `TemporalProvider` schedule input, `currentSegment`/`nextSegment`, strip states, `effectiveEndAt` ladder | PR 2 + #284 prod-verified | Prod QA via duplicated event with 2 entries + a gap |
| **PR 6** | Free-text end-of-life (§4.3): remove `InvitationConfig.{ceremony,reception}*` reads then columns, and free-text `scheduleSection.items[].time` from the page-config schema | all above + deprecation window | Separate schema migration; grep-audit + legacy-read logging must be quiet first |

Rough sizing: PR 0 and PR 1 a day together; PR 2 a day including the prod run; the 3-lane two days across the four PRs; PR 4 two days; PR 5 a day; PR 6 half a day after the window. ≈ 1.5 dev weeks.

---

## 6. Cross-references

- **Access-Pass-Gated-Events plan** (`internal-docs/access-pass-gated-events-plan.md`): `accessPassGatedEvents` JSON column proposed there is **superseded** by `Event.schedule[].isAccessPassGated` here. When this plan revives, the access-pass-gated plan becomes a renaming exercise on a flag that already exists.
- **QR-code plan** (`internal-docs/qr-code-implementation-plan.md`): the Pass card's reception detection (`resolvePassMoment` in `_helpers.ts`) gains a higher-priority rung that consults `schedule[role="reception"]`. Existing rungs remain as fallback.

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backfill mis-populates entries for unusual wedding configs | Medium | Medium | Dry-run on staging snapshot first; surface "schedule was auto-populated" banner in dashboard so organizers verify before publishing |
| Free-text `ceremonyDate` etc. drift after migration | Low | Low | Free text is end-of-life (§4.3): editors stop offering it at PR 4, reads are logged during the window, PR 6 removes it entirely |
| Surface-by-surface migration leaves intermediate inconsistency | Medium | Medium | Each render task (4–7) ships behind a small read-side helper that prefers typed → falls back to legacy. No flag-day switch |
| Schedule editor UX exceeds estimate | Medium | Low | Reuse the access-pass-gated-events editor work (deferred but already planned) — same component shape |
| Segment-aware strip regresses events without typed entries | Low | High | Hard rule in PR 5: no entries → byte-identical whole-span behavior; regression tests assert both modes (calendar-day assertions must pin `now` + timezone via `getEventTemporalState` opts — live-clock fixtures flip with the hour the suite runs, see #284's CI failure) |
| Backfill touches wrong environment | Low | High | §4.2 target banner + dry-run/canary/full/dry-run(=0) sequence |

---

## 8. Out of scope

- Per-guest gating (Guest A allowed at Reception only). Event-level gating only.
- Calendar-export per sub-event. Calendar export remains keyed on `Event.startAt/endAt`.
- Recurring events (every Wednesday for 6 weeks). Single-occurrence events only.

---

## 9. PR 0: centralize date formatting in `src/lib/utils.ts`

> **Promoted from follow-up to PR 0 of the chain (§5)** — it is independent of the gate, mechanically simple, and enforces the venue-timezone product rule that the rest of the refactor builds on.

PRs #83 and #84 fix timezone correctness one render surface at a time — each invitation-card template, hero variant, etc. carries its own `Intl.DateTimeFormat` configuration with the `timeZone` option threaded through props. This works but invites future drift: a new template author who copy-pastes a formatting block can omit `timeZone` and reintroduce the viewer-local bug.

A cleaner long-term pattern is for **all renderers to call shared formatters from `src/lib/utils.ts`**:

```ts
// already exist; renderers should use these
formatEventDate(date, timezone)         // "Aug 22, 2026"
formatEventDateLong(date, timezone)     // "Saturday, August 22, 2026"
formatEventTime(date, timezone)         // "10:00 PM"
formatEventDateTimeLong(date, timezone) // "Saturday, August 22, 2026 at 10:00 PM"
```

The mass-refactor (replace each renderer's hand-rolled `new Intl.DateTimeFormat(…)` with the shared helper) touches ~12 files but is mechanically simple. Add an ESLint rule (or a code-review checkpoint) to catch any new `Intl.DateTimeFormat` / `toLocaleDateString` / `toLocaleTimeString` calls in renderer files that aren't routed through the helpers — that's the durable enforcement. One deliberate exemption: `getCalendarParts` in `src/hooks/use-event-temporal.ts` uses `Intl.DateTimeFormat` for calendar *math* (not display formatting) and stays as-is.

This PR is independent of the schedule-source-of-truth refactor (§4–8) and of the #284 prod-verification gate. It can ship today.
