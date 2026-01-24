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

## Completed

*(Move items here when done)*
