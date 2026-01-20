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

export function ScheduleSection({ data, primaryColor }: ScheduleSectionProps) {
  if (data.items.length === 0) {
    return null;
  }

  return (
    <SectionWrapper ariaLabel="Event schedule" className="bg-muted/30">
      <SectionTitle>Schedule</SectionTitle>
      <div className="mx-auto max-w-2xl">
        <div className="relative">
          {/* Timeline line */}
          <div
            className="absolute left-4 top-0 h-full w-0.5 md:left-1/2 md:-translate-x-1/2"
            style={{ backgroundColor: `${primaryColor}30` }}
          />

          {/* Timeline items */}
          <div className="space-y-8">
            {data.items.map((item, index) => (
              <div
                key={index}
                className="relative flex items-start gap-6 md:gap-8"
              >
                {/* Timeline dot */}
                <div
                  className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-background md:absolute md:left-1/2 md:-translate-x-1/2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 rounded-lg border bg-card p-4 shadow-sm md:w-[calc(50%-2rem)] md:odd:mr-auto md:odd:text-right md:even:ml-auto">
                  <p
                    className="mb-1 text-sm font-semibold"
                    style={{ color: primaryColor }}
                  >
                    {item.time}
                  </p>
                  <h4 className="mb-1 font-medium">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
