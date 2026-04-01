"use client";

/**
 * Vertical Itinerary Schedule — The Editorial
 *
 * Clean typographic schedule with a thin vertical line connecting
 * time markers. No cards, no shadows — just time, title, and details
 * in a strict vertical rhythm. Like a museum exhibition guide.
 */

import type { SectionRendererProps } from "../../types";
import type { ScheduleSection, ScheduleGroup } from "@/schemas/event-page";

export function VerticalItinerary({
  data,
}: SectionRendererProps<ScheduleSection["data"]>) {
  const { items, heading, description, groups } = data;
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;
  const displayHeading = heading || "Schedule";

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
        {/* Left-aligned header */}
        <div style={{ marginBottom: "clamp(48px, 6vw, 72px)" }}>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 500,
              letterSpacing: "0.2em",
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
              fontWeight: 300,
              lineHeight: 1.15,
              color: "var(--text, #3d3830)",
              maxWidth: "24ch",
            }}
          >
            {displayHeading}
          </h2>
          {description && (
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: "var(--body, 1rem)",
                lineHeight: 1.75,
                color: "var(--text-2, #786f65)",
                marginTop: 12,
                maxWidth: "56ch",
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Itinerary */}
        <div style={{ maxWidth: 700 }}>
          {hasGroups ? (
            groups.map((group, gi) => (
              <ItineraryGroup key={gi} group={group} isFirst={gi === 0} />
            ))
          ) : hasItems ? (
            <div style={{ position: "relative", paddingLeft: 32 }}>
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: 5,
                  top: 8,
                  bottom: 8,
                  width: 1,
                  background: "var(--border, #e8e1d6)",
                }}
                aria-hidden="true"
              />
              {items.map((item, i) => (
                <ItineraryItem
                  key={i}
                  time={item.time}
                  title={item.title}
                  description={item.description}
                  location={item.location}
                />
              ))}
            </div>
          ) : (
            <p
              style={{
                color: "var(--text-3, #a69e93)",
                fontFamily: "var(--sans)",
              }}
            >
              Schedule coming soon
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ItineraryGroup({ group, isFirst }: { group: ScheduleGroup; isFirst: boolean }) {
  return (
    <div style={{ marginBottom: "clamp(40px, 5vw, 56px)" }}>
      {/* Separator rule */}
      {!isFirst && (
        <div
          style={{
            height: 1,
            background: "var(--border, #e8e1d6)",
            marginBottom: "clamp(32px, 4vw, 48px)",
          }}
        />
      )}

      {/* Group header */}
      <div style={{ marginBottom: "clamp(20px, 3vw, 32px)" }}>
        <h3
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h3, clamp(1.15rem, 1.6vw, 1.35rem))",
            fontWeight: 400,
            color: "var(--text, #3d3830)",
            marginBottom: 4,
          }}
        >
          {group.label}
        </h3>
        {(group.date || group.location) && (
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              color: "var(--text-3, #a69e93)",
              letterSpacing: "0.05em",
            }}
          >
            {[group.date, group.location].filter(Boolean).join(" \u2022 ")}
          </p>
        )}
      </div>

      {/* Items with vertical line */}
      {group.items.length > 0 && (
        <div style={{ position: "relative", paddingLeft: 32 }}>
          <div
            style={{
              position: "absolute",
              left: 5,
              top: 8,
              bottom: 8,
              width: 1,
              background: "var(--border, #e8e1d6)",
            }}
            aria-hidden="true"
          />
          {group.items.map((item, i) => (
            <ItineraryItem
              key={i}
              time={item.time}
              title={item.title}
              description={item.description}
              location={item.location}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItineraryItem({
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
        position: "relative",
        paddingBottom: "clamp(24px, 3vw, 32px)",
      }}
    >
      {/* Dot marker */}
      <div
        style={{
          position: "absolute",
          left: -32,
          top: 7,
          width: 11,
          height: 11,
          borderRadius: "50%",
          border: "2px solid var(--accent, #7a8c72)",
          background: "var(--bg, #f8f5f0)",
        }}
        aria-hidden="true"
      />

      {/* Time */}
      <p
        style={{
          fontFamily: "var(--sans)",
          fontSize: "var(--sm, 0.85rem)",
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: "var(--accent, #7a8c72)",
          marginBottom: 4,
        }}
      >
        {time}
      </p>

      {/* Title */}
      <h4
        style={{
          fontFamily: "var(--serif)",
          fontSize: "1.1rem",
          fontWeight: 400,
          color: "var(--text, #3d3830)",
          lineHeight: 1.3,
          margin: 0,
        }}
      >
        {title}
      </h4>

      {/* Location */}
      {location && (
        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: "var(--sm, 0.85rem)",
            color: "var(--text-3, #a69e93)",
            marginTop: 4,
          }}
        >
          {location}
        </p>
      )}

      {/* Description */}
      {description && (
        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: "var(--body, 1rem)",
            lineHeight: 1.7,
            color: "var(--text-2, #786f65)",
            marginTop: 8,
            maxWidth: "50ch",
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
