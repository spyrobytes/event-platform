"use client";

/**
 * Concise Essentials Schedule — The Intimate Note
 *
 * Minimal schedule rendering — just the essential info in a
 * compact, centered layout. No cards, no decoration, no icons.
 * Time and title on one line, separated by an em dash.
 */

import type { SectionRendererProps } from "../../types";
import type { ScheduleSection } from "@/schemas/event-page";

export function ConciseEssentials({
  data,
}: SectionRendererProps<ScheduleSection["data"]>) {
  const { items, heading, description, groups } = data;
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;
  const displayHeading = heading || "Schedule";

  return (
    <section
      style={{
        padding: "var(--section-y, 96px) 0",
        textAlign: "center",
      }}
      aria-label="Schedule"
      id="schedule"
    >
      <div
        style={{
          width: "min(var(--max, 800px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 300,
            lineHeight: 1.15,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(8px, 1vw, 12px)",
          }}
        >
          {displayHeading}
        </h2>

        {description && (
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--body, 1rem)",
              color: "var(--text-2, #786f65)",
              lineHeight: 1.75,
              maxWidth: "44ch",
              margin: "0 auto clamp(32px, 4vw, 48px)",
            }}
          >
            {description}
          </p>
        )}

        {/* Schedule items */}
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(12px, 2vw, 20px)",
          }}
        >
          {hasGroups ? (
            groups.map((group, gi) => (
              <div key={gi}>
                {gi > 0 && (
                  <div
                    style={{
                      height: 1,
                      background: "var(--border, #e8e1d6)",
                      margin: "clamp(16px, 2vw, 24px) 0",
                    }}
                  />
                )}
                {group.label && (
                  <p
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "var(--sm, 0.85rem)",
                      fontWeight: 500,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase" as const,
                      color: "var(--accent, #7a8c72)",
                      marginBottom: "clamp(8px, 1vw, 12px)",
                    }}
                  >
                    {group.label}
                  </p>
                )}
                {group.items.map((item, i) => (
                  <EssentialItem key={i} time={item.time} title={item.title} />
                ))}
              </div>
            ))
          ) : hasItems ? (
            items.map((item, i) => (
              <EssentialItem key={i} time={item.time} title={item.title} />
            ))
          ) : (
            <p style={{ color: "var(--text-3, #a69e93)", fontFamily: "var(--sans)" }}>
              Schedule coming soon
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function EssentialItem({ time, title }: { time: string; title: string }) {
  return (
    <p
      style={{
        fontFamily: "var(--sans)",
        fontSize: "var(--body, 1rem)",
        color: "var(--text-2, #786f65)",
        lineHeight: 1.5,
      }}
    >
      <span
        style={{
          fontWeight: 500,
          color: "var(--text, #3d3830)",
        }}
      >
        {time}
      </span>
      {" \u2014 "}
      {title}
    </p>
  );
}
