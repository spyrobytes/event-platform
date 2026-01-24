/**
 * SectionNav - Floating Section Navigation
 *
 * A subtle, floating dot navigation that appears on the right side
 * of the screen to help users navigate between page sections.
 *
 * @example
 * ```tsx
 * <SectionNavProvider>
 *   <Template>
 *     <Section />
 *     <Section />
 *   </Template>
 *   <SectionNav accentColor="#B76E79" />
 * </SectionNavProvider>
 * ```
 */
export { SectionNav, SectionNavProgress } from "./SectionNav";
export {
  SectionNavProvider,
  useSectionNav,
  useHasSectionNav,
  useSectionNavRef,
  type RegisteredSection,
} from "./SectionNavContext";
