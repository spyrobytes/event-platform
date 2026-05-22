"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  InvitationShell,
  InvitationCard,
  EnvelopeReveal,
  EnvelopeRevealV2,
  SplitRevealCard,
  SplitRevealCardV2,
  LayeredUnfold,
  CinematicScroll,
  TimeBasedReveal,
  TimeBasedRevealV2,
  GoldenCardReveal,
  FlipFlapReveal,
  WeddingStorybook,
  templateMetadata,
  type TemplateId,
} from "@/components/features/Invitation";
import type { ThemeId, TypographyPair } from "@/lib/invitation-themes";
import type { InvitationData, VenueInfo } from "@/schemas/invitation";

type EventData = {
  id: string;
  title: string;
  startAt: string;
  timezone: string;
  venueName: string | null;
  address: string | null;
  city: string | null;
  coverImageUrl: string | null;
};

type InvitationConfigData = {
  template: string;
  themeId: string;
  typographyPair: string;
  textDirection: string;
  coupleDisplayName: string | null;
  person1Name: string | null;
  person2Name: string | null;
  headerText: string | null;
  headerMode: string;
  person1FamilyName: string | null;
  person2FamilyName: string | null;
  familyInviteText: string | null;
  eventTypeText: string | null;
  monogram: string | null;
  customMessage: string | null;
  dressCode: string | null;
  heroImageUrl: string | null;
  couplePhotoUrl: string | null;
  venuePhotoUrl: string | null;
  ceremonyDate: string | null;
  ceremonyTime: string | null;
  ceremonyVenue: string | null;
  ceremonyAddress: string | null;
  receptionDate: string | null;
  receptionTime: string | null;
  receptionVenue: string | null;
  receptionAddress: string | null;
  rsvpDeadline: string | null;
  storyHeading: string | null;
  storyParagraphs: string[];
  timelineJson: Array<{ date: string; label: string; description?: string }> | null;
  person1Quote: string | null;
  person1QuoteAttr: string | null;
  person2Quote: string | null;
  person2QuoteAttr: string | null;
};

