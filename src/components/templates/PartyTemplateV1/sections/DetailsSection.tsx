import { SectionWrapper } from "../../shared";

type DetailsSectionProps = {
  data: {
    dateText: string;
    locationText: string;
  };
  primaryColor: string;
};

/**
 * Party Details Section
 * Fun, playful cards with vibrant styling.
 */
export function DetailsSection({ data, primaryColor }: DetailsSectionProps) {
  return (
    <SectionWrapper ariaLabel="Party details">
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Date Card */}
          <div
            className="group relative overflow-hidden rounded-2xl p-6 text-center text-white shadow-lg transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: primaryColor }}
          >
            {/* Decorative circle */}
            <div
              className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20"
              style={{ backgroundColor: "white" }}
            />

            <div className="relative">
              <div className="mb-3 text-4xl" role="img" aria-label="Calendar">
                📅
              </div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider opacity-80">
                When
              </h3>
              <p className="text-xl font-bold">{data.dateText}</p>
            </div>
          </div>

          {/* Location Card */}
          <div
            className="group relative overflow-hidden rounded-2xl p-6 text-center text-white shadow-lg transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: primaryColor }}
          >
            {/* Decorative circle */}
            <div
              className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full opacity-20"
              style={{ backgroundColor: "white" }}
            />

            <div className="relative">
              <div className="mb-3 text-4xl" role="img" aria-label="Location">
                📍
              </div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider opacity-80">
                Where
              </h3>
              <p className="text-xl font-bold">{data.locationText}</p>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
