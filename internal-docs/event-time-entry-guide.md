# Event Time Entry — Quick-Start Guide

**Audience:** Organizers entering times for events; developers maintaining time-related code.
**Status:** Reflects platform behavior after PRs #83 (input boundary) and #84 (render surfaces).

This is a quick-reference for how dates and times flow through the platform: what an organizer enters, where it lives, and what guests see. For the longer-term consolidation plan, see [`canonical-schedule-source-of-truth.md`](./canonical-schedule-source-of-truth.md).

---

## Mental model: wall-clock wins

The organizer types **what the clock reads at the venue**. The platform stores UTC behind the scenes; every guest sees the same wall-clock regardless of their viewing location.

The event's **timezone field is the interpreter** — it tells the platform "this 6:00 PM means 6:00 PM at the venue." Changing the timezone in the form doesn't shift the displayed wall-clock; only the underlying UTC instant shifts.

---

## 1. Creating an event

**Surface:** `/dashboard/events/new` (`EventForm.tsx`)

| Field | Input type | What to enter |
|---|---|---|
| **Timezone** | dropdown | The event's location TZ (e.g., `America/Edmonton`). Default: `UTC`. |
| **Start date & time** | `<input type="datetime-local">` | Wall-clock in the timezone above |
| **End date & time** | `datetime-local` (optional) | Wall-clock |
| **RSVP deadline** | `datetime-local` (optional) | Wall-clock |

**On save:**
- Form pulls each wall-clock string + the timezone
- Converts to UTC via `fromDatetimeLocalInTz(value, timezone)` (`src/lib/datetime.ts`)
- Sends UTC ISO to API; DB stores UTC instants

**Tip:** Set the timezone **first**. Every datetime field below reads it.

---

## 2. Editing an event

**Surface:** `/dashboard/events/[id]/edit` (same `EventForm`)

The form loads the stored UTC, formats it as wall-clock in the event's stored timezone for display in each input via `toDatetimeLocalInTz(utc, timezone)`. Round-trips losslessly: load → display → save with no edits → identical UTC.

---

## 3. Wedding invitation panel

**Surface:** `/dashboard/events/[id]/invitation`

Reads the event row's timezone (organizer doesn't pick it again here).

| Field | Input type | What to enter |
|---|---|---|
| **Ceremony date & time** | `datetime-local` | Wall-clock in event TZ |
| **Reception date & time** | `datetime-local` | Wall-clock in event TZ |

These persist on `InvitationConfig.ceremonyStartAt` / `receptionStartAt` as UTC instants.

**Downstream behavior:**
- **Access Pass card** uses the **reception** time as the gated moment when set; falls back to `event.startAt` otherwise (per `resolvePassMoment` in `src/app/invite/pass/[passId]/_helpers.ts`).
- **Invite email date line** uses reception when set; falls back to `event.startAt`.

---

## 4. Public event page — schedule section

**Surface:** the page editor's "Schedule" section.

> ⚠️ **Not yet timezone-aware.** Schedule items here use free-text strings:
> ```ts
> { time: "6:00 PM", title: "Reception", location: "...", description: "..." }
> ```
> They display verbatim — no UTC conversion, no timezone interpretation. If you change the event's timezone later, these strings don't update.
>
> Treat them as **descriptive copy**, not canonical timestamps. Keep them in sync with the canonical typed times yourself.

This is the fragmentation the deferred [`canonical-schedule-source-of-truth.md`](./canonical-schedule-source-of-truth.md) refactor consolidates.

---

## What guests see — every render surface, event TZ

| Surface | Source data | Formatter |
|---|---|---|
| **Public event page (hero)** | `event.startAt + event.timezone` | `Intl.DateTimeFormat({ timeZone })` |
| **Public event page (RSVP deadline)** | `event.rsvpDeadline + event.timezone` | `resolveRsvpDeadlineDisplay` (`src/lib/utils.ts`) |
| **Invite email** (date/time lines) | event-level + `InvitationConfig.{ceremony,reception}*` | `formatInTimeZone` (`date-fns-tz`) |
| **Confirmation email** | acknowledgment only — no event date | — |
| **Invitation card** (12 templates) | `InvitationData.timezone` | `Intl.DateTimeFormat({ timeZone })` or `formatEventDateLong` |
| **Access Pass card** | `event.timezone`; reception preferred | `formatEventDateLong` / `formatEventTime` |

All formatters route through helpers in `src/lib/utils.ts` and `src/lib/datetime.ts`. None call `toLocaleDateString` / `Intl.DateTimeFormat` without a `timeZone` option in user-facing surfaces.

---

## Quick reference

For organizers:

1. **Set the timezone first** when creating an event. Every datetime field reads it.
2. **Type wall-clock as it appears at the venue.** Don't mentally convert to UTC.
3. **Changing the timezone after entering times** doesn't shift the displayed values — only re-interprets them.
4. **Wedding events**: enter ceremony + reception in the invitation panel. The Pass card defaults to reception.
5. **Schedule section** on the public page is free-text today. Type strings in their final form (e.g. `"6:00 PM"`); update them manually if event details change.

For developers:

- **Input boundary helpers:** `toDatetimeLocalInTz` / `fromDatetimeLocalInTz` in `src/lib/datetime.ts`.
- **Display helpers:** `formatEventDate*` family in `src/lib/utils.ts`. All accept `(date, timezone)`.
- **RSVP deadline helper:** `resolveRsvpDeadlineDisplay(override, iso, timezone)` for hero variants.
- **Required pattern:** props that drive datetime rendering must accept a non-optional `timezone: string`. Fallbacks (`?? "UTC"`) belong at the top of the data pipeline (one place per template), never at the leaf renderer.

---

## Known gotchas

| Gotcha | Why | Fix horizon |
|---|---|---|
| `InvitationConfig.ceremonyDate` / `ceremonyTime` as free-text strings exist alongside the typed `ceremonyStartAt` timestamp | Some invitation-card templates render the strings; they don't auto-derive from the timestamp | Consolidation refactor |
| Schedule section items are free-text — independent of any typed datetime | Schema is `time: z.string()`; no source-of-truth coupling | Consolidation refactor |
| Future renderers might call `Intl.DateTimeFormat` / `toLocaleDateString` without a `timeZone` option and reintroduce viewer-local bugs | No ESLint rule enforces threading; convention is documented but not automated | Add ESLint rule (deferred §9) |

---

## See also

- [`canonical-schedule-source-of-truth.md`](./canonical-schedule-source-of-truth.md) — the deferred refactor that consolidates the fragmented model: typed `Event.schedule` as the single source of truth for sub-event timing; eliminates the wedding-specific `InvitationConfig.{ceremony,reception}*` fields.
- [`access-pass-gated-events-plan.md`](./access-pass-gated-events-plan.md) — superseded by the consolidation plan; kept for design reference.
- [`qr-code-implementation-plan.md`](./qr-code-implementation-plan.md) — Pass card design, including `resolvePassMoment` priority ladder.
- `src/lib/datetime.ts` — input-boundary helpers (PR #83).
- `src/lib/utils.ts` — display formatters and `resolveRsvpDeadlineDisplay` (PR #84 simplify).
