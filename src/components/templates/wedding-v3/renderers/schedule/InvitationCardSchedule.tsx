"use client";

/**
 * Invitation Card Schedule — The Fine Art Romance
 *
 * Each event rendered as a formal invitation-style card — centered text,
 * decorative borders, serif typography. Like a collection of event cards
 * laid out on a table.
 */

import type { SectionRendererProps } from "../../types";
import type { ScheduleSection, ScheduleGroup } from "@/schemas/event-page";

export function InvitationCardSchedule({
  data,
}: SectionRendererProps<ScheduleSection["data"]>) {
  const { items, heading, description, groups } = data;
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0", textAlign: "center" }}
      aria-label="Schedule"
      id="schedule"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--sm, 0.85rem)",
            fontStyle: "italic",
            color: "var(--accent, #7a8c72)",
            marginBottom: 8,
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
            marginBottom: "clamp(40px, 5vw, 56px)",
          }}
        >
          {heading || "Ceremony & Reception"}
        </h2>
        {description && (
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--body, 1rem)",
              color: "var(--text-2, #786f65)",
              lineHeight: 1.75,
              maxWidth: "50ch",
              margin: "-20px auto clamp(40px, 5vw, 56px)",
            }}
          >
            {description}
          </p>
        )}

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "clamp(20px, 3vw, 32px)",
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          {hasGroups
            ? groups.map((group, gi) => (
                <InvitationGroupCard key={gi} group={group} />
              ))
            : hasItems
              ? items.map((item, i) => (
                  <InvitationItemCard
                    key={i}
                    time={item.time}
                    title={item.title}
                    description={item.description}
                    location={item.location}
                  />
                ))
              : (
                <p style={{ color: "var(--text-3, #a69e93)", fontFamily: "var(--sans)", gridColumn: "1 / -1" }}>
                  Schedule coming soon
                </p>
              )}
        </div>
      </div>
    </section>
  );
}

function InvitationGroupCard({ group }: { group: ScheduleGroup }) {
  return (
    <div
      style={{
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #e8e1d6)",
        borderRadius: "var(--r, 16px)",
        padding: "clamp(28px, 4vw, 40px) clamp(20px, 3vw, 32px)",
        textAlign: "center",
      }}
    >
      <h3
        style={{
          fontFamily: "var(--serif)",
          fontSize: "var(--h3, clamp(1.15rem, 1.6vw, 1.35rem))",
          fontWeight: 400,
          color: "var(--text, #3d3830)",
          marginBottom: 8,
        }}
      >
        {group.label}
      </h3>
      {group.date && (
        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: "var(--sm, 0.85rem)",
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "var(--accent, #7a8c72)",
            marginBottom: 16,
          }}
        >
          {group.date}
        </p>
      )}
      {/* Decorative rule */}
      <div
        style={{
          width: 32,
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--accent, #7a8c72), transparent)",
          margin: "0 auto 16px",
          opacity: 0.5,
        }}
        aria-hidden="true"
      />
      {group.items.map((item, i) => (
        <div key={i} style={{ marginBottom: i < group.items.length - 1 ? 12 : 0 }}>
          <p
            style={{
              fontFamily: "var(--serif)",
              fontSize: "1rem",
              fontWeight: 400,
              color: "var(--text, #3d3830)",
            }}
          >
            {item.title}
          </p>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              color: "var(--text-3, #a69e93)",
            }}
          >
            {item.time}
            {item.location && ` \u2022 ${item.location}`}
          </p>
        </div>
      ))}
    </div>
  );
}

function InvitationItemCard({
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
        borderRadius: "var(--r, 16px)",
        padding: "clamp(28px, 4vw, 40px) clamp(20px, 3vw, 32px)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--sans)",
          fontSize: "var(--sm, 0.85rem)",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: "var(--accent, #7a8c72)",
          marginBottom: 8,
        }}
      >
        {time}
      </p>
      <h3
        style={{
          fontFamily: "var(--serif)",
          fontSize: "var(--h3, clamp(1.15rem, 1.6vw, 1.35rem))",
          fontWeight: 400,
          color: "var(--text, #3d3830)",
          margin: 0,
        }}
      >
        {title}
      </h3>
      {location && (
        <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm, 0.85rem)", color: "var(--text-3, #a69e93)", marginTop: 6 }}>
          {location}
        </p>
      )}
      {description && (
        <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body, 1rem)", color: "var(--text-2, #786f65)", lineHeight: 1.7, marginTop: 12 }}>
          {description}
        </p>
      )}
    </div>
  );
}
