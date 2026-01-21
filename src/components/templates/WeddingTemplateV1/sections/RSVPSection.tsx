"use client";

import { RSVPForm } from "@/components/features/RSVPForm";
import { SectionWrapper, SectionTitle } from "../../shared";

type RSVPSectionProps = {
  data: {
    heading?: string;
    description?: string;
    showMaybeOption?: boolean;
    allowPlusOnes?: boolean;
    maxPlusOnes?: number;
    successMessage?: string;
  };
  eventId: string;
  primaryColor: string;
};

/**
 * RSVP Section for Wedding template
 * Elegant styling with romantic touches
 */
export function RSVPSection({ data, eventId, primaryColor }: RSVPSectionProps) {
  const {
    heading = "RSVP",
    description,
    showMaybeOption = true,
    allowPlusOnes = false,
    maxPlusOnes = 0,
    successMessage,
  } = data;

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
          <RSVPForm
            eventId={eventId}
            showMaybeOption={showMaybeOption}
            plusOnesAllowed={allowPlusOnes ? maxPlusOnes : 0}
            successMessage={successMessage}
            hideCard
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
