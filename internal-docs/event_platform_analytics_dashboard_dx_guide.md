# Event Platform Analytics Dashboard

> **Goal:** Design and implement a premium, insight‑driven analytics dashboard that helps event organizers *decide what to do next*, not just observe metrics.

This document serves as a **DX‑friendly, actionable reference** for engineers and designers building the analytics dashboard for the Event Platform.

---

## 1. Design Principles

### 1.1 Insight‑First, Not Metric‑First
- Avoid raw data dumps
- Prefer *interpreted metrics* over atomic counts
- Default views should answer **"Is my event healthy?"**

### 1.2 Opinionated by Default
- One canonical dashboard view
- No free‑form widget rearranging (early versions)
- Filters and drill‑downs are contextual, not global

### 1.3 Progressive Disclosure
- Show high‑level insights first
- Reveal complexity only when the user asks

---

## 2. Dashboard Information Architecture

The dashboard is organized into **three logical layers**.

### Layer 1 — Executive Snapshot (Above the Fold)

**Purpose:** Immediate understanding of event status.

**Components:**
- KPI cards (4–6 max)
- Large numerals, minimal labels
- Lightweight trend indicators

**Recommended KPIs:**
- Total RSVPs
- RSVP Conversion Rate
- Attendance Projection
- Engagement Score
- Drop‑off Risk Indicator
- Days Until Event

**Implementation Notes:**
- Server‑computed aggregates (no client math)
- Cache aggressively (event‑level TTL)

---

### Layer 2 — Behavioral Insights

**Purpose:** Explain *why* metrics look the way they do.

#### RSVP Funnel (Event‑Specific)

Canonical stages:
1. Event Page Viewed
2. Invite Opened
3. RSVP Started
4. RSVP Completed
5. Attended (post‑event)

**Features:**
- Percentage drop‑offs between stages
- Benchmarks against similar events
- Time‑based comparison (last 7 / 14 days)

**DX Tip:**
- Model funnel stages as enums, not inferred states

---

### Layer 3 — Deep Dives (Collapsed by Default)

**Purpose:** Power‑user exploration without clutter.

**Suggested Sections:**
- Audience Segments
- Traffic Channels
- Time‑Based Trends
- Geography (coarse)
- Device Type

**UX Rule:**
- No section should exceed one screen height

---

## 3. Event‑Native Analytics (Differentiators)

### 3.1 Time Intelligence

Events are time‑boxed. Analytics must reflect urgency.

**Metrics:**
- RSVP Velocity (per day)
- Expected vs Actual RSVPs
- Last‑N‑Days Momentum

**Insights Examples:**
- "RSVPs are tracking 10% below expected pace"
- "42% of RSVPs historically arrive in the final 10 days"

---

### 3.2 Audience Segmentation (Non‑Creepy)

Avoid demographic overreach.

**High‑Value Segments:**
- Invitees vs Organic Visitors
- First‑Time vs Returning Visitors
- Local vs Out‑of‑Town

**Implementation:**
- Segment toggles should update *all* charts in sync

---

### 3.3 Channel Attribution (Lightweight)

Not GA‑level attribution. Keep it honest.

**Supported Channels:**
- Email
- Direct Link
- Messaging Apps (SMS / WhatsApp)
- Social

**Primary Question Answered:**
> What actually brought people here?

---

## 4. Opinionated Platform Metrics (Your IP)

These metrics should be **owned and defined** by the platform.

### 4.1 Engagement Score
Composite metric combining:
- Page views
- Time on page
- Interaction events

### 4.2 Attendance Confidence
Weighted projection based on:
- RSVP type (Yes / Maybe)
- Historical attendance rates

### 4.3 Drop‑off Risk Index
Heuristic combining:
- Funnel friction
- RSVP velocity slowdown
- Time remaining

---

## 5. Narrative Insights Layer

Static charts are not enough.

**System‑Generated Annotations:**
- "Reminder email recovered 18% drop‑off"
- "Mobile users convert 22% better"
- "RSVPs slowed after Day 14"

**Future‑Ready:**
- Rule‑based insights → LLM summaries

---

## 6. Visual & Interaction Guidelines

### 6.1 Visual Language
- Neutral background
- Single accent color (semantic use only)
- No rainbow charts

### 6.2 Typography
- Large numerals for KPIs
- Small explanatory labels
- Clear vertical rhythm

### 6.3 Motion
- Subtle transitions on filter change
- Skeleton loaders instead of spinners
- Hover states that explain, not distract

---

## 7. Technical Implementation Notes

### Data Layer
- Pre‑aggregate metrics per event
- Avoid client‑side recomputation
- Store derived metrics explicitly

### Performance
- Cache dashboard payloads
- Separate real‑time vs historical queries

### Security
- Event‑scoped access control
- No cross‑event aggregation leakage

---

## 8. Phased Rollout Strategy

**V1 (MVP):**
- Executive Snapshot
- RSVP Funnel
- Basic Time Series

**V2:**
- Benchmarks
- Narrative Insights
- Segmentation

**V3:**
- Predictive nudges
- AI summaries
- Smart recommendations

---

## 9. Success Criteria

The dashboard succeeds if:
- Organizers act faster
- Fewer support questions are asked
- Users reference *platform metrics* by name

> **North Star:** Clarity under pressure.

---

**This document is a living reference. Iterate as product insight deepens.**

