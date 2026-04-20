# WeddingStorybook — Single-Page Portrait Mode (Consolidated)

**Status:** Ready for implementation (post-review)
**Supersedes:** `internal-docs/wedding-storybook-portrait-mode-plan.md`
**Review source:** `wedding-storybook-portrait-mode-review.md` (dev team, approved architecture + 4 blocking decisions)
**Target:** ~1 sprint (2–3 working days)
**Scope:** `src/components/features/Invitation/templates/WeddingStorybook/**`

---

## 1. Summary of changes vs. v1

The original plan's architecture is approved unchanged. This consolidated plan folds in the review's blocking decisions and refinements:

| Area | v1 | v2 (this plan) |
|---|---|---|
| Breakpoint | `(max-aspect-ratio: 4/3)` | `(max-aspect-ratio: 4/3) and (max-width: 1024px)` |
| Compact cascade | Descendant selectors over `.bookPage` | CSS custom properties overridden at `.book` |
| State model | Dual (`currentSpread` + `intraSpreadPage`) | Decided post-audit — unified `currentPage` if all 10 pages kept, portrait page map if any dropped |
| Left-page audit | Not in scope | Blocking pre-work (Decision A) |
| Axis-rotation spike | §12.5 — 30 min | Skipped (pre-known outcome) |
| Touch targets | 28px nav buttons | ≥44×44pt on portrait (HIG / WCAG) |
| Dot aria-labels | "Page X" | "Chapter X of 5" in single mode |
| Composition hints | Not specified | `contain: layout paint` + scoped `will-change: transform` |
| Commits | 5 | 6 (new 2b: swap fixed-rem margins for CSS vars) |
| LOC estimate | ~190 | ~230–240 |

### 1.1 In-place edit, not a clone

Portrait mode ships as a modification to the existing `WeddingStorybook` template — no cloned `WeddingStorybookPortrait` / `_v2` variant, no new template ID, no enum migration.

**Why:** portrait mode is responsive behavior for the same design, not a distinct composition. Cloning would create permanent dual-maintenance for every future WeddingStorybook edit and trigger the full "Adding New Invitation Templates" checklist (schema enum, Prisma migration, registry, picker UI, seed, section gating) for no user-visible benefit.

**Rollback risk:** the sole real hazard — a landscape regression — is mitigated by the per-commit landscape visual-diff gate in §6 non-negotiables. If the gate catches a regression, that's a bug to fix, not a reason to fork.

---

## 2. Pre-work — close before Commit 1

All four decisions below must be resolved before code lands. Budget: ~1 hour total.

### Decision A — Left-page content audit (blocking, ~20 min with designer)

For each of `CoverLeft`, `StoryLeft`, `TimelineLeft`, `DetailsLeft`, `RSVPLeft`, tag **content-bearing** or **decorative**. Outcome drives Decision B and the portrait navigation distance (probably 5–7 pages, not 10).

Record the audit outcome in this document before Commit 1 lands:

```
CoverLeft     — [ ] content  [ ] decorative  notes: _____
StoryLeft     — [ ] content  [ ] decorative  notes: _____
TimelineLeft  — [ ] content  [ ] decorative  notes: _____
DetailsLeft   — [ ] content  [ ] decorative  notes: _____
RSVPLeft      — [ ] content  [ ] decorative  notes: _____
```

### Decision B — State model (depends on A)

- **If all 10 pages kept** → unified `const [currentPage, setCurrentPage] = useState(0)` with `currentSpread = Math.floor(currentPage / 2)`. No invariant drift, trivial derivation.
- **If any left page dropped** → portrait page map: `const PORTRAIT_PAGES: number[] = [0, 2, 3, 4, 5, 7, 9]` (example); unified `currentPage` indexes into the map. Spread-keyed logic still derives from `PORTRAIT_PAGES[currentPage]`.

