# Featured Events Section on Landing Page — Implementation Plan

**Feature:** Admin-curated featured events rendered in a single lane on the public landing page (`/`), plus a supplementary random "Discover more" lane below sourced from the broader public event pool.
**Scope:** Forward-looking, post-GA. Assumes a healthy pool of public events exists by ship date. No per-category lanes, no self-featuring by organizers, no scheduled featuring, no analytics instrumentation — all deferred to §8.
**Effort estimate:** ~3 dev days across 5 small PRs.
**Owner:** _TBD_
**Status:** Draft

---

## 1. Goals and Non-Goals

**Goals**

- A visible, admin-curated "Featured Events" lane on the landing page (`/`) that shows the platform's best work to unauthenticated visitors.
- A supplementary random "Discover more events" lane below, sourced from the public event pool and excluding whatever is already featured. Provides breadth for SEO and variety for returning visitors.
- Admin-only curation: toggling "Feature this event" and reordering featured events happens in the existing `/efx-ctrl` admin surface. Organizers cannot self-feature.
- Featured eligibility is strictly `visibility === "PUBLIC"` + `status === "PUBLISHED"`. UNLISTED, PRIVATE, DRAFT, or CANCELLED events are rejected at the API boundary.
- Featured events automatically stop rendering after their end date (`endAt < now()`) via query filter — no stale "last weekend's wedding" on the homepage.
- Landing page is server-rendered for SEO; hero images respect the `CLAUDE.md` LCP budget (< 2.5s).
- Creation-flow and event-settings copy makes the default visibility (PUBLIC) legible to organizers, even though this plan does not add new settings — see §2.6.

**Non-Goals (for this plan)**

- **Per-category featured lanes** (Weddings / Conferences / Parties). One lane for the MVP; category splits deferred.
- **Scheduled featuring** ("feature this event starting Monday"). Curation is immediate-effect only.
- **Organizer self-feature**. Hard no for MVP — anti-gaming.
- **Analytics instrumentation** (impressions, click-through, time-on-card).
- **A/B testing of slots, paid/sponsored placements**. Separate product question.
- **Discover-lane personalization** (based on viewer history, location, etc.). Random with a cached seed is MVP; personalized ranking is a later project.
- **Featured-event notifications to organizers** ("your event was featured!"). Nice touch but not a blocker.
- **Random fallback inside the featured lane**. If admins haven't curated anything, the featured section hides entirely — see §2.4.

---

## 2. Architectural Decisions

### 2.1 Reuse the existing `Event.visibility` + `Event.status` model

`Event.visibility` is already an enum (`PUBLIC` | `UNLISTED` | `PRIVATE`, default `PUBLIC`) at `prisma/schema.prisma:117`. `Event.status` is also already present (`DRAFT` | `PUBLISHED` | `CANCELLED` | `COMPLETED`). The public `/events` listing at `src/app/(marketing)/events/page.tsx` already filters on visibility. No prerequisite migration, no organizer-facing UI changes for visibility — this plan is strictly additive over the existing model.

### 2.2 Featured state lives on `Event`, not in a side table

Two new nullable fields on `Event`:

- `featuredAt DateTime?` — null means not featured; non-null timestamp records when featuring happened.
- `featuredOrder Int?` — position within the featured lane (lower = earlier). Allowed to have gaps; admin UI enforces uniqueness on write.

**Why not a `FeaturedEvent` join table?** A join table earns its keep when (a) multiple featured contexts exist (homepage vs. category page vs. partner site), (b) history matters (who featured this, when, unfeatured reason), or (c) many-to-many semantics apply. None of those hold for MVP: one landing page, no history requirement, 1:1 event-to-featured relationship. Fields on `Event` keep the query shape trivial and avoid a join on a hot landing-page path.

If future requirements introduce per-context featuring (e.g., "featured on the Canadian homepage only"), the fields can be deprecated in favor of a join table — that's a one-migration refactor when the need arrives.

### 2.3 Auto-expiry by query filter, not by cron

Featured events stop appearing on the landing page once `endAt < now()` (or `status === "COMPLETED"`). This is enforced at the landing-page query layer, not by a background job that nulls out `featuredAt`. Advantages:

