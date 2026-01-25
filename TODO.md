# TODO List

Future enhancements and features for the Event Platform.

---

## High Priority

### Real-time RSVP Updates
- **Description:** Add real-time updates to the Invites Management panel so RSVP responses appear instantly without manual refresh
- **Approach:** Supabase Realtime subscriptions
- **Steps:**
  1. Enable Realtime on `Invite` and `RSVP` tables in Supabase dashboard
  2. Create Supabase client with realtime enabled
  3. Subscribe to table changes in InviteManager component
  4. Invalidate/refetch data on change events
- **Files:** `src/components/features/InviteManager/InviteManager.tsx`

---

## Medium Priority

*(Empty for now)*

---

## Low Priority

*(Empty for now)*

---

## Deferred (Data-Dependent)

### Analytics Phase 5: Derived Metrics
- **Description:** Add attendance confidence scores and cross-event benchmarks
- **Why Deferred:** Requires real platform data that doesn't exist yet
- **Prerequisites:**
  - 30+ events with Phase 4 tracking data
  - Historical RSVP → actual attendance records
  - 100+ events for meaningful benchmarks (categorized by type)
- **Features:**
  1. **Attendance Confidence Score** - Predict actual attendance from RSVPs
     - Formula derived from real data (e.g., `yes * 0.85 + maybe * 0.40`)
     - Requires tracking actual vs predicted attendance
  2. **Cross-Event Benchmarks** - Compare metrics against similar events
     - Requires event categorization (wedding, conference, party, etc.)
     - Statistical significance needed before showing comparisons
- **Important:** Do NOT show "below average" warnings without real benchmark data
- **Files:** `src/lib/analytics.ts`, `src/app/api/events/[id]/analytics/`
- **Reference:** `internal-docs/analytics-dashboard-implementation-plan.md`

---

## Completed

*(Move items here when done)*
