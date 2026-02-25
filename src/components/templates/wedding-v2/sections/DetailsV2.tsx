import { SectionWrapper, SectionTitle } from "../../shared";

type DetailsV2Props = {
  data: {
    dateText: string;
    locationText: string;
  };
  primaryColor: string;
};

/**
 * Details V2 - Card-based layout with venue highlight and callout box
 */
export function DetailsV2({ data, primaryColor }: DetailsV2Props) {
  const { dateText, locationText } = data;

  return (
    <SectionWrapper ariaLabel="Event details">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>
          <span style={{ color: primaryColor }}>The Details</span>
        </SectionTitle>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Date Card */}
          <div
            className="rounded-2xl border bg-card p-8 text-center shadow-sm"
            style={{ borderColor: `${primaryColor}20` }}
          >
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${primaryColor}12` }}
            >
              <svg
                className="h-7 w-7"
                style={{ color: primaryColor }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Date & Time
            </p>
            <p className="mt-2 text-lg font-semibold">{dateText}</p>
          </div>

          {/* Venue Card */}
          <div
            className="rounded-2xl border bg-card p-8 text-center shadow-sm"
            style={{ borderColor: `${primaryColor}20` }}
          >
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${primaryColor}12` }}
            >
              <svg
                className="h-7 w-7"
                style={{ color: primaryColor }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Venue
            </p>
            <p className="mt-2 text-lg font-semibold">{locationText}</p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