Dual state (`currentSpread` + `intraSpreadPage`) from v1 is rejected — it adds a maintained invariant without meaningful benefit in either branch.

### Decision C — Slide direction (30-sec device prototype)

Default right-to-left for forward (LTR reading). Build the minimal slide in Commit 3, put it on a phone, invert sign if it reads backward. Commit the direction; do not ship as an open question.

### Decision D — Nav arrow placement on portrait

Bottom corners on portrait for thumb reach (44×44pt min). Vertically centered in spread mode as today. Decide on-device at the same time as Decision C.

---

## 3. Architecture

### Layout mode detection

`useLayoutMode()` in `WeddingStorybook/useLayoutMode.ts`:

```ts
export const LAYOUT_MODE_QUERY = "(max-aspect-ratio: 4/3) and (max-width: 1024px)";

export function useLayoutMode(): "spread" | "single" {
  return useSyncExternalStore(
    subscribe,
    () => readMode(),
    () => "spread",
  );
}
```

CSS media queries own the *layout*; the hook only owns JS state (nav step, indicator aria-labels, animation class). Because layout is CSS-driven, there is no visible hydration flash — document this in the hook's header comment so future reviewers don't re-litigate SSR behaviour.

### State model

Per Decision B outcome. Canonical unit is page-index in both branches. Indicator dots remain 5 (chapter markers) in both modes; `aria-label` on dots in single mode reads "Chapter N of 5" so screen-reader semantics match the metaphor (tapping dot 4 may jump multiple pages, which is correct for chapter nav but confusing as "page" nav).

### Navigation

| Mode | Forward | Backward | Step |
|---|---|---|---|
| Spread | `currentSpread++` | `currentSpread--` | 1 spread |
| Single | `currentPage++` (or next in `PORTRAIT_PAGES`) | `currentPage--` | 1 page |

Dot tap → jump to that chapter's first visible page.

### Portrait book geometry

```css
@media (max-aspect-ratio: 4/3) and (max-width: 1024px) {
  .book {
    width: min(92vw, 600px);
    height: min(85dvh, 900px);
    aspect-ratio: auto;
  }
  .spine,
  .pageInner::before {
    display: none;
  }
}
```

### Compact-spacing cascade (Decision C)

Expose page-spacing as custom properties on each page root; override at `.book` in the small-viewport media query. Example:

```css
/* Each page component's *.module.css */
.section  { margin-bottom: var(--sb-section-gap, 1.8rem); }
.heading  { margin-bottom: var(--sb-heading-gap, 1.2rem); }
.subhead  { margin-bottom: var(--sb-subhead-gap, 0.8rem); }

/* WeddingStorybook.module.css */
@media (max-aspect-ratio: 4/3) and (max-width: 1024px) and (max-height: 700px) {
  .book {
    --sb-section-gap: 1.1rem;
    --sb-heading-gap: 0.8rem;
    --sb-subhead-gap: 0.5rem;
  }
}
```

No descendant selectors reaching into page internals. Reviewers can see which tokens shrink. Designers tune values in the `.book` media query, not by hunting cascade specificity.

If a specific page (likely `RSVPRight`) still overflows at iPhone-SE-sized books after the compact cascade, add a single opt-in `.bookPage--scrollable` modifier on that page rather than relaxing the no-scroll rule globally.

### Animation

- **Spread mode:** unchanged 3D flip.
- **Single mode:** horizontal slide + fade (~400ms). Direction from Decision C. Easing matches the existing flip's `--sb-content-easing` so both modes share one motion language.
- **Composition:** `contain: layout paint` on every page; `will-change: transform` scoped to the actively-sliding page only (toggle via class), not all pages.
- **Reduced motion:** single-mode slide drops to instant content swap; spread mode's existing reduced-motion behaviour verified unchanged.

### Surface-aware nav arrow color

Read `data-surface` from the *active* page directly (not a spread alias):
- Spread mode: existing logic.
- Single mode: `pages[currentPage].variant` (or `pages[PORTRAIT_PAGES[currentPage]].variant` if the map exists).

