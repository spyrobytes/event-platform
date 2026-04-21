# Pre-GA: unpin eslint-plugin-react-hooks and fix React Compiler lint errors

**Status:** Backlog — address before GA
**Owner:** _unassigned_
**Effort estimate:** 2–4 hours of targeted refactors
**Blocks:** public launch readiness (not local dev, not deploy)
**Filed:** 2026-04-21

---

## Context

During the Tier 1 dependency bump (commit `7e2a0ef`), `npm update` pulled `eslint-plugin-react-hooks` from **7.0.1 → 7.1.1**. The minor bump enabled stricter React Compiler-style rules that flagged **32 errors across ~10 files**. To keep the bump commit scope-clean, the plugin was pinned at `^7.0.1` in `package.json` and a follow-up (this doc) filed instead of fixing the underlying code inline.

CLAUDE.md already documents two of these rules as enforced-errors (`react-hooks/set-state-in-effect`, `react-hooks/immutability`). The 7.1.x update didn't invent new policy — it broadened detection so previously-missed violations surface. The patterns are legitimate bugs or near-bugs under React's concurrent rendering model.

## Rule categories surfaced

| Rule (as reported) | What it catches | Typical fix |
|---|---|---|
| "Calling setState synchronously within an effect" | `setState(value)` as the first body of `useEffect(() => { ... }, [])` | Replace with a lazy `useState(() => initialValue)` initialiser; leave the effect to subscribe to *changes* only. Pattern documented in CLAUDE.md §React Hooks Rules. |
| "Cannot create components during render" | Component constructors/factories defined inline in the render path of another component | Lift the inner component to module scope (or memo it with `useCallback`/`useMemo` if its identity must be stable per instance). |
| "Cannot access refs during render" | Reading `ref.current` in the component body (outside effects/event handlers) | Move the read into an event handler or a layout effect; or convert to state if the value should drive rendering. |
| "Cannot reassign variable after render completes" | Mutating a captured `let` after React has committed | Replace with `useState` / `useReducer`, or derive during render. |

## Affected files

From `npm run lint` after unpinning to 7.1.x (snapshot at time of filing; file list may shift as code evolves):

| File | Rule hits |
|---|---|
| `src/app/(admin)/efx-ctrl/events/page.tsx` | setState-in-effect |
| `src/app/(admin)/efx-ctrl/invites/page.tsx` | setState-in-effect |
| `src/app/(admin)/efx-ctrl/organizers/page.tsx` | setState-in-effect |
| `src/app/(auth)/dashboard/events/[id]/page-editor/page.tsx` | mixed |
| `src/app/(auth)/dashboard/events/[id]/page-preview/page.tsx` | create-components-during-render, reassign-after-render |
| `src/app/(auth)/dashboard/events/[id]/registry/page.tsx` | setState-in-effect |
| `src/app/(auth)/dashboard/page.tsx` | setState-in-effect |
| `src/components/auth/AuthGuard.tsx` | setState-in-effect (two sites) |
| `src/components/features/Analytics/AnalyticsSnapshot.tsx` | setState-in-effect, access-refs-during-render (multiple) |
| `docs/gallery/MasonryGallery.tsx` | setState-in-effect (not in `src/` — may be deletable or lint-excluded) |

The `AnalyticsSnapshot.tsx` ref-access hits cluster on lines 165–167 (~10 diagnostics) — likely one refactor clears all of them.

## Execution plan

1. Unpin: remove `eslint-plugin-react-hooks` from `devDependencies` in `package.json` so it floats with `eslint-config-next`. Run `npm install`.
2. `npm run lint` — capture the current violation list (may differ from the snapshot above as the codebase evolves).
3. Walk the files in order, applying the fix patterns in the table above. The `setState-in-effect` cases are the most mechanical; the `AnalyticsSnapshot` ref-access cluster is the richest — budget the most time there.
4. Re-run `npm run lint` + `npm run typecheck` + `npm run build`. All three must stay clean.
5. Delete or lint-exclude `docs/gallery/MasonryGallery.tsx` if it's a demo artifact not intended for CI linting.
6. Commit as focused chunks (one per file or small cluster) to keep bisect useful if any fix regresses runtime behaviour.

## Why this is not merge-blocking for deploy

- `eslint-plugin-react-hooks` pinning does not affect the production bundle or runtime behaviour — it's a lint-only concern.
- CI keeps passing because lint is green under `^7.0.1`.
- The patterns these rules catch are *soft* concurrency risks (cascading renders, stale refs). They're worth fixing, but the app has shipped with them for a while without reported issues.

## Why it *is* GA-blocking

- Post-GA, any dev running `npm update` will see 32 red errors on CI and be unable to merge until fixed. A tight loop there will block unrelated work.
- The rules catch real patterns that can surface as subtle bugs under React's concurrent features (Suspense boundaries, transitions). Easier to fix now in batch than to chase a flaky repro in prod.

## References

- Tier 1 bump commit: `7e2a0ef`
- CLAUDE.md §React Hooks Rules — existing documented rules
- React Compiler ESLint rules: https://react.dev/learn/react-compiler (when public)