- No cron dependency.
- Re-featuring after a date adjustment is automatic.
- Admin can see "this event was featured until it ended" state by reading `featuredAt` without ambiguity.

Events with `endAt === null` (open-ended events) stay featured until the admin unfeatures them explicitly.

### 2.4 No random fallback inside the featured lane

If admins have curated zero public featured events, the featured **section hides entirely** — the landing page renders without it. It does not fall back to "let's just pick some at random" because:

- That dilutes the curation signal organizers and admins rely on.
- Returning visitors should notice when curation is stale, not be distracted by random fills.
- The Discover lane below already provides breadth (§2.7); there is no information gap.

Admin UI surfaces a warning if fewer than N (say, 3) events are featured so curators know the section is sparse.

### 2.5 One lane, no categories

The featured lane is a single horizontally-scrollable strip on desktop / vertically-stacked on mobile. No Weddings / Conferences / Parties tabs. Two reasons:

- Forces curation quality: admins pick the best-of-platform across types, not "three decent weddings". Encourages showcasing range.
- Simplifies admin UX (one reorder list) and SEO (one primary lane, not three).

Category splits are §8.

### 2.6 Make the default-PUBLIC behavior legible in creation UX

Not a schema or API task — a copy task. The event creation form and the event settings "Visibility" section should surface a short line like:

> Public events are listed on eventfxr.com and may be featured on the homepage. Change to Unlisted to keep the event accessible by direct link only.

This lives under Task 5 as a one-line copy addition and prevents organizers from being surprised by homepage placement later. Not a blocker for the featured section itself — purely a user-respect improvement tied to this feature's rollout.

### 2.7 Discover lane rotates on a cache TTL, not per request

Random queries are anti-cache and anti-SEO: search engines and CDNs want stable pages. The Discover lane:

- Queries public `PUBLISHED` events with `visibility = PUBLIC` and excludes anything currently featured.
- Picks N (default 12) at random.
- Result is **cached server-side for 1 hour** (TTL chosen so crawlers see stable content but returning visitors get variety day-over-day).
- Uses Next.js 16 Cache Components pattern (`use cache` directive + `cacheLife`) or `unstable_cache` — implementation choice left to whoever picks up the task; both are valid.
- Cache is scoped per locale / region if we introduce locale routing later; not relevant yet.

**Not using `ORDER BY RANDOM()` on every request.** Large pools make it slow, and SEO hates fresh content on every crawl.

### 2.8 Landing page is server-rendered; hero images obey LCP budget

Both lanes are SSR'd via server components. The first three featured cards mark their hero image `priority` (Next.js `<Image priority>`); remaining cards lazy-load. Featured cards should use `<Image sizes>` correctly so the browser picks a right-sized variant. Target: LCP < 2.5s per `CLAUDE.md` performance targets.

---

## 3. Prerequisites

- `Event.visibility` and `Event.status` exist already (verified in `prisma/schema.prisma`). No prerequisite schema work.
- Admin surface `/efx-ctrl/events` exists with event listing. This plan extends it.
- Public `/events` listing at `src/app/(marketing)/events/` already filters on visibility. No changes required there.
- Landing page is `src/app/page.tsx` at repo root (root layout is `src/app/layout.tsx`).

No new npm dependencies. No new environment variables.

---

## 4. Task Breakdown

Five tasks, sized for solo review. T1 is independent; T2 depends on T1; T3 depends on T2; T4 depends on T1; T5 depends on T1. T4 and T5 can parallelize once T1 lands.

### Task 1 — Schema migration for featured fields

**Branch:** `feat/event-featured-fields`
**PR title:** `feat: add featuredAt and featuredOrder to Event`

**Files**

- `prisma/schema.prisma` _(edit)_
- `prisma/migrations/<timestamp>_add_event_featured_fields/migration.sql` _(generated)_

**Changes**

Add to `Event` model (after `status`):

```prisma
featuredAt    DateTime? @map("featured_at")
featuredOrder Int?      @map("featured_order")

@@index([featuredAt, featuredOrder]) // landing page query hot path
```

Run:

```bash
npx prisma migrate dev --name add_event_featured_fields
npm run db:generate
```

**Acceptance criteria**

