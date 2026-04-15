/**
 * Cinematic Adapters
 *
 * Thin wrappers around existing V2 section components that adapt them
 * to the V3 renderer props contract. This lets the factory use V2 sections
 * as the default "cinematic" renderer variant while new renderers are built.
 */

"use client";

import type {
  SectionRendererProps,
  HeroRendererProps,
  RSVPRendererProps,
  NavRendererProps,
  FooterRendererProps,
  DividerRendererProps,
} from "./types";

// V2 section imports
import { CinematicHero } from "../../wedding-v2/sections/CinematicHero";
import { TimelineStory } from "../../wedding-v2/sections/TimelineStory";
import { MasonryGallery } from "../../wedding-v2/sections/MasonryGallery";
import { WeddingPartyV2 } from "../../wedding-v2/sections/WeddingPartyV2";
import { DetailsV2 } from "../../wedding-v2/sections/DetailsV2";
import { TravelStayV2 } from "../../wedding-v2/sections/TravelStayV2";
import { RegistrySection } from "../../wedding-v2/sections/RegistrySection";
import { ScheduleV2 } from "../../wedding-v2/sections/ScheduleV2";
import { FAQV2 } from "../../wedding-v2/sections/FAQV2";
import { RSVPV2 } from "../../wedding-v2/sections/RSVPV2";
import { AttireV2 } from "../../wedding-v2/sections/AttireV2";
import { ThingsToDoV2 } from "../../wedding-v2/sections/ThingsToDoV2";
import { SpeakersV2 } from "../../wedding-v2/sections/SpeakersV2";
import { SponsorsV2 } from "../../wedding-v2/sections/SponsorsV2";
import { MapV2 } from "../../wedding-v2/sections/MapV2";

// V2 chrome imports
import { Topbar } from "../../wedding-v2/chrome/Topbar";
import { MountainDivider } from "../../wedding-v2/chrome/MountainDivider";
import { WeddingV2Footer } from "../../wedding-v2/WeddingV2Footer";

// V2 section data types
import type {
  GallerySection,
  ScheduleSection,
  StorySection,
  DetailsSection,
  FAQSection,
  TravelStaySection,
  RegistrySection as RegistrySectionType,
  WeddingPartySection,
  AttireSection,
  ThingsToDoSection,
  SpeakersSection,
  SponsorsSection,
  MapSection,
} from "@/schemas/event-page";

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export function CinematicHeroAdapter(props: HeroRendererProps) {
  return (
    <CinematicHero
      config={props.config}
      heroAsset={props.heroAsset}
      scheduleCards={props.scheduleCards}
      hasDetailsSection={props.hasDetailsSection}
      eventRsvpDeadline={props.eventRsvpDeadline}
    />
  );
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

export function CinematicNavAdapter(props: NavRendererProps) {
  return (
    <Topbar
      monogram={props.monogram}
      coupleNames={props.coupleNames}
      dateText={props.dateText}
      sections={props.sections}
      accentColor={props.accentColor}
    />
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

export function CinematicFooterAdapter(props: FooterRendererProps) {
  return (
    <WeddingV2Footer
      monogram={props.monogram}
      coupleNames={props.coupleNames}
      dateText={props.dateText}
      sections={props.sections}
    />
  );
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

export function CinematicDividerAdapter(props: DividerRendererProps) {
  return <MountainDivider flip={props.flip} dividerIndex={props.dividerIndex} />;
}

// ---------------------------------------------------------------------------
// Section renderers — adapt V3 SectionRendererProps to V2 component props
// ---------------------------------------------------------------------------

export function CinematicGalleryAdapter({ data, assets }: SectionRendererProps<GallerySection["data"]>) {
  return <MasonryGallery data={data} assets={assets} />;
}

export function CinematicScheduleAdapter({ data }: SectionRendererProps<ScheduleSection["data"]>) {
  return <ScheduleV2 data={data} />;
}

export function CinematicStoryAdapter({ data, assets }: SectionRendererProps<StorySection["data"]>) {
  return <TimelineStory data={data} assets={assets} />;
}

export function CinematicDetailsAdapter({ data }: SectionRendererProps<DetailsSection["data"]>) {
  return <DetailsV2 data={data} />;
}

export function CinematicFAQAdapter({ data }: SectionRendererProps<FAQSection["data"]>) {
  return <FAQV2 data={data} />;
}

export function CinematicTravelStayAdapter({ data }: SectionRendererProps<TravelStaySection["data"]>) {
  return <TravelStayV2 data={data} />;
}

export function CinematicRegistryAdapter({ data, assets, eventId, eventSlug, registryClaims, canClaim, registryMode }: SectionRendererProps<RegistrySectionType["data"]>) {
  return (
    <RegistrySection
      data={data}
      assets={assets}
      eventId={eventId}
      eventSlug={eventSlug}
      claims={registryClaims}
      canClaim={canClaim}
      mode={registryMode}
    />
  );
}

export function CinematicWeddingPartyAdapter({ data, assets }: SectionRendererProps<WeddingPartySection["data"]>) {
  return <WeddingPartyV2 data={data} assets={assets} />;
}

export function CinematicAttireAdapter({ data }: SectionRendererProps<AttireSection["data"]>) {
  return <AttireV2 data={data} />;
}

export function CinematicThingsToDoAdapter({ data }: SectionRendererProps<ThingsToDoSection["data"]>) {
  return <ThingsToDoV2 data={data} />;
}

export function CinematicSpeakersAdapter({ data, assets }: SectionRendererProps<SpeakersSection["data"]>) {
  return <SpeakersV2 data={data} assets={assets} />;
}

export function CinematicSponsorsAdapter({ data, assets }: SectionRendererProps<SponsorsSection["data"]>) {
  return <SponsorsV2 data={data} assets={assets} />;
}

export function CinematicMapAdapter({ data }: SectionRendererProps<MapSection["data"]>) {
  return <MapV2 data={data} />;
}

export function CinematicRSVPAdapter({ data, eventId }: RSVPRendererProps) {
  return <RSVPV2 data={data} eventId={eventId} />;
}
