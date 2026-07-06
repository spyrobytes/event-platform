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
 * RSVP Section for Conference template — preview + CTA. The full code-gated
 * registration flow lives at `/e/[slug]/rsvp`. See WeddingTemplateV1 for the
 * security rationale behind the inline-form removal.
 */
export function RSVPSection({ data, eventSlug, primaryColor }: RSVPSectionProps) {
  const { heading = "Register Your Attendance", description } = data;

  return (
    <SectionWrapper ariaLabel="Registration">
      <div className="mx-auto max-w-2xl text-center">
        <SectionTitle>{heading}</SectionTitle>
        {description && (
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="mt-12">
        <div
          className="mx-auto max-w-lg rounded-xl border-2 bg-card p-8 shadow-lg"
          style={{ borderColor: primaryColor }}
        >
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Secure Registration
          </div>

          <RsvpCta eventSlug={eventSlug} label="Register" accentHex={primaryColor} />
        </div>
      </div>
    </SectionWrapper>
  );
}