- [ ] Migration adds two nullable columns and one composite index; no default values; no backfill required.
- [ ] `npx prisma migrate diff --exit-code --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma` exits 0 after apply.
- [ ] Existing `Event` queries compile unchanged.
- [ ] Per the `CLAUDE.md` migration runbook: migration file committed alongside the schema change in the same PR.

---

### Task 2 — Admin API for featuring events

**Branch:** `feat/admin-featured-api`
**PR title:** `feat: add admin API to feature/unfeature/reorder events`
**Depends on:** Task 1

**Files**

- `src/app/api/admin/events/[id]/feature/route.ts` _(new)_
- `src/app/api/admin/events/featured/reorder/route.ts` _(new)_
- `src/schemas/admin-feature.ts` _(new)_
- `tests/unit/admin-feature-api.test.ts` _(new)_

**Behavior**

- `POST /api/admin/events/[id]/feature` — body `{ order?: number }`. Sets `featuredAt = now()` and `featuredOrder = order` (or appends to the end if omitted). Returns the updated event.
- `DELETE /api/admin/events/[id]/feature` — sets both fields to null.
- `PATCH /api/admin/events/featured/reorder` — body `{ items: [{ eventId, order }] }`. Bulk reorder; runs inside a single transaction.
- All routes require admin authentication. The org-member check is not sufficient — this is a platform-admin action.
- `POST` returns **400** if:
  - `event.visibility !== "PUBLIC"` (message: "Only public events can be featured").
  - `event.status !== "PUBLISHED"` (message: "Only published events can be featured").
- After any successful mutation, invalidate the landing-page cache tag (see Task 4).

**Validation**

```ts
const featureSchema = z.object({ order: z.number().int().min(0).optional() });
const reorderSchema = z.object({
  items: z.array(z.object({ eventId: z.string(), order: z.number().int().min(0) })).min(1),
});
```

**Acceptance criteria**

- [ ] POST sets `featuredAt` and `featuredOrder` on eligible events.
- [ ] POST returns 400 on UNLISTED / PRIVATE / DRAFT / CANCELLED / COMPLETED events with a specific error message per rejection reason.
- [ ] DELETE nulls both fields.
- [ ] PATCH reorders atomically; a failure mid-batch rolls back the whole operation.
- [ ] 401 unauthenticated; 403 non-admin; 404 unknown event.
- [ ] Each successful mutation calls the landing-page cache invalidation hook.
- [ ] Tests cover the full matrix: each visibility/status combo for POST; successful DELETE; reorder of 3 events; reorder with one bad id (full rollback).

---

### Task 3 — Admin UI: feature toggle + reorder

**Branch:** `feat/admin-featured-ui`
**PR title:** `feat: featured-events admin UI`
**Depends on:** Task 2

**Files**

- `src/app/(admin)/efx-ctrl/events/page.tsx` _(edit — add "Feature" action per row)_
- `src/app/(admin)/efx-ctrl/events/featured/page.tsx` _(new — dedicated reorder page)_
- `src/components/features/AdminFeaturedList/AdminFeaturedList.tsx` _(new)_
- `src/components/features/AdminFeaturedList/AdminFeaturedList.module.css` _(new, as needed)_

**Behavior**

Two entry points, different mental models:

1. **Per-row toggle on `/efx-ctrl/events`.** Each event row gets a "Feature" button (or ⭐ icon toggle). Clicking it calls POST `/api/admin/events/[id]/feature`. Currently-featured events show a filled star; unfeatured show an outline. Disabled with tooltip if event fails eligibility (non-PUBLIC visibility, non-PUBLISHED status).

2. **Dedicated reorder page at `/efx-ctrl/events/featured`.** Linked from the main admin nav. Shows only currently-featured events in their current order. Drag-and-drop reorders (using an existing library already in the repo if one is in use; otherwise a minimal HTML5 DnD implementation). "Save order" button commits via PATCH reorder endpoint.

**Empty-state hint.** When fewer than 3 events are featured, show a subtle warning at the top of both surfaces: *"Homepage featured section will show only N events. Consider curating at least 3."*

**Acceptance criteria**

