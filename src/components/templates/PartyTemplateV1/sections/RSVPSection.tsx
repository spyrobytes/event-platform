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
 * RSVP Section for Party template — preview + CTA. Full code-gated flow at
 * `/e/[slug]/rsvp`. See WeddingTemplateV1 for the security rationale.
 */
export function RSVPSection({ data, eventSlug, primaryColor }: RSVPSectionProps) {
  const { heading = "Join the Party!", description } = data;

  return (
    <SectionWrapper ariaLabel="RSVP">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 text-4xl">🎉</div>
        <SectionTitle>{heading}</SectionTitle>
        {description && (
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="mt-12">
        <div
          className="relative mx-auto max-w-lg overflow-hidden rounded-3xl border-4 bg-card p-8 shadow-xl"
          style={{ borderColor: primaryColor }}
        >
          <div
            className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20"
            style={{ backgroundColor: primaryColor }}
          />
          <div
            className="absolute -bottom-4 -left-4 h-12 w-12 rounded-full opacity-20"
            style={{ backgroundColor: primaryColor }}
          />

          <div className="mb-6 text-center">
            <span className="text-2xl">✨</span>
            <span
              className="mx-2 text-lg font-bold"
              style={{ color: primaryColor }}
            >
              Let us know you&apos;re coming!
            </span>
            <span className="text-2xl">✨</span>
          </div>

          <RsvpCta eventSlug={eventSlug} label="RSVP →" />
        </div>
      </div>
    </SectionWrapper>
  );
}
