# WeddingStorybook — Single-Page Portrait Mode

**Status:** Draft for review
**Owner:** _assign_
**Target:** ~1 sprint (2–3 working days)
**Scope:** `src/components/features/Invitation/templates/WeddingStorybook/**`
**Related:** prior fixes to nav-arrow contrast (commit `063da89`); prior plan precedent at `internal-docs/invitation-design-concepts.md`

---

## 1. Context

The `WeddingStorybook` template renders a 3D book with two pages spread open, navigated as five spreads (10 pages total). The design language assumes a landscape page geometry — pages are absolutely positioned at `width: 50%` of the book, sized by `min(46vw, 650px)` height.

On portrait viewports ≤1024px, the math collapses:

| Device | Viewport | Book size | Page size |
|---|---|---|---|
| Desktop landscape | 1920×1080 | 1300×650 | 650×650 |
| iPad Pro 11" portrait | 834×1194 | 767×384 | 383×384 |
| iPad mini portrait | 768×1024 | 737×369 | 368×369 |
| iPhone 12 portrait | 390×844 | 390×195 | 195×195 |

Each page becomes a small square. Page content (e.g. `CoverRight`: header → name → ampersand → name → divider → date+year → venue) uses `clamp()` for fonts (which scale fine) but **fixed-rem margins** like `marginBottom: "1.8rem"` (28.8px regardless of page size). At ~310px of usable content height after padding, the inherent stack of ~340–370px **overflows** — the venue line, RSVP button, and bottom decorations get cut off.

Surgical fixes (shrinking margins via media queries, tightening fonts further) stop the overflow but produce legible-but-cramped content in a small box. The 2:1 landscape page geometry is structurally hostile to portrait viewports — no sizing formula closes the gap because the book's height is bound by viewport width, leaving most of the portrait viewport unused while content is squeezed.

## 2. Goal

Add a **single-page portrait mode** to `WeddingStorybook`: when the viewport is portrait/narrow, render one page at a time at `~92vw × ~80dvh` so content has full vertical room. Landscape and wide viewports keep the existing dual-page spread (no regression).

### Success criteria

- [ ] On portrait viewports `(max-aspect-ratio: 4/3)`, the template shows one full-size page at a time — no clipped content on iPad/iPhone portrait, real device tested.
- [ ] On landscape and wide viewports, the spread layout is visually identical to today (pixel-stable diff).
- [ ] Layout mode reacts to orientation/resize events (rotating an iPad mid-view switches modes cleanly without losing reading position).
- [ ] All 10 page components (`CoverLeft`, `CoverRight`, ..., `RSVPRight`) render without modification — content stays canonical.
- [ ] Navigation (arrows, swipe, keyboard, indicator dots) works in both modes; mental model documented.
- [ ] `prefers-reduced-motion` honoured in single-page mode (no flip animation, snap transition).
- [ ] Surface-aware nav arrow color (`data-surface`) keeps working in both modes.
- [ ] Zero new TypeScript errors, ESLint errors. (No test infra in repo; manual QA only.)

### Non-goals

- Redesigning any page component or its content.
- Replacing the existing landscape spread mode.
- Building a tablet-specific intermediate layout (e.g. half-spread on landscape iPad). The split is binary: landscape spread, portrait single-page.
- Adding a user-toggle to force one mode regardless of viewport.

---

## 3. Approach

**Two layout modes, one set of page components.** The template gains a `layoutMode: "spread" | "single"` derived from viewport via `matchMedia`. The 10 page components are unchanged. `BookPage` and `WeddingStorybook.tsx` branch on layout mode for geometry, animation, and navigation step size.

### Layout mode detection

A new hook `useLayoutMode()` in `WeddingStorybook/useLayoutMode.ts`:

```ts
export function useLayoutMode(): "spread" | "single" {
  return useSyncExternalStore(
    subscribe,
    () => readMode(),
    () => "spread" // server snapshot — assume landscape until hydration
  );
}
```

