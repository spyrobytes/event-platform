/**
 * Re-export renderer prop types from the V3 type system.
 *
 * Section renderers import from here so they don't depend on the full
 * TemplateDefinition type — keeps the dependency graph clean.
 */
export type {
  SectionRendererProps,
  HeroRendererProps,
  RSVPRendererProps,
  NavRendererProps,
  FooterRendererProps,
  DividerRendererProps,
} from "../types";
