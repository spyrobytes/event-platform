import { SectionWrapper } from "../../shared";

type DetailsSectionProps = {
  data: {
    dateText: string;
    locationText: string;
  };
  primaryColor: string;
};

export function DetailsSection({ data, primaryColor }: DetailsSectionProps) {
  return (
    <SectionWrapper ariaLabel="Event details">
      <div className="mx-auto max-w-2xl">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Date */}
          <div className="flex flex-col items-center text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <svg
                className="h-8 w-8"
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
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              When
            </h3>
            <p className="text-lg font-medium">{data.dateText}</p>
          </div>

          {/* Location */}
          <div className="flex flex-col items-center text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <svg
                className="h-8 w-8"
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
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Where
            </h3>
            <p className="text-lg font-medium">{data.locationText}</p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