- [ ] Per-row toggle on `/efx-ctrl/events` reflects current `featuredAt` state.
- [ ] Toggle is disabled (with tooltip) for ineligible events.
- [ ] `/efx-ctrl/events/featured` renders the current featured list in order.
- [ ] Drag-reorder updates local state immediately; "Save order" persists via PATCH.
- [ ] Save errors (e.g. 409 conflict) surface inline; last-known-good state is restored.
- [ ] "Fewer than 3 featured" warning appears when applicable.
- [ ] Mobile-usable at 375px (admin UI is secondary; functional > polished here).

---

### Task 4 — Landing page: Featured Events lane

**Branch:** `feat/landing-featured-lane`
**PR title:** `feat: render featured events on landing page`
**Depends on:** Task 1

**Files**

- `src/app/page.tsx` _(edit)_
- `src/components/features/FeaturedEvents/FeaturedEvents.tsx` _(new)_
- `src/components/features/FeaturedEvents/FeaturedEventCard.tsx` _(new)_
- `src/components/features/FeaturedEvents/FeaturedEvents.module.css` _(new, as needed)_
- `src/lib/landing-queries.ts` _(new — shared query helpers)_

**Query**

```ts
// src/lib/landing-queries.ts
export async function getFeaturedEvents() {
  const now = new Date();
  return db.event.findMany({
    where: {
      featuredAt: { not: null },
      visibility: "PUBLIC",
      status: "PUBLISHED",
      OR: [
        { endAt: null },
        { endAt: { gt: now } },
      ],
    },
    orderBy: { featuredOrder: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      city: true,
      country: true,
      coverImageUrl: true,
    },
    take: 24, // generous upper bound; realistic curation is 6–12
  });
}
```

**Rendering**

- Server component. Section is **conditionally rendered**: if `featuredEvents.length === 0`, the section is omitted entirely (no empty-state card, no "coming soon" text).
- First three cards use `<Image priority>` for LCP.
- All cards use `<Image sizes>` with responsive breakpoints.
- Card content: hero image, title, city/country line, start date. Link target is `/e/${slug}` (per the existing `src/app/e/[slug]/` convention).
- Section header: "Featured Events" with a small "View all" link to `/events` (existing listing).

**Caching**

Use Next.js 16 Cache Components pattern (`"use cache"` directive + `cacheTag("landing-featured")` + `cacheLife("minutes")` or similar), or `unstable_cache` with tag `landing-featured`. Admin API mutations (Task 2) call `revalidateTag("landing-featured")`.

**Acceptance criteria**

- [ ] Section renders featured events in `featuredOrder` asc.
- [ ] Only `PUBLIC` + `PUBLISHED` + non-expired events appear.
- [ ] Section is omitted entirely when zero eligible events exist — no placeholder copy, no empty card.
- [ ] First three hero images use `priority`; others lazy-load.
- [ ] LCP on the landing page (Lighthouse mobile, cold cache) is < 2.5s per `CLAUDE.md` performance targets. Measured with a realistic 6-event curation.
- [ ] `revalidateTag("landing-featured")` is wired on admin mutations and invalidates within one request.
- [ ] Build output shows the landing page as either `ISR`/`PPR` or `static` with cache tags — not a full `ƒ` dynamic render on every hit.
- [ ] Card links target `/e/[slug]` and navigate correctly.

---

### Task 5 — Discover lane + visibility-copy polish

**Branch:** `feat/landing-discover-lane`
**PR title:** `feat: add discover-more lane and visibility copy`
**Depends on:** Task 1

**Files**

- `src/app/page.tsx` _(edit — add Discover section below Featured)_
- `src/components/features/DiscoverEvents/DiscoverEvents.tsx` _(new)_
- `src/lib/landing-queries.ts` _(extend with `getDiscoverEvents`)_
- Event creation form + settings — one-line copy addition about default visibility (see §2.6). Path depends on where the creation form lives; likely `src/app/(auth)/dashboard/events/new/` and the event settings page.

**Query**

```ts
export async function getDiscoverEvents(excludeIds: string[], count = 12) {
  // Pool: public, published, non-expired, not currently featured.
  const pool = await db.event.findMany({
    where: {
      visibility: "PUBLIC",
      status: "PUBLISHED",
      OR: [{ endAt: null }, { endAt: { gt: new Date() } }],
      id: { notIn: excludeIds },
    },
    select: { /* same shape as featured */ },
  });
  return shuffle(pool).slice(0, count); // Fisher–Yates in a helper
}
```