`useSyncExternalStore` keeps SSR stable (always renders spread mode on server, swaps to actual mode after hydration) and handles resize/orientation reactively without setState-in-effect. Same pattern as `GuestBar` (commit `695d6f8`).

The breakpoint: `(max-aspect-ratio: 4/3)`. Picks up all phone portraits, all tablet portraits, narrow desktop windows. Landscape phones, landscape tablets, and any reasonable desktop window stay in spread mode. The 4/3 cutoff matches the threshold below which a 2:1 spread becomes too cramped.

### State model

The current state is `currentSpread: 0 | 1 | 2 | 3 | 4`. In single-page mode the canonical unit is page-index `0..9`.

**Decision: keep `currentSpread` as canonical; derive page navigation from it.**

In single-page mode, advancing within a spread = first show page A (left), then page B (right) of the spread, then advance to the next spread's page A. New state:

```ts
const [currentSpread, setCurrentSpread] = useState(initialSpread);
const [intraSpreadPage, setIntraSpreadPage] = useState<0 | 1>(0);

// In single-page mode, the visible page is:
const currentPage = layoutMode === "single"
  ? currentSpread * 2 + intraSpreadPage
  : null; // not used — both pages visible in spread mode
```

Why this over a unified page-index:
- The template's narrative beats are spreads, not pages. Indicator dots stay 5 (one per chapter) in both modes.
- Existing spread-based logic (confetti fires on `currentSpread === TOTAL_SPREADS - 1`, navigation labels) doesn't need rewriting.
- Switching modes mid-view doesn't require re-deriving "where am I now." Spread index always works.

### Navigation step