export default function InvitationPreviewPage() {
  const params = useParams<{ eventId: string }>();
  const { getIdToken } = useAuthContext();

  const [event, setEvent] = useState<EventData | null>(null);
  const [config, setConfig] = useState<InvitationConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        // Fetch event and config in parallel
        const [eventResponse, configResponse] = await Promise.all([
          fetch(`/api/events/${params.eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/events/${params.eventId}/invitation-config`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!eventResponse.ok) {
          if (eventResponse.status === 404) {
            throw new Error("Event not found");
          }
          throw new Error("Failed to fetch event");
        }

        const eventData = await eventResponse.json();
        setEvent(eventData.data);

        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.data) {
            setConfig(configData.data);
          } else {
            setError("No invitation configuration found. Please configure your invitation first.");
          }
        } else {
          setError("Failed to fetch invitation configuration");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load preview");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.eventId, getIdToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !event || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Preview Unavailable</h1>
          <p className="text-muted-foreground">{error || "Unable to load preview"}</p>
          <Link href={`/dashboard/events/${params.eventId}/invitation`}>
            <Button>Configure Invitation</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get theme and typography configuration
  const themeId: ThemeId = (config.themeId as ThemeId) || "ivory";
  const typographyPair: TypographyPair = (config.typographyPair as TypographyPair) || "classic";
  const textDirection = config.textDirection === "RTL" ? "rtl" : "ltr";

  // Build preview invitation data
  const venue: VenueInfo = {
    name: event.venueName || "The Grand Ballroom",
    address: event.address || "123 Celebration Avenue",
    city: event.city || "New York",
    state: undefined,
    zipCode: undefined,
  };

  const eventTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone,
  }).format(new Date(event.startAt));

  const invitationData: InvitationData = {
    coupleNames: config.coupleDisplayName || event.title,
    eventTitle: event.title,
    eventDate: new Date(event.startAt),
    eventTime,
    timezone: event.timezone,
    venue,
    inviteeName: "Preview Guest",
    salutation: "Dear",
    dressCode: config.dressCode || undefined,
    customMessage: config.customMessage || undefined,
    heroImageUrl: config.heroImageUrl || event.coverImageUrl || undefined,
    rsvpUrl: "#preview",
    // Structured names and customizable wording
    person1Name: config.person1Name || undefined,
    person2Name: config.person2Name || undefined,
    headerText: config.headerText || undefined,
    headerMode: config.headerMode === "traditional" ? "traditional" : undefined,
    person1FamilyName: config.person1FamilyName || undefined,
    person2FamilyName: config.person2FamilyName || undefined,
    familyInviteText: config.familyInviteText || undefined,
    eventTypeText: config.eventTypeText || undefined,
    monogram: config.monogram || undefined,
    // Wedding Storybook extended fields
    couplePhotoUrl: config.couplePhotoUrl || undefined,
    venuePhotoUrl: config.venuePhotoUrl || undefined,
    ceremonyDate: config.ceremonyDate || undefined,
    ceremonyTime: config.ceremonyTime || undefined,
    ceremonyVenue: config.ceremonyVenue || undefined,
    ceremonyAddress: config.ceremonyAddress || undefined,
    receptionDate: config.receptionDate || undefined,
    receptionTime: config.receptionTime || undefined,
    receptionVenue: config.receptionVenue || undefined,
    receptionAddress: config.receptionAddress || undefined,
    rsvpDeadline: config.rsvpDeadline || undefined,
    storyHeading: config.storyHeading || undefined,
    storyParagraphs: config.storyParagraphs?.length ? config.storyParagraphs : undefined,
    timeline: config.timelineJson ?? undefined,
    person1Quote: config.person1Quote || undefined,
    person1QuoteAttr: config.person1QuoteAttr || undefined,
    person2Quote: config.person2Quote || undefined,
    person2QuoteAttr: config.person2QuoteAttr || undefined,
  };

  // Get template configuration
  const templateId = (config.template as TemplateId) || "ENVELOPE_REVEAL";
  const templateMeta = templateMetadata[templateId];
  const isDataDriven = templateMeta?.type === "data-driven";

  // Render the appropriate template
  const renderTemplate = () => {
    if (isDataDriven) {
      switch (templateId) {
        case "LAYERED_UNFOLD":
          return <LayeredUnfold data={invitationData} showReplay={true} />;
        case "CINEMATIC_SCROLL":
          return <CinematicScroll data={invitationData} showReplay={true} />;
        case "TIME_BASED_REVEAL":
          return <TimeBasedReveal data={invitationData} showReplay={true} />;
        case "TIME_BASED_REVEAL_V2":
          return <TimeBasedRevealV2 data={invitationData} showReplay={true} />;
        case "SPLIT_REVEAL":
          return <SplitRevealCard data={invitationData} showReplay={true} />;
        case "SPLIT_REVEAL_V2":
          return <SplitRevealCardV2 data={invitationData} showReplay={true} />;
        case "GOLDEN_CARD_REVEAL":
          return <GoldenCardReveal data={invitationData} showReplay={true} showHint={true} />;
        case "FLIP_FLAP_REVEAL":
          return <FlipFlapReveal data={invitationData} showCloseButton={true} showHint={true} />;
        case "WEDDING_STORYBOOK":
          return (
            <WeddingStorybook
              data={invitationData}
              showHint={true}
              theme={themeId as "ivory" | "blush" | "sage" | "midnight" | "champagne"}
            />
          );
        default:
          return (
            <EnvelopeReveal showClose={true}>
              <InvitationCard data={invitationData} rsvpButtonText="RSVP" showRsvpButton={true} />
            </EnvelopeReveal>
          );
      }
    }

    // Wrapper-style templates
    if (templateId === "ENVELOPE_REVEAL_V2") {
      return (
        <EnvelopeRevealV2 showClose={true} addresseeName="Preview Guest">
          <InvitationCard data={invitationData} rsvpButtonText="RSVP" showRsvpButton={true} />
        </EnvelopeRevealV2>
      );
    }

    // Default to EnvelopeReveal V1
    return (
      <EnvelopeReveal showClose={true}>
        <InvitationCard data={invitationData} rsvpButtonText="RSVP" showRsvpButton={true} />
      </EnvelopeReveal>
    );
  };

  return (
    <InvitationShell themeId={themeId} typographyPair={typographyPair} textDirection={textDirection}>
      {/* Preview banner */}
      <div className="fixed top-0 left-0 right-0 bg-[var(--inv-accent)] text-[var(--inv-card-bg)] text-center py-2 px-4 z-50 text-sm font-medium flex items-center justify-center gap-4">
        <span>Preview Mode — This is how guests will see your invitation</span>
        <Link href={`/dashboard/events/${params.eventId}/invitation`}>
          <button className="px-3 py-1 bg-[var(--inv-card-bg)] text-[var(--inv-accent)] rounded text-xs font-semibold hover:opacity-90">
            Back to Editor
          </button>
        </Link>
      </div>

      <div className={isDataDriven ? undefined : "pt-16"}>{renderTemplate()}</div>
    </InvitationShell>
  );
}
