import type { ScheduleSection } from "@/schemas/event-page";

type ScheduleV2Props = { data: ScheduleSection["data"] };

/**
 * Schedule V2 — cinematic wedding template schedule section.
 *
 * Renders a vertical stack of schedule-item cards with left accent stripe,
 * time callout, title, and optional description.
 */
export function ScheduleV2({ data }: ScheduleV2Props) {
  const { items } = data;
  const hasItems = items && items.length > 0;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Schedule"
      id="schedule"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 500,
              letterSpacing: ".18em",
              textTransform: "uppercase" as const,
              color: "var(--accent, #7a8c72)",
              marginBottom: 12,
            }}
          >
            Schedule
          </p>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "var(--night, #1e1b17)",
            }}
          >
            Day of Events
          </h2>
        </div>

        {/* Card list */}
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--gap, 20px)",
          }}
        >
          {hasItems ? (
            items.map((item, i) => (
              <ScheduleCard
                key={i}
                time={item.time}
                title={item.title}
                description={item.description}
              />
            ))
          ) : (
            <div
              style={{
                border: "2px dashed var(--border, #e8e1d6)",
                borderRadius: "var(--r-lg, 24px)",
                padding: "clamp(32px, 4vw, 48px)",
                textAlign: "center",
                color: "var(--stone, #a69e93)",
                fontFamily: "var(--sans)",
                fontSize: "var(--body, 1rem)",
              }}
            >
              Schedule coming soon
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ScheduleCard({
  time,
  title,
  description,
}: {
  time: string;
  title: string;
  description?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #e8e1d6)",
        borderRadius: "var(--r-lg, 24px)",
        padding: "clamp(24px, 3vw, 32px)",
        paddingLeft: "clamp(28px, 3.5vw, 40px)",
        boxShadow: "var(--shadow)",
        position: "relative",
        overflow: "hidden",
        transition:
          "transform .4s var(--ease-out-expo, ease), box-shadow .4s var(--ease-out-expo, ease)",
      }}
    >
      {/* Left accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 3,
          background:
            "linear-gradient(180deg, var(--sage-l, #a8b8a0), var(--accent, #7a8c72))",
          opacity: 0.7,
        }}
      />

      {/* Time */}
      <p
        style={{
          fontFamily: "var(--serif)",
          fontSize: "var(--h3, clamp(1.15rem, 2vw, 1.4rem))",
          fontWeight: 400,
          color: "var(--accent, #7a8c72)",
          marginBottom: 4,
          lineHeight: 1.2,
        }}
      >
        {time}
      </p>

      {/* Title */}
      <h3
        style={{
          fontFamily: "var(--serif)",
          fontSize: "1.15rem",
          fontWeight: 400,
          lineHeight: 1.3,
          color: "var(--night, #1e1b17)",
          margin: 0,
        }}
      >
        {title}
      </h3>

      {/* Optional description */}
      {description && (
        <p
          style={{
            marginTop: 8,
            fontSize: "var(--body, 1rem)",
            lineHeight: 1.75,
            color: "var(--text-2, #786f65)",
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