- Caching: TTL of 1 hour via Cache Components or `unstable_cache` with tag `landing-discover`. Admin mutations that change the eligible pool (publish/unpublish, visibility changes) invalidate this tag as well.
- Rendering mirrors Featured cards but uses a lighter visual treatment to preserve hierarchy.
- Section header: "Discover more events" with a "Browse all" link to `/events`.

**Copy polish (§2.6)**

At the visibility selector in the event creation flow and in event settings, add the line:

> Public events are listed on eventfxr.com and may be featured on the homepage. Change to Unlisted to keep the event accessible by direct link only.

**Acceptance criteria**

- [ ] Discover section shows up to 12 random non-featured public events.
- [ ] Cache TTL is 1 hour; crawlers and first-paint users see stable content within a cache window.
- [ ] When the pool is smaller than 12, render what exists without padding; hide entirely if zero.
- [ ] Visibility selector copy is present on both creation and settings; copy matches §2.6 exactly.
- [ ] LCP is not regressed by the Discover lane (images below the fold; no `priority` images in this section).

---

## 5. Testing Strategy

**Unit tests (Vitest)** — per-task AC above. Critical cases:

- Admin API eligibility matrix (Task 2): verify each of the 5 rejection conditions returns 400 with the right message.
- Landing query (Task 4): a featured event with `endAt` in the past is excluded.
- Reorder endpoint rollback (Task 2): supplying one invalid eventId mid-batch reverts everything.
- Discover `excludeIds` plumbing (Task 5): currently-featured events never appear in Discover.

**Integration tests** — not required for MVP. Existing admin route tests cover general shape.

**Manual smoke test checklist (before production deploy)**

1. Seed 6 PUBLIC + PUBLISHED events with cover images.
2. Admin: on `/efx-ctrl/events`, toggle 4 events as featured.
3. Visit `/` unauthenticated — Featured lane shows 4 cards in order.
4. Admin: visit `/efx-ctrl/events/featured`, drag to reorder.
5. Reload `/` — order matches the admin reorder. Cache invalidated within one request.
6. Admin: try to feature an UNLISTED event — toggle disabled with tooltip; direct API POST returns 400.
7. Change one featured event's `endAt` to yesterday (via admin edit or DB). Reload `/` — event drops out of Featured silently.
8. Unfeature all events. Reload `/` — Featured section is absent entirely (no empty state, no placeholder).
9. Refresh `/` repeatedly within an hour — Discover lane shows the same random pick (TTL hit).
10. Wait past TTL or manually invalidate — Discover rotates to a new random slice.
11. Create a new event via organizer dashboard — verify the visibility copy from §2.6 appears.
12. Lighthouse on `/` (mobile, cold cache) — LCP < 2.5s.

**Accessibility**

- Cards are anchor-wrapped with clear accessible names (title + city + date in `aria-label` or equivalent).
- Hero images have descriptive `alt` text (event title).
- Section headers use `<h2>` (page uses `<h1>` for the platform headline).
- Focus ring on each card is visible and consistent with the rest of the marketing surface.

---

## 6. Rollout Plan

Ship in task order. All tasks are additive and non-breaking; each PR is independently revertable.

| Merge order | What becomes live | User impact |
|---|---|---|
| T1 | Schema fields present; no UI yet | None |
| T2 | Admin API callable; no UI to invoke it | None |
| T3 | Admin can feature + reorder events | Admins see new UI; no public surface yet |
| T4 | Landing page shows Featured lane | Visitors see curated content |
| T5 | Landing page shows Discover lane + visibility copy | Visitors see broader selection; new organizers see visibility copy |

**Rollback**

- T1 migration is purely additive; a rollback migration dropping the two columns and index is safe (loses featured curation only).
- T2–T5 revert independently.
- No data migration or backfill at any stage.

**Launch moment.** Curation should happen before T4 ships to production — otherwise the first wave of visitors sees an absent section. Coordinate T4 merge with admin-side curation of 6+ events.

---

