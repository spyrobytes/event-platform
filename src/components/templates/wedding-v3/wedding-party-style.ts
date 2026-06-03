import type { TemplateDefinition, WeddingPartyRendererId } from "./types";

/**
 * Resolve which wedding-party renderer id a section should use.
 *
 * If the template declares curated `weddingPartyStyleOptions`, the organizer's
 * `displayStyle` selects among them (an unset/unknown value falls back to the
 * first option, the default); otherwise the template's fixed
 * `weddingPartyRenderer` is used. Returns `undefined` when neither is set, so
 * callers fall through to the cinematic default via `getWeddingPartyRenderer`.
 *
 * Pure with type-only imports, so it stays unit-testable without pulling the
 * renderer component tree (and its next/font imports).
 */
export function resolveWeddingPartyStyleId(
  definition: Pick<TemplateDefinition, "weddingPartyRenderer" | "weddingPartyStyleOptions">,
  displayStyle: string | undefined,
): WeddingPartyRendererId | undefined {
  const options = definition.weddingPartyStyleOptions;
  if (options && options.length > 0) {
    return (options.find((o) => o.value === displayStyle) ?? options[0]).renderer;
  }
  return definition.weddingPartyRenderer;
}
