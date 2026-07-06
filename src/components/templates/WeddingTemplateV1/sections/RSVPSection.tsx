import { RsvpCta } from "@/components/features/RSVPForm";
import { SectionWrapper, SectionTitle } from "../../shared";

type RSVPSectionProps = {
  data: {
    heading?: string;
    description?: string;
  };
  eventSlug: string;
  primaryColor: string;
};

/**
 * RSVP Section for Wedding template — preview + CTA.
 *
 * The full RSVP flow now lives at `/e/[slug]/rsvp` (code-gated portal).
 * The inline form was decommissioned with PR 5 of the public-portal RSVP
 * rollout — the eventId-only POST path it submitted to was reachable
 * without an invitation code.
 */
export function RSVPSection({ data, eventSlug, primaryColor }: RSVPSectionProps) {
  const { heading = "RSVP", description } = data;

  return (
    <SectionWrapper ariaLabel="RSVP">
      <div className="mx-auto max-w-2xl text-center">
        <SectionTitle>{heading}</SectionTitle>
        {description && (
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="mt-12">
        <div
          className="mx-auto max-w-lg rounded-2xl border bg-card/50 p-8 shadow-sm backdrop-blur-sm"
          style={{ borderColor: `${primaryColor}20` }}
        >
          <RsvpCta eventSlug={eventSlug} accentHex={primaryColor} />
        </div>
      </div>
    </SectionWrapper>
  );
}
