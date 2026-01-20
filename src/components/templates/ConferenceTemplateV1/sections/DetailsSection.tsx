import { SectionWrapper } from "../../shared";

type DetailsSectionProps = {
  data: {
    dateText: string;
    locationText: string;
  };
  primaryColor: string;
};

/**
 * Conference Details Section
 * Clean, card-based layout with professional styling.
 */
export function DetailsSection({ data, primaryColor }: DetailsSectionProps) {
  return (
    <SectionWrapper ariaLabel="Conference details">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Date Card */}
          <div className="group rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <svg
                  className="h-6 w-6"
                  style={{ color: primaryColor }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Date & Time
                </h3>
                <p className="text-lg font-medium">{data.dateText}</p>
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="group rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <svg
                  className="h-6 w-6"
                  style={{ color: primaryColor }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Venue
                </h3>
                <p className="text-lg font-medium">{data.locationText}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
