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
 * RSVP Section for Conference template
 * Professional styling with clean lines
 */
export function RSVPSection({ data, eventId, primaryColor }: RSVPSectionProps) {
  const {
    heading = "Register Your Attendance",
    description,
    showMaybeOption = true,
    allowPlusOnes = false,
    maxPlusOnes = 0,
    successMessage,
  } = data;

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
          {/* Professional badge */}
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
