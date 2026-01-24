import { GlassHeader } from "./nav";
import {
  HeroMontage,
  TrustStrip,
  ProductValueSplit,
  CreationDemo,
  TechCredibility,
  MissionStatement,
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
 * - Animated tech flow diagram
 * - Reduced motion support for accessibility
 */
export function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <GlassHeader />
      <HeroMontage />
      <TrustStrip />
      <ProductValueSplit />
      <CreationDemo />
      <UseCaseGrid />
      <TechCredibility />
      <MissionStatement />
      <FinalCTA />
      <Footer />
    </main>
  );
}
