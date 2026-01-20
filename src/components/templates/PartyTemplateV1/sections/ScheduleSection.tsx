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
 * Party Schedule Section
 * Fun timeline with playful styling and emoji decorations.
 */
export function ScheduleSection({ data, primaryColor }: ScheduleSectionProps) {
  if (data.items.length === 0) {
    return null;
  }

  // Fun emojis to cycle through for timeline items
  const emojis = ["🎈", "🎊", "🎁", "🍰", "🎵", "💃", "🥳", "✨"];

  return (
    <SectionWrapper ariaLabel="Party schedule" className="bg-muted/30">
      <SectionTitle>What&apos;s Happening</SectionTitle>
      <div className="mx-auto max-w-2xl">
        <div className="space-y-6">
          {data.items.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-4"
            >
              {/* Emoji indicator */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-md"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                {emojis[index % emojis.length]}
              </div>

              {/* Content */}
              <div className="flex-1 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-sm font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {item.time}
                  </span>
                </div>
                <h4 className="text-lg font-bold">{item.title}</h4>
                {item.description && (
                  <p className="mt-1 text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
