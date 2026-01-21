import { SectionWrapper, SectionTitle } from "../../shared";

type ScheduleItem = {
  time: string;
  title: string;
  description?: string;
};

type ScheduleSectionProps = {
  data: {
    items: ScheduleItem[];
  };
  primaryColor: string;
};

/**
 * Conference Schedule Section
 * Professional agenda layout with clear time slots and session cards.
 */
export function ScheduleSection({ data, primaryColor }: ScheduleSectionProps) {
  if (data.items.length === 0) {
    return null;
  }

  return (
    <SectionWrapper ariaLabel="Conference agenda" className="bg-muted/30">
      <SectionTitle>Agenda</SectionTitle>
      <div className="mx-auto max-w-3xl">
        <div className="space-y-4">
          {data.items.map((item, index) => (
            <div
              key={index}
              className="flex gap-4 rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md md:gap-6"
            >
              {/* Time badge */}
              <div className="shrink-0">
                <div
                  className="rounded-lg px-3 py-2 text-center font-mono text-sm font-semibold"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }}
                >
                  {item.time}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <h4 className="font-semibold">{item.title}</h4>
                {item.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Session indicator */}
              <div
                className="hidden h-full w-1 shrink-0 rounded-full md:block"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