### Touch targets

Nav buttons on portrait: minimum 44×44pt hit area. Visible art can stay smaller; expand the interactive surface via padding or an absolutely-positioned pseudo-element. WCAG 2.5.5 and Apple HIG.

---

## 4. Success criteria

- [ ] Portrait viewports: one full-size page at a time, no clipped content on real iPhone SE, iPhone 12+, iPad mini, iPad Pro.
- [ ] Landscape/wide viewports: pixel-stable vs. pre-change — visual diff per commit.
- [ ] Mode switch on orientation change preserves reading position.
- [ ] All 10 page components render without layout logic changes (CSS var additions only).
- [ ] Nav (arrows, swipe, keyboard, dots) works in both modes.
- [ ] `prefers-reduced-motion` honoured in both modes.
- [ ] `data-surface` nav-arrow color works in both modes.
- [ ] Nav buttons ≥44×44pt on portrait.
- [ ] Screen reader announces "Chapter N of 5" on dots in single mode.
- [ ] Confetti fires once on arrival at the final content page in both modes.
- [ ] Zero new TypeScript or ESLint errors.

---

## 5. Commit breakdown (6 commits)

### Commit 1 — `useLayoutMode` hook

**File:** `WeddingStorybook/useLayoutMode.ts` _(new)_

`useSyncExternalStore`-based hook returning `"spread" | "single"`. Exports `LAYOUT_MODE_QUERY`. Server snapshot `"spread"`. Subscribes to a shared `MediaQueryList`.

### Commit 2 — Portrait CSS + compact-variable overrides

**Files:** `WeddingStorybook.module.css`, `BookPage.module.css`

- `@media (max-aspect-ratio: 4/3) and (max-width: 1024px)` block: `.book` resizes, `.spine` / paper artifacts hidden, perspective and shadow re-tuned.
- `.page--single` modifier: `width: 100%`, `right: auto`, no 3D transform.
- Compact-cascade media query sets `--sb-*` custom properties on `.book`.
- `.contentSingle` slide animation class.
- `contain: layout paint` on page base; `will-change: transform` scoped to `.page--sliding`.

### Commit 2b — Swap fixed-rem margins for CSS vars in page modules (~30–40 LOC, mechanical)

**Files:** 10 page-component `*.module.css` files.

Replace fixed margins with `var(--sb-…-gap, <fallback>)`. Fallback = current value, so zero visual change when custom properties aren't set. Batch-reviewable.

### Commit 3 — `BookPage` layout-mode branch + on-device slide direction

**File:** `BookPage.tsx`