## 7. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Landing page LCP regresses with hero images | Medium | Medium | `priority` + correct `sizes` on first three cards; Lighthouse check in the T4 AC; serve via next/image with responsive variants. |
| Featured event becomes non-public after featuring (organizer flips to UNLISTED) | Low | Medium | Query filter excludes non-PUBLIC events regardless of `featuredAt`. No stale content renders. Optional: admin notification, deferred to §8. |
| Admin drag-reorder race with concurrent admin edits | Very Low | Low | PATCH reorder is transactional; last-writer-wins is acceptable given admin scale. Revisit if we grow to multiple concurrent admins. |
| Discover lane shows the same random pick too long (TTL too high) | Low | Low | 1-hour TTL is a starting point; shorten if user feedback asks. Easy knob. |
| Discover query on a 10k-event pool becomes slow | Low | Medium | Filter predicates are index-friendly (`visibility`, `status`, `endAt` indexed per existing `@@index([status, visibility])`). If needed, add a composite index or maintain a materialized "discover pool" view. |
| Featured event links to a `/e/[slug]` that 404s (event deleted) | Low | Medium | Foreign key is implicit via the fields living on `Event`; row delete removes the featured state automatically. Landing query returns zero rows for deleted events by definition. |
| Cache invalidation misses on admin mutation, serving stale landing page | Low | Medium | Explicit `revalidateTag` calls in T2 mutation handlers; cover in tests. Manual revalidation endpoint (`POST /api/admin/revalidate`) available as an escape hatch — if not present, file for §8. |
| Organizer is surprised by their event appearing on the homepage | Low | Low | §2.6 copy makes the default visible. Organizer can switch to UNLISTED at any time. Curation is admin-side, so random appearance cannot happen — only explicit curation triggers placement. |

---

## 8. Out of Scope (Future Work)

- **Per-category featured lanes** (Weddings / Conferences / Parties). Requires admin UX redesign and multi-lane landing page layout. Revisit when public pool is large enough that one lane cannot showcase range.
- **Scheduled featuring** — admin sets "feature this from Monday to Saturday". Small state machine; not urgent.
- **Organizer self-feature / request-to-feature** — an "Apply to be featured" workflow routed to admin review. Worth building once inbound demand justifies.
- **Featured-event organizer notification** — email or dashboard banner when their event is featured or unfeatured.
- **Analytics on featured slots** — impressions, click-through, cohort analysis. Belongs with whichever analytics stack the platform adopts.
- **A/B testing of slots and ordering** — which featured event lifts signup more? Requires analytics foundation.
- **Paid / sponsored featured placements** — monetization question, not a product-shape question.
- **Discover personalization** — "events near you", "events you might like" based on viewer history or location. Requires viewer identity / geolocation plumbing.
- **Manual cache-invalidation endpoint** (`POST /api/admin/revalidate`) — if not present in the codebase at Task 2 implementation time, worth adding here or as a small follow-up.
- **Featured-event badge on event pages** — "Featured on homepage" micro-badge on `/e/[slug]`. Low priority.

---

## 9. Reviewer Checklist (Feature-Specific)

In addition to standard expectations in `CLAUDE.md` and `CONTRIBUTING.md`:

- [ ] Architectural decisions in §2 are respected — especially: featured state on `Event` (not a join table), auto-expiry by query filter, no random fallback inside featured, SSR with Cache Components / `unstable_cache` tag invalidation.
- [ ] No new environment variables.
- [ ] No new npm dependencies unless a drag-reorder library is already in the repo.
- [ ] Single additive migration (Task 1); no data migration.
- [ ] Admin API (Task 2) enforces the full eligibility matrix; unauthenticated and non-admin callers are rejected before schema validation runs.
- [ ] Landing query filter excludes non-PUBLIC, non-PUBLISHED, and expired events regardless of `featuredAt`.
- [ ] Featured section hides entirely when zero eligible events; no empty state copy.
- [ ] First three hero images have `priority`; Lighthouse LCP < 2.5s with a realistic curation.
- [ ] Cache invalidation (`revalidateTag`) fires on every successful admin mutation.
- [ ] Discover lane excludes currently-featured events.
- [ ] Visibility copy (§2.6) is present on both creation and settings surfaces; wording matches the plan.

---

_Last updated: 2026-04-23_
