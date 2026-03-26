import type { ScheduleSection, ScheduleGroup } from "@/schemas/event-page";

type ScheduleV2Props = { data: ScheduleSection["data"] };

/**
 * Schedule V2 — cinematic wedding template schedule section.
 *
 * Supports two modes:
 * - Grouped: renders day/event groups with headers + nested schedule items (multi-day weddings)
 * - Flat: renders a vertical stack of schedule-item cards (backward compat)
 */
export function ScheduleV2({ data }: ScheduleV2Props) {
  const { items, heading, description, groups } = data;
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;
  const displayHeading = heading || (hasGroups ? "Wedding Weekend" : "Day of Events");
  const kickerText = "Schedule";
  const showKicker = kickerText.toLowerCase() !== displayHeading.toLowerCase();

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
          {showKicker && (
            <p
              className="v2-kicker"
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
              {kickerText}
            </p>
          )}
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "var(--night, #1e1b17)",
            }}
          >
            {displayHeading}
          </h2>
          {description && (
            <p style={{ maxWidth: "56ch", color: "var(--text-2, #786f65)", lineHeight: 1.75, marginTop: 8, marginLeft: "auto", marginRight: "auto" }}>
              {description}
            </p>
          )}
        </div>

        {/* Grouped layout */}
        {hasGroups ? (
          <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(40px, 5vw, 56px)" }}>
            {groups.map((group, gi) => (
              <ScheduleDayGroup key={gi} group={group} isFirst={gi === 0} />
            ))}
          </div>
        ) : (
          /* Flat card list (legacy) */
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
                  location={item.location}
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
        )}
      </div>
    </section>
  );
}

/** Day/event group with header and nested schedule items */
function ScheduleDayGroup({ group, isFirst }: { group: ScheduleGroup; isFirst: boolean }) {
  return (
    <div>
      {/* Separator line (not before first group) */}
      {!isFirst && (
        <div style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--border, #e8e1d6), transparent)",
          marginBottom: "clamp(32px, 4vw, 48px)",
        }} />
      )}

      {/* Group header */}
      <div style={{ marginBottom: "clamp(16px, 2.5vw, 24px)" }}>
        <h3 style={{
          fontFamily: "var(--serif)",
          fontSize: "var(--h3, clamp(1.15rem, 2vw, 1.4rem))",
          fontWeight: 400,
          lineHeight: 1.3,
          color: "var(--night, #1e1b17)",
          marginBottom: 6,
        }}>
          {group.label}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {group.date && (
            <span style={{
              fontSize: "var(--sm, 0.85rem)",
              color: "var(--accent, #7a8c72)",
              fontWeight: 500,
            }}>
              {group.date}
            </span>
          )}
          {group.date && group.location && (
            <span style={{ color: "var(--border, #e8e1d6)" }}>|</span>
          )}
          {group.location && (
            <span style={{
              fontSize: "var(--sm, 0.85rem)",
              color: "var(--text-2, #786f65)",
            }}>
              {group.location}
            </span>
          )}
        </div>
      </div>

      {/* Group items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap, 20px)" }}>
        {group.items.length > 0 ? (
          group.items.map((item, i) => (
            <ScheduleCard
              key={i}
              time={item.time}
              title={item.title}
              description={item.description}
              location={item.location}
            />
          ))
        ) : (
          <div style={{
            border: "2px dashed var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            padding: "clamp(24px, 3vw, 32px)",
            textAlign: "center",
            color: "var(--stone, #a69e93)",
            fontSize: "var(--sm, 0.85rem)",
          }}>
            Schedule items coming soon
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleCard({
  time,
  title,
  description,
  location,
}: {
  time: string;
  title: string;
  description?: string;
  location?: string;
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

      {/* Optional location (overrides group venue) */}
      {location && (
        <p
          style={{
            marginTop: 6,
            fontSize: "var(--sm, 0.85rem)",
            color: "var(--text-3, #a69e93)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {location}
        </p>
      )}

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
