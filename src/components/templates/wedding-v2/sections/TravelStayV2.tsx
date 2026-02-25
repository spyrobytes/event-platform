import { SectionWrapper, SectionTitle } from "../../shared";
import type { Airport } from "@/schemas/event-page";

type Hotel = {
  name: string;
  address: string;
  bookingUrl?: string;
  blockCode?: string;
  deadline?: string;
};

type TravelStayV2Props = {
  data: {
    heading?: string;
    hotels: Hotel[];
    notes?: string;
    airports?: Airport[];
    tips?: string[];
  };
  primaryColor: string;
};

/**
 * Travel & Stay V2 - Airports, hotel cards with block codes, tips callout
 */
export function TravelStayV2({ data, primaryColor }: TravelStayV2Props) {
  const {
    heading = "Travel & Accommodations",
    hotels,
    notes,
    airports = [],
    tips = [],
  } = data;

  return (
    <SectionWrapper ariaLabel="Travel and accommodations">
      <div className="mx-auto max-w-4xl">
        <SectionTitle>
          <span style={{ color: primaryColor }}>{heading}</span>
        </SectionTitle>

        {notes && (
          <p className="mb-8 text-center text-muted-foreground">{notes}</p>
        )}

        {/* Airports */}
        {airports.length > 0 && (
          <div className="mb-10">
            <h3
              className="mb-4 text-center text-sm font-medium uppercase tracking-widest"
              style={{ color: primaryColor }}
            >
              Nearest Airports
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              {airports.map((airport, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-sm"
                >
                  <svg
                    className="h-5 w-5 shrink-0"
                    style={{ color: primaryColor }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold">
                      <span style={{ color: primaryColor }}>{airport.code}</span>
                      {" — "}
                      {airport.name}
                    </p>
                    {airport.distance && (
                      <p className="text-xs text-muted-foreground">
                        {airport.distance}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotels */}
        <div className="grid gap-6 md:grid-cols-2">
          {hotels.map((hotel, index) => (
            <div
              key={index}
              className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
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

              <h3 className="mb-2 text-lg font-semibold">{hotel.name}</h3>
              <p className="mb-3 text-sm text-muted-foreground">{hotel.address}</p>

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

              {hotel.deadline && (
                <p className="mb-4 text-sm text-muted-foreground">
                  <span className="font-medium">Note:</span> {hotel.deadline}
                </p>
              )}

              {hotel.bookingUrl && (
                <a
                  href={hotel.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Book Now
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Tips Callout */}
        {tips.length > 0 && (
          <div
            className="mt-8 rounded-2xl border-l-4 bg-card p-6"
            style={{ borderColor: primaryColor }}
          >
            <h3
              className="mb-3 text-sm font-medium uppercase tracking-widest"
              style={{ color: primaryColor }}
            >
              Travel Tips
            </h3>
            <ul className="space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span style={{ color: primaryColor }} aria-hidden="true">
                    &bull;
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {hotels.length === 0 && airports.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-muted p-12 text-center">
            <p className="text-muted-foreground">
              Accommodation details coming soon
            </p>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
