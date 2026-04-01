"use client";

/**
 * Curved Stacked Schedule — The Garden House
 *
 * Organic rounded cards stacked vertically. Each card has generous
 * border-radius and warm earth tones. The curved shape language
 * matches the arch hero and soft masonry gallery.
 */

import type { SectionRendererProps } from "../../types";
import type { ScheduleSection, ScheduleGroup } from "@/schemas/event-page";

export function CurvedStacked({
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
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 300,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(8px, 1vw, 12px)",
          }}
        >
          {heading || "Weekend Events"}
        </h2>
        {description && (
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--body, 1rem)",
              color: "var(--text-2, #786f65)",
              lineHeight: 1.75,
              maxWidth: "50ch",
              margin: "0 auto clamp(32px, 4vw, 48px)",
            }}
          >
            {description}
          </p>
        )}

        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(12px, 2vw, 16px)",
          }}
        >
          {hasGroups ? (
            groups.map((group, gi) => (
              <CurvedGroupCard key={gi} group={group} />
            ))
          ) : hasItems ? (
            items.map((item, i) => (
              <CurvedItemCard
                key={i}
                time={item.time}
                title={item.title}
                description={item.description}
                location={item.location}
              />
            ))
          ) : (
            <p style={{ color: "var(--text-3)", fontFamily: "var(--sans)" }}>
              Schedule coming soon
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function CurvedGroupCard({ group }: { group: ScheduleGroup }) {
  return (
    <div
      style={{
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #e8e1d6)",
        borderRadius: "var(--r-lg, 24px)",
        padding: "clamp(24px, 3vw, 36px)",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h3
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h3, clamp(1.15rem, 1.6vw, 1.35rem))",
            fontWeight: 400,
            color: "var(--text, #3d3830)",
            margin: 0,
          }}
        >
          {group.label}
        </h3>
        {group.date && (
          <span
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 500,
              color: "var(--accent, #7a8c72)",
              background: "color-mix(in srgb, var(--accent, #7a8c72) 10%, transparent)",
              padding: "4px 12px",
              borderRadius: 999,
            }}
          >
            {group.date}
          </span>
        )}
      </div>
      {group.items.map((item, i) => (
        <div
          key={i}
          style={{
            padding: "12px 0",
            borderTop: i > 0 ? "1px solid var(--border, #e8e1d6)" : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <div>
            <p style={{ fontFamily: "var(--serif)", fontSize: "1rem", fontWeight: 400, color: "var(--text, #3d3830)", margin: 0 }}>
              {item.title}
            </p>
            {item.location && (
              <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm, 0.85rem)", color: "var(--text-3, #a69e93)", marginTop: 2 }}>
                {item.location}
              </p>
            )}
          </div>
          <span style={{ fontFamily: "var(--sans)", fontSize: "var(--sm, 0.85rem)", color: "var(--accent, #7a8c72)", fontWeight: 500, whiteSpace: "nowrap" }}>
            {item.time}
          </span>
        </div>
      ))}
    </div>
  );
}

function CurvedItemCard({ time, title, description, location }: { time: string; title: string; description?: string; location?: string }) {
  return (
    <div
      style={{
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #e8e1d6)",
        borderRadius: "var(--r-lg, 24px)",
        padding: "clamp(20px, 3vw, 28px)",
        textAlign: "left",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
      }}
    >
      <div>
        <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.05rem", fontWeight: 400, color: "var(--text, #3d3830)", margin: 0 }}>
          {title}
        </h3>
        {location && <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm, 0.85rem)", color: "var(--text-3, #a69e93)", marginTop: 4 }}>{location}</p>}
        {description && <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body, 1rem)", color: "var(--text-2, #786f65)", lineHeight: 1.7, marginTop: 8 }}>{description}</p>}
      </div>
      <span style={{ fontFamily: "var(--sans)", fontSize: "var(--sm, 0.85rem)", fontWeight: 500, color: "var(--accent, #7a8c72)", whiteSpace: "nowrap", flexShrink: 0 }}>
        {time}
      </span>
    </div>
  );
}
