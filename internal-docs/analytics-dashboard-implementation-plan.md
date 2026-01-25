# Analytics Dashboard - Implementation Plan

> **Goal:** Build an insight-driven analytics dashboard incrementally, using existing data infrastructure first, then expanding tracking as needed.

---

## Design Principles (Unchanged)

1. **Insight-first** - Answer "Is my event healthy?" not "Here's raw data"
2. **Progressive disclosure** - High-level first, details on demand
3. **Build on existing data** - Use invite/RSVP/email tracking already in DB
4. **Ship incrementally** - Each phase delivers standalone value

---

## Phase 1: Executive Snapshot (MVP)

**Timeline:** 1-2 weeks
**Dependencies:** None (uses existing data)

### KPI Cards (4 metrics)

| Metric | Source | Calculation |
|--------|--------|-------------|
| **Total RSVPs** | `RSVP.count()` | Count where response = YES |
| **Response Rate** | `RSVP.count / Invite.count` | Percentage of invites that responded |
| **Expected Attendance** | `SUM(guestCount) where response=YES` | Total confirmed guests |
| **Days Until Event** | `event.startAt - now()` | Countdown |

### API Endpoint

```
GET /api/events/[id]/analytics/snapshot
```

**Response:**
```typescript
type SnapshotResponse = {
  totalRsvps: number;
  totalInvites: number;
  responseRate: number;        // 0-100
  expectedAttendance: number;
  maybeCount: number;
  declinedCount: number;
  daysUntilEvent: number | null; // null if past
  lastUpdated: string;          // ISO timestamp
}
```

### Database Query (Single Query)

```sql
SELECT
  COUNT(DISTINCT r.id) FILTER (WHERE r.response = 'YES') as yes_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.response = 'MAYBE') as maybe_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.response = 'NO') as no_count,
  SUM(r.guest_count) FILTER (WHERE r.response = 'YES') as expected_attendance,
  COUNT(DISTINCT i.id) as total_invites,
  e.start_at
FROM events e
LEFT JOIN invites i ON i.event_id = e.id
LEFT JOIN rsvps r ON r.event_id = e.id
WHERE e.id = $1
GROUP BY e.id, e.start_at;
```

### UI Components

```
src/components/features/Analytics/
├── AnalyticsSnapshot.tsx      # Main dashboard widget
├── KPICard.tsx                # Reusable stat card
├── TrendIndicator.tsx         # Up/down arrow with delta
└── index.ts
```

**KPICard Props:**
```typescript
type KPICardProps = {
  label: string;
  value: number | string;
  format?: 'number' | 'percent' | 'days';
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  subtitle?: string;
}
```

### Route

```
/dashboard/events/[id]/analytics
```

Or embed in existing event detail page as a collapsible section.

---

## Phase 2: RSVP Funnel (Realistic)

**Timeline:** 1-2 weeks
**Dependencies:** Phase 1

### Simplified 3-Stage Funnel (Based on Actual Data)

| Stage | Source | Already Tracked? |
|-------|--------|------------------|
| **Invited** | `Invite.count()` | ✅ Yes |
| **Opened** | `Invite.openedAt IS NOT NULL` | ✅ Yes |
| **Responded** | `RSVP.count()` | ✅ Yes |

> **Note:** "Page Viewed" and "RSVP Started" require client-side tracking (Phase 4). Don't block on this.

### Funnel Visualization

Horizontal bar chart showing:
```
Invited     ████████████████████████████ 100 (100%)
Opened      ██████████████████           72 (72%)
Responded   ████████████                 48 (48%)
```

Drop-off percentages between stages:
- Invited → Opened: 28% drop-off
- Opened → Responded: 33% drop-off

### API Endpoint

```
GET /api/events/[id]/analytics/funnel
```

**Response:**
```typescript
type FunnelResponse = {
  stages: {
    name: 'invited' | 'opened' | 'responded';
    count: number;
    percentage: number; // relative to first stage
  }[];
  dropoffs: {
    from: string;
    to: string;
    rate: number; // percentage lost
  }[];
}
```

### UI Component

```
src/components/features/Analytics/
├── RSVPFunnel.tsx             # Funnel visualization
├── FunnelStage.tsx            # Single stage bar
└── DropoffIndicator.tsx       # Shows % lost between stages
```

---

## Phase 3: Time Intelligence

**Timeline:** 1 week
**Dependencies:** Phase 1

### RSVP Velocity Chart

Line chart showing RSVPs over time:
- X-axis: Days since invite sent (or absolute dates)
- Y-axis: Cumulative RSVPs

### Momentum Indicator

Compare last 7 days vs previous 7 days:
```typescript
type MomentumResponse = {
  current7Days: number;
  previous7Days: number;
  trend: 'accelerating' | 'steady' | 'slowing';
  percentChange: number;
}
```

**Insight text examples:**
- "RSVPs accelerating: +40% vs last week"
- "RSVPs slowing: -25% vs last week"
- "Steady pace: 12 RSVPs/week"

### API Endpoint

```
GET /api/events/[id]/analytics/velocity
```

**Response:**
```typescript
type VelocityResponse = {
  daily: { date: string; count: number; cumulative: number }[];
  momentum: MomentumResponse;
}
```

### Chart Library

Use **Recharts** (already common in Next.js ecosystems):
```bash
npm install recharts
```

Lightweight, composable, SSR-friendly.

---

## Phase 4: Client-Side Tracking (Future)

**Timeline:** 2-3 weeks
**Dependencies:** Phases 1-3 complete, product validation

### When to Build This

Only after validating that:
1. Users actively use the Phase 1-3 dashboard
2. Users ask "why are people dropping off?"
3. Funnel drop-offs are significant enough to investigate