- Add `layoutMode` prop.
- Single mode: compute visibility from the current page index (per Decision B's state model); hide others with `opacity: 0; pointer-events: none`.
- Apply `.page--single` + slide class; skip 3D rotation logic.
- On-device prototype: confirm slide direction; commit the sign.

### Commit 4 — `WeddingStorybook.tsx` state, navigation, ARIA

**File:** `WeddingStorybook.tsx`

- `useLayoutMode()` integration.
- State model per Decision B.
- `goNext` / `goPrev` / `goTo` branch on mode.
- Pass `layoutMode` + active page index to `<BookPage>`.
- `data-surface` reads from active page's variant directly.
- `aria-label` on `.book`: "page X of N" in single mode; dots labelled "Chapter N of 5".
- Live-region announcements for page transitions in single mode.
- Nav-arrow placement: bottom corners on portrait (Decision D), vertically centered on landscape.
- Touch-target expansion: ≥44×44pt hit area on portrait.

### Commit 5 — Reduced motion + QA polish

**File:** `WeddingStorybook.module.css`

- `@media (prefers-reduced-motion: reduce) and ({portrait query})`: drop slide animation.
- Audit reduced-motion in spread mode.
- Confirm composition hints don't introduce jank on low-end Android.

---

## 6. Non-negotiables (guard in review)

1. Landscape spread is pixel-stable — visual-diff gate per commit.
2. No orphaned decorative pages on portrait (Decision A enforcement).
3. Slide easing matches existing `--sb-content-easing` so both modes read as one motion language.
4. `data-surface` reads from active page, not a spread-index alias.
5. Reduced motion works in both modes.
6. Compact spacing is designer-tuned via the `.book` media query, not eyeballed.
7. Touch targets ≥44×44pt on portrait.

---

## 7. File change summary

| File | Change | LOC Δ (est.) |
|---|---|---|
| `useLayoutMode.ts` | New hook | ~+50 |
| `WeddingStorybook.module.css` | Portrait query, slide, compact vars, composition hints | ~+80 |
| `BookPage.module.css` | Hide spine shadow, single-page class | ~+15 |
| `BookPage.tsx` | Layout-mode branch, props | ~+30 / -10 |
| `WeddingStorybook.tsx` | State, nav, ARIA, touch targets | ~+70 / -20 |
| 10 page `*.module.css` files | Fixed-rem → `var(…)` fallbacks | ~+30–40 |
| `index.ts` | Export hook | ~+1 |

Net: ~230–240 LOC. Single-reviewer territory.

---

## 8. Manual QA checklist

- [ ] Desktop 1920×1080 Chrome / Firefox / Safari: pixel-identical to pre-change.
- [ ] Desktop narrow window (900×1000): spread mode retained (width ≤1024 but aspect >4/3 — confirm breakpoint behaviour).
- [ ] iPad Pro portrait: one page fills viewport, no clipping.
- [ ] iPad mini portrait: one page fills viewport, no clipping.
- [ ] iPhone SE portrait: compact cascade engages; no overflow; if `RSVPRight` overflows, confirm `.bookPage--scrollable` opt-in.
- [ ] iPhone 12+ portrait + landscape: mode switches correctly on rotation, position preserved.
- [ ] Rotate iPad mid-view: lands on a coherent page, not an orphaned decorative half.
- [ ] Keyboard nav (arrows, Home, End) both modes.
- [ ] Swipe nav both modes.
- [ ] Dot tap jumps to correct chapter both modes; VoiceOver reads "Chapter N of 5" in single mode.
- [ ] Nav arrows ≥44×44pt hit area on portrait; bottom-corner placement.
- [ ] Surface-aware nav arrow color on light/accent pages both modes.
- [ ] Reduced-motion: no animation either mode.
- [ ] Confetti fires on arrival at final content page both modes.
- [ ] Low-end Android: no jank on slide animation.

---

## 9. Rollout

**Branch:** `feature/wedding-storybook-portrait-mode`
**PR title:** `feat(invitations): WeddingStorybook single-page portrait mode`
**Commits:** 6 per §5.
**Tests:** Manual QA per §8. Do not bolt vitest config into this PR.
**Deploy:** Standard Vercel preview → main. No feature flag.
**Post-deploy:** Watch `/invite/[token]` for client errors 24h.

---

## 10. Follow-ups (separate tickets)

- Apply pattern to other templates if portrait clipping is observed.
- Page-level analytics in single mode to measure RSVP-reach.
- Premium portrait page-curl / 3D single-page flip — explore after baseline ships.
- Invitation test infrastructure (Vitest fixtures).

---

## 11. References

- Superseded plan: `internal-docs/wedding-storybook-portrait-mode-plan.md`
- Review: `wedding-storybook-portrait-mode-review.md`
- Precedents: commit `063da89` (nav arrow contrast), `695d6f8` (`useSyncExternalStore` in `GuestBar`)
- Project conventions: `CLAUDE.md` — "Adding New Invitation Templates", "React Hooks Rules"
- Prior portrait-mode fixes: commits `5555eac` (FlipFlap vertical hinge), `4d8b136` (SplitReveal breakpoints)