| Mode | `goNext` | `goPrev` |
|---|---|---|
| Spread | `currentSpread++` (intraSpreadPage stays 0) | `currentSpread--` |
| Single, on page A | `intraSpreadPage = 1` (advance within spread) | `currentSpread--` and `intraSpreadPage = 1` (go to prev spread's right page) |
| Single, on page B | `currentSpread++` and `intraSpreadPage = 0` | `intraSpreadPage = 0` |

Indicator dots: 5 in both modes. Tapping a dot in single-page mode jumps to that spread's page A.

### Layout & animation

**Spread mode:** unchanged. Existing `BookPage` 3D rotation around the spine.

**Single-page mode:**
- `BookPage` checks layout mode. In single mode, only the page matching `currentSpread * 2 + intraSpreadPage` is rendered visible (others have `opacity: 0; pointer-events: none`).
- Geometry: page = `100% × 100%` of the book container (no `width: 50%`, no `right: 0`).
- Animation: a horizontal slide + fade (~400ms). The 3D spine flip doesn't translate to single-page; a slide is the right page-turn metaphor when there's no spine to rotate around.
- Spine, paper texture, dual-page shadow are hidden via media query.

**Book container in single-page mode:**
```css
@media (max-aspect-ratio: 4/3) {
  .book {
    width: min(92vw, 600px);
    height: min(85dvh, 900px);
    aspect-ratio: auto; /* let portrait shape itself */
  }
  .spine,
  .pageInner::before /* paper-texture-on-spread side artifacts */ {
    display: none;
  }
}
```

Page content was authored against ~650×650 squares but tolerates more vertical room — `display: flex; justify-content: center` distributes the extra space sensibly without breaking layout.

### Reduced motion

In single-page mode with `prefers-reduced-motion: reduce`, the slide animation drops to an instant cross-fade (or no animation — content swap on click). Same defensive principle as the existing reduced-motion handling in spread mode.

### Surface-aware nav arrow color

The recent `data-surface` fix (`navSurfaceSpread` lagged state) reads from the `pages` array indexed by spread. In single-page mode it should index by `currentPage`, not spread. Small update — read the active page's variant directly: `pages[currentSpread * 2 + intraSpreadPage].variant` for single mode, current logic for spread mode.

---

## 4. Work breakdown

Five focused commits.

### Commit 1 — `useLayoutMode` hook

**File:** `src/components/features/Invitation/templates/WeddingStorybook/useLayoutMode.ts` _(new)_

`useSyncExternalStore`-based hook returning `"spread" | "single"`. Server snapshot returns `"spread"` (landscape assumed). Subscribes to a single shared `MediaQueryList` instance via `matchMedia("(max-aspect-ratio: 4/3)")`. Exports a `LAYOUT_MODE_QUERY` constant for tests/debugging.

**Acceptance:**
- [ ] Returns `"spread"` on server-render and on initial client paint (no hydration mismatch).
- [ ] Returns `"single"` after hydration on portrait viewports.
- [ ] Switches when window is resized across the breakpoint without setState-in-effect lint errors.

### Commit 2 — Single-page CSS + spine/paper hide

**File:** `WeddingStorybook.module.css`

Add `@media (max-aspect-ratio: 4/3)` block:
- `.book` resizes to portrait-friendly dimensions.
- `.spine`, `.spine::before`, `.spine::after` hidden.
- `.book` perspective and shadow tuned for single-page (less dramatic).
- New `.page--single` modifier sets `width: 100%`, `right: auto`, removes 3D transform.

**File:** `BookPage.module.css`

- `.spineShadow` hidden in portrait mode (no spine to cast against).
- New `.contentSingle` rule for single-page slide animation: `transform: translateX(20px)` → `translateX(0)`.

**Acceptance:**
- [ ] Visual diff on landscape viewports: zero pixels changed.
- [ ] Visual check on portrait viewports: one page fills ~85% of viewport with no spine/paper-spread artifacts.

### Commit 3 — `BookPage` layout-mode branch

**File:** `BookPage.tsx`

Add `layoutMode` prop. In `"single"` mode:
- Drop the `isFlipped`, `isFixedLeft`, `isBackFace` 3D logic.
- Compute visibility: `isVisible = (index === currentSpread * 2 + intraSpreadPage)`.
- Apply `.page--single` modifier; hide invisible pages with `opacity: 0; pointer-events: none`.
- Use the slide animation class from commit 2.

`intraSpreadPage` is a new prop alongside `currentSpread`.

**Acceptance:**
- [ ] In spread mode, behaviour is byte-identical to today.
- [ ] In single mode, exactly one page is visible and interactive.
- [ ] No 3D rotation transforms applied in single mode (verifiable via dev tools).

### Commit 4 — `WeddingStorybook.tsx` navigation + state

**File:** `WeddingStorybook.tsx`

- Read `useLayoutMode()`.
- Add `intraSpreadPage` state.
- Update `goNext`, `goPrev`, `goTo` to branch on mode (per the table in §3).
- Pass `layoutMode` and `intraSpreadPage` to every `<BookPage>`.
- Update `data-surface` derivation: `pages[currentSpread * 2 + intraSpreadPage]?.variant` in single mode; existing logic in spread mode.
- ARIA: update the `aria-label` on `.book` to reflect single-page navigation in single mode (e.g. `"page X of 10"` instead of `"spread X of 5"`).
- `spreadAnnouncement` live region: announce page transitions in single mode.

**Acceptance:**
- [ ] Keyboard, swipe, dot-tap, arrow-button navigation all work in both modes.
- [ ] Mid-spread mode switch (rotate device) preserves position — spread index stable, intraSpreadPage clamped sensibly.
- [ ] Confetti still fires once on the final spread in both modes.
- [ ] Screen-reader announces sensible navigation labels in both modes.

### Commit 5 — Reduced motion + prefers-reduced-data polish

**File:** `WeddingStorybook.module.css`

- `@media (prefers-reduced-motion: reduce) and (max-aspect-ratio: 4/3)`: drop the slide animation, instant content swap.
- Audit and confirm reduced-motion still works in spread mode.

**Acceptance:**
- [ ] Reduced-motion users see no animation in either mode.
- [ ] Animation jank not introduced on lower-powered devices (manually verified on a low-end Android).

---

## 5. File change summary

| File | Change | LOC Δ (est.) |
|---|---|---|
| `useLayoutMode.ts` | New hook | ~+50 |
| `WeddingStorybook.module.css` | Portrait media query, slide animation | ~+60 / -0 |
| `BookPage.module.css` | Hide spine shadow on portrait, single-page transitions | ~+15 / -0 |
| `BookPage.tsx` | Layout-mode branch, props | ~+30 / -10 |
| `WeddingStorybook.tsx` | State, navigation, ARIA | ~+60 / -20 |
| `index.ts` | Export hook (optional) | ~+1 |

Total: ~6 files, ~190 LOC net addition. Page components untouched.

---

## 6. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Spread mode regression from refactored `BookPage` props | Medium | High | Strict no-op branch for `layoutMode === "spread"`; visual diff on a desktop viewport pre/post each commit. |
| iOS Safari layout shift on rotation | Medium | Medium | `useSyncExternalStore` with `MediaQueryList` change events handles the orientation event reliably; manual rotation test on iOS device required. |
| `intraSpreadPage` state drift across mode switches | Low | Medium | When switching landscape→portrait, default `intraSpreadPage = 0`. When switching portrait→landscape, the spread is what matters; `intraSpreadPage` is ignored. Encode this in the mode-change effect. |
| Confetti or other spread-keyed effects misfire | Low | Low | All spread-keyed logic continues to use `currentSpread`; verified by audit. |
| Slide animation feels less "premium" than the 3D flip | Medium | Medium | The 3D flip can't translate to single-page (no spine); a clean slide+fade is the standard premium pattern. Compare side-by-side on real device before judging. |
| Indicator dot count mismatch with single-page navigation | Low | Low | Dots stay 5 (chapters); dot tap jumps to spread's page A. Document the behaviour in QA. |

---

## 7. Manual QA checklist

Before requesting review:

- [ ] Desktop Chrome / Firefox / Safari at 1920×1080: visually identical to today.
- [ ] Desktop Chrome at 1024×1366 simulated (devtools): switches to single-page mode at the breakpoint.
- [ ] Real iPad Pro / iPad mini portrait: one page fills the viewport, no clipping.
- [ ] Real iPhone (any) portrait + landscape: portrait single-page, landscape spread.
- [ ] Rotate iPad mid-view at spread 2: lands on spread 2's page A in single-page mode after rotation.
- [ ] Keyboard navigation in both modes: arrows, Home, End.
- [ ] Swipe navigation in both modes: left/right gestures.
- [ ] Indicator dot tap jumps to the correct chapter in both modes.
- [ ] Surface-aware nav arrow color works on light/accent pages in single-page mode.
- [ ] Reduced-motion: no animation in either mode, content swap is instant.
- [ ] Screen reader (VoiceOver) announces page/spread changes intelligibly in both modes.
- [ ] Confetti fires on the final spread in both modes.
- [ ] Replay button (if shown) works in both modes.

---

## 8. Rollout

**Branch:** `feature/wedding-storybook-portrait-mode`

**Commit strategy:** 5 commits per §4. Each is a small, reviewable unit.

**PR title:** `feat(invitations): WeddingStorybook single-page portrait mode`

**PR size target:** ~190 LOC. Well under any review fatigue threshold.

**Review:** Single reviewer sufficient. Request CSS review from anyone who's recently touched the WeddingStorybook module.

**Tests:** None added — this project's test infrastructure (Vitest, Playwright) is listed in `CLAUDE.md` as "once configured" but isn't wired up. Manual QA checklist above stands in. **Do not** bolt on a one-off vitest config inside this PR; file a separate ticket for invitation test infrastructure if desired.

**Deploy:** Standard Vercel preview → main merge. No feature flag — this is a non-breaking improvement to an existing template (landscape behaviour unchanged).

**Post-deploy monitoring:** Watch the dashboard preview route and `/invite/[token]` for any client errors for 24h after merge.

---

## 9. Follow-ups (separate tickets)

Track separately, do not bundle:

- **Apply the same pattern to other templates** if portrait clipping is observed in `WeddingTemplateV2` or any other template that assumes landscape.
- **Page-level analytics** — emit an event on each page change in single-page mode (separate from the spread-level analytics) to measure whether portrait users actually reach the RSVP page.
- **Premium portrait flip animation** — once the slide+fade ships and we know it works, explore a CSS page-curl or single-page 3D flip for an even more premium portrait feel. Don't bundle here; the slide is the right baseline.
- **Test infrastructure for invitations** — separate ticket to stand up Vitest fixtures for invitation templates so future changes can be regression-tested.

---

## 10. Open questions for the dev team

1. **Breakpoint at `(max-aspect-ratio: 4/3)` vs. orientation + width-based.** Aspect ratio handles a narrow-but-landscape browser window (e.g., a desktop user dragging the window narrow) by treating it as portrait. Is that the desired behaviour, or should desktop users always get spread regardless of window width?
2. **Slide direction in single-page mode.** Right-to-left for forward (matches LTR reading), left-to-right for backward? Or vertical (top→bottom) to differentiate from the spread flip's horizontal motion? Recommend horizontal forward = right-to-left, but worth confirming with design.
3. **Nav-arrow placement in single-page mode.** Currently the arrows sit at left/right of the book. In single-page mode the book is much taller — should arrows stay vertically centered, or move to the bottom corners for thumb reach on mobile? Recommend bottom corners on portrait, but worth confirming.
4. **Accept a longer total navigation distance on portrait.** Spread mode = 5 clicks to traverse; single-page mode = 10. Acceptable cost for content readability, or worth exploring a "skip to RSVP" affordance on portrait?

---

## 11. References

- Existing files: `src/components/features/Invitation/templates/WeddingStorybook/`
- Prior commits: `063da89` (nav arrow contrast), `695d6f8` (`useSyncExternalStore` precedent in `GuestBar`)
- Project conventions: `CLAUDE.md` (root), specifically the "Adding New Invitation Templates" and "React Hooks Rules" sections.
- MDN: [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore), [`MediaQueryList`](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList)

---

## 12. Addendum — Review notes informed by FlipFlap & SplitReveal fixes

_Added after shipping portrait-mode fixes to FlipFlapReveal (commit `5555eac`) and SplitRevealCard (commit `4d8b136`). These are refinements, not redirections — the plan's architecture is sound; this section captures lessons that tune specific steps and flag decisions worth closing before implementation starts._

### 12.1 The single-page mode is the right escalation — don't retreat to "just tighten fonts"

We saw on FlipFlap that once geometry is structurally hostile (landscape-only hinge on portrait), tightening typography buys a few pixels but can't fix the fundamental mismatch. Same applies here: iPad-mini portrait gives 368×369 pages, iPhone gives 195×195 — no `clamp()` tuning makes that readable.

The plan's diagnosis in §1 — "surgical fixes stop overflow but produce cramped content in a small box" — matches exactly what we saw on FlipFlap at ≤400px before adding the vertical hinge. **Reinforcement, not change**: ship the single-page mode; don't let review push you back to micro-tuning.

### 12.2 Apply the "constrain, don't scroll" principle *per page*, not just at the book container

The plan sets `.book { width: min(92vw, 600px); height: min(85dvh, 900px); }` — good. But §4 says "page components untouched," which works on iPad portrait (600×900) but may break on iPhone SE (375×667 → book `345×567`). At that size, a page authored for ~650×650 with fixed `1.8rem` margins is going to overflow the same way it does today.

**Addition to §4 Commit 2**: add a `@media (max-aspect-ratio: 4/3) and (max-height: 700px)` block that applies a single compact-modifier cascade to every `.bookPage` descendant — tighter margins, slightly smaller headings. Same pattern as SplitRevealCard's `.contentInnerCompact`, but applied from `.book` or `.bookPage` down instead of from `.contentInner`. Don't rewrite the 10 page components; cascade one modifier over them.

Keep `overflow: hidden` per page with `justify-content: center` — page-scroll inside a book page would break the "turn pages like a book" metaphor. If a specific page (RSVPRight is the likely candidate) still doesn't fit after the compact cascade at iPhone SE, fall back to a named `.bookPage--scrollable` opt-in on that single page rather than relaxing the discipline globally.

### 12.3 Breakpoint calibration — `4/3` alone is under-specified

SplitRevealCard taught us that one breakpoint isn't enough. `(max-aspect-ratio: 4/3)` flips iPad portrait (834×1194 = 0.70) into single-page correctly, but:

- iPad landscape (1194×834 = 1.43) sits just above the cutoff — fine today, but a 1.34-aspect window is "landscape" by the rule yet visually portrait-ish.
- A desktop user dragging their browser narrow (1200×1000 = 1.20) hits single-page mode, which is probably wrong (Open Question #1 in §10 flags this).

**Refinement**: use `(max-aspect-ratio: 4/3) and (max-width: 1024px)`. Desktop users with narrow browser windows stay in spread mode; tablets and phones in portrait switch. Pattern matches SplitReveal's `(min-width: 500px)` → `(min-width: 1025px)` adjustment — an aspect/width pair catches the actual intent, a single dimension doesn't.

### 12.4 The slide-direction "open question" isn't actually open — test on device and commit

FlipFlap's one-line sign flip (`rotateX(-155deg)` → `rotateX(155deg)`) was the difference between "feels reversed" and "feels natural." Same kind of decision lives in §10 Open Question #2. Don't ship this as an unresolved question — a reviewer will flag it, and the only way to resolve it is with a prototype on a phone for 30 seconds.

**Recommendation**: at §4 Commit 3, build the minimal single-page slide and put it on a real device. Right-to-left is the working default; validate or invert based on feel, then commit the direction and remove the open question before opening the PR. Same hedge logic as "we can roll back if it breaks the design concept" — build, validate, commit.

### 12.5 Quick "rule out the simpler alternative" spike — not to ship, just to defend the choice

Before the 190 LOC / 5-commit build-out, run a 30-minute spike on **rotating the spread axis** on portrait: keep the two-page spread model but stack pages top/bottom (spine becomes horizontal). Each "page" gets ~345×280 on iPhone SE. State model is unchanged; animation axis flips (same lesson as FlipFlap's vertical hinge).

**Expectation**: this will look weird (books open sideways, not up/down) and content-per-page will still be too cramped.
**Outcome**: you rule it out in half an hour and now have a concrete "we tried the simpler thing, here's why it doesn't work" answer for the PR review, instead of an architecture decision that has to be defended from first principles.

### 12.6 Summary of plan edits this addendum implies

| Section | Change |
|---|---|
| §3 breakpoint | `(max-aspect-ratio: 4/3) and (max-width: 1024px)` (was: aspect ratio alone) |
| §4 Commit 2 | Add per-page compact-modifier cascade as contingency for iPhone-SE-sized books |
| §4 Commit 3 | Decide slide direction on-device as part of the commit, not as an open question |
| §10 Open Q #1 | Closed by §12.3 refinement — combine aspect ratio with max-width |
| §10 Open Q #2 | Closed by §12.4 — decide via device prototype, remove from PR |
| §6 Risks | Add: "content still overflows at iPhone SE" — mitigated by §12.2 compact cascade + scrollable-page opt-in for known-dense pages |
| Pre-work | 30-min spike per §12.5 before starting Commit 1, to document why single-page beats axis-rotation |

No change to the commit count, file list, or overall LOC estimate.