### Tracking Events to Add

| Event | Trigger | Data |
|-------|---------|------|
| `page_view` | Event page load | eventId, source |
| `rsvp_form_started` | Form interaction | eventId, field |
| `rsvp_form_abandoned` | Leave without submit | eventId, lastField |
| `section_viewed` | Scroll into view | eventId, sectionId |

### Implementation Options

**Option A: PostHog (Recommended)**
- Self-hostable, privacy-friendly
- Session replay for debugging
- Feature flags included

**Option B: Custom tracking table**
```prisma
model AnalyticsEvent {
  id        String   @id @default(cuid())
  eventId   String   // FK to Event
  type      String   // page_view, rsvp_started, etc.
  timestamp DateTime @default(now())
  data      Json?    // Flexible payload
  sessionId String?  // Anonymous session

  @@index([eventId, type])
  @@index([timestamp])
}
```

### Privacy Considerations

- No PII in analytics events
- Session IDs are anonymous (not tied to user accounts)
- Data retention: 90 days default
- GDPR: Analytics opt-out via cookie consent

---

## Phase 5: Derived Metrics (Post-Validation)

**Timeline:** After Phase 4 data accumulates
**Dependencies:** Phase 4, 30+ events with data

### Attendance Confidence Score

Only build this after collecting:
- Historical RSVP → actual attendance data
- "Maybe" → actual attendance conversion rates

**Formula (example):**
```
confidence = (yes_count * 0.85) + (maybe_count * 0.40)
```

Weights derived from actual platform data, not assumptions.

### Benchmarks

Only meaningful after:
- 100+ events on platform
- Events categorized by type (wedding, conference, party)
- Statistical significance achieved

**Do not show "below average" warnings without real benchmark data.**

---

## Technical Architecture

### File Structure

```
src/
├── app/
│   ├── api/events/[id]/analytics/
│   │   ├── snapshot/route.ts
│   │   ├── funnel/route.ts
│   │   └── velocity/route.ts
│   └── (auth)/dashboard/events/[id]/
│       └── analytics/page.tsx
├── components/features/Analytics/
│   ├── AnalyticsSnapshot.tsx
│   ├── KPICard.tsx
│   ├── RSVPFunnel.tsx
│   ├── VelocityChart.tsx
│   ├── MomentumIndicator.tsx
│   └── index.ts
└── lib/
    └── analytics.ts           # Query helpers
```

### Caching Strategy

```typescript
// API route with revalidation
export const revalidate = 60; // 1 minute cache

// Or use unstable_cache for finer control
import { unstable_cache } from 'next/cache';

const getSnapshot = unstable_cache(
  async (eventId: string) => { /* query */ },
  ['analytics-snapshot'],
  { revalidate: 60, tags: [`event-${eventId}`] }
);
```

### Authorization

All analytics endpoints must verify:
1. User is authenticated
2. User owns the event OR is org member

```typescript
// In each route
const user = await verifyAuth(request);
const event = await db.event.findUnique({
  where: { id: eventId },
  select: { organizerId: true }
});
if (event.organizerId !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## What We're NOT Building (Scope Control)

| Feature | Reason |
|---------|--------|
| Real-time WebSocket updates | Overkill for event dashboards; 1-min cache is fine |
| Device/browser breakdown | No tracking infrastructure; low value for organizers |
| Geographic heatmaps | Requires geo-IP; privacy concerns; low MVP value |
| A/B testing framework | Separate product; don't conflate |
| LLM-generated insights | Premature; rule-based text first |
| Cross-event benchmarks | No data yet; would be misleading |
| Drag-and-drop widget customization | Adds complexity; opinionated layout is fine |

---

## Success Metrics

The analytics dashboard succeeds if:

1. **Adoption:** 60%+ of event creators view analytics at least once
2. **Retention:** Users return to check analytics 3+ times before event
3. **Action:** Users send reminder emails after seeing low response rates
4. **Reduced support:** Fewer "how many RSVPs do I have?" questions

---

## Implementation Checklist

### Phase 1 (MVP)
- [ ] Create `/api/events/[id]/analytics/snapshot` endpoint
- [ ] Build `KPICard` component
- [ ] Build `AnalyticsSnapshot` component
- [ ] Add analytics section to event detail page
- [ ] Add loading skeleton states
- [ ] Write unit tests for calculations

### Phase 2 (Funnel)
- [ ] Create `/api/events/[id]/analytics/funnel` endpoint
- [ ] Build `RSVPFunnel` component
- [ ] Add drop-off percentage display
- [ ] Add empty state for events with no invites

### Phase 3 (Velocity)
- [ ] Install Recharts
- [ ] Create `/api/events/[id]/analytics/velocity` endpoint
- [ ] Build `VelocityChart` component
- [ ] Build `MomentumIndicator` component
- [ ] Add insight text generation (rule-based)

### Phase 4+ (Deferred)
- [ ] Evaluate PostHog vs custom tracking
- [ ] Implement page view tracking
- [ ] Implement RSVP form interaction tracking
- [ ] Build extended funnel with new data

---

## Summary: Original Doc vs This Plan

| Aspect | Original Doc | This Plan |
|--------|--------------|-----------|
| Funnel stages | 5 stages | 3 stages (what we can track today) |
| Metrics defined | Vague composites | Concrete formulas |
| Benchmarks | "Against similar events" | Deferred until data exists |
| LLM insights | V3 feature | Out of scope |
| Segmentation | Complex (6 dimensions) | Deferred until tracking exists |
| Implementation detail | None | API specs, DB queries, components |
| What NOT to build | Not mentioned | Explicit scope boundaries |

---

**This plan prioritizes shipping value over comprehensive coverage. Expand based on user feedback, not assumptions.**
