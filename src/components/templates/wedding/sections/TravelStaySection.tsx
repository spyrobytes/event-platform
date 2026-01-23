import { SectionWrapper, SectionTitle } from "../../shared";

type Hotel = {
  name: string;
  address: string;
  bookingUrl?: string;
  blockCode?: string;
  deadline?: string;
};

type TravelStaySectionProps = {
  data: {
    heading?: string;
    hotels: Hotel[];
    notes?: string;
  };
  primaryColor: string;
};

/**
 * Travel & Stay Section - Accommodation information
 *
 * Used by: Classic, Rustic, Destination variants
 * Displays hotel blocks and travel information for guests.
 */
export function TravelStaySection({ data, primaryColor }: TravelStaySectionProps) {
  const { heading = "Travel & Accommodations", hotels, notes } = data;

  return (
    <SectionWrapper ariaLabel="Travel and accommodations">
      <div className="mx-auto max-w-4xl">
        <SectionTitle>
          <span style={{ color: primaryColor }}>{heading}</span>
        </SectionTitle>

        {notes && (
          <p className="mb-8 text-center text-muted-foreground">
            {notes}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {hotels.map((hotel, index) => (
            <div
              key={index}
              className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Hotel icon */}
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <svg
                  className="h-6 w-6"
                  style={{ color: primaryColor }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
                  />
                </svg>
              </div>

              {/* Hotel name */}
              <h3 className="mb-2 text-lg font-semibold">{hotel.name}</h3>

              {/* Address */}
              <p className="mb-3 text-sm text-muted-foreground">{hotel.address}</p>

              {/* Block code */}
              {hotel.blockCode && (
                <div className="mb-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Group Code
                  </p>
                  <p
                    className="font-mono text-lg font-semibold"
                    style={{ color: primaryColor }}
                  >
                    {hotel.blockCode}
                  </p>
                </div>
              )}

              {/* Deadline */}
              {hotel.deadline && (
                <p className="mb-4 text-sm text-muted-foreground">
                  <span className="font-medium">Note:</span> {hotel.deadline}
                </p>
              )}

              {/* Booking link */}
              {hotel.bookingUrl && (
                <a
                  href={hotel.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Book Now
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {hotels.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-muted p-12 text-center">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
              />
            </svg>
            <p className="text-muted-foreground">
              Accommodation details coming soon
            </p>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
