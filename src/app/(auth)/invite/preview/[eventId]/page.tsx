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
  LayeredUnfold,
  CinematicScroll,
  TimeBasedReveal,
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
  customMessage: string | null;
  dressCode: string | null;
  heroImageUrl: string | null;
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

      <div className="pt-12">{renderTemplate()}</div>
    </InvitationShell>
  );
}
