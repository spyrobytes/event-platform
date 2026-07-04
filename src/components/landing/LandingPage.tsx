import { GlassHeader } from "./nav";
import {
  HeroMontage,
  AssuranceStrip,
  ProductValueSplit,
  TemplateShowcase,
  CreationDemo,
  UseCaseGrid,
  FinalCTA,
  Footer,
} from "./sections";

/**
 * Premium Landing Page
 *
 * A scroll-driven narrative landing page featuring:
 * - Glassmorphic floating header
 * - Animated hero montage with image cycling
 * - Scroll-triggered section animations
 * - Interactive creation demo with typewriter effect
 * - Reduced motion support for accessibility
 */
export function LandingPage() {
  return (
    <>
      {/* Skip to content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-black focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>
      <main id="main-content" className="min-h-screen bg-white">
        <GlassHeader />
        <HeroMontage />
        <AssuranceStrip />
        <ProductValueSplit />
        <TemplateShowcase />
        <CreationDemo />
        <UseCaseGrid />
        <FinalCTA />
        <Footer />
      </main>
    </>
  );
}
