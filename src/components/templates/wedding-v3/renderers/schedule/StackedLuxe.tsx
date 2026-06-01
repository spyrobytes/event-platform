"use client";

/**
 * Stacked Luxe Schedule — The Grand Luxe
 *
 * Large, high-contrast cards with metallic accent border.
 * Bold typography, strong card edges, premium feel.
 */

import type { SectionRendererProps } from "../../types";
import type { ScheduleSection, ScheduleGroup } from "@/schemas/event-page";

export function StackedLuxe({
  data,
}: SectionRendererProps<ScheduleSection["data"]>) {
  const { items, heading, description, groups } = data;
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0", background: "var(--lux-panel, transparent)", textAlign: "center" }}
      aria-label="Schedule"
      id="schedule"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--lux-accent, var(--accent, #c5a55a))", marginBottom: 8 }}>
          Schedule
        </p>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: "var(--h2)", fontWeight: 400, color: "var(--lux-ink, var(--text, #3d3830))", marginBottom: "clamp(8px, 1vw, 12px)" }}>
          {heading || "Wedding Weekend"}
        </h2>
        {description && (
          <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body)", color: "var(--lux-ink-soft, var(--text-2))", lineHeight: 1.75, maxWidth: "50ch", margin: "0 auto clamp(40px, 5vw, 56px)" }}>
            {description}
          </p>
        )}

        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(16px, 2vw, 24px)" }}>
          {hasGroups ? (
            groups.map((group, gi) => (
              <LuxeGroupCard key={gi} group={group} />
            ))
          ) : hasItems ? (
            items.map((item, i) => (
              <LuxeItemCard key={i} time={item.time} title={item.title} description={item.description} location={item.location} />
            ))
          ) : (
            <p style={{ color: "var(--lux-ink-faint, var(--text-3))", fontFamily: "var(--sans)" }}>Schedule coming soon</p>
          )}
        </div>
      </div>
    </section>
  );
}

function LuxeGroupCard({ group }: { group: ScheduleGroup }) {
  return (
    <div
      style={{
        background: "var(--lux-card, var(--surface, #ffffff))",
        border: "1px solid var(--lux-line, var(--border, #e8e1d6))",
        borderRadius: 4,
        padding: "clamp(28px, 4vw, 40px)",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top metallic accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--lux-accent, var(--accent, #c5a55a)), color-mix(in srgb, var(--lux-accent, var(--accent, #c5a55a)) 40%, transparent))" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontFamily: "var(--serif)", fontSize: "var(--h3)", fontWeight: 400, color: "var(--lux-ink, var(--text, #3d3830))", margin: 0 }}>
          {group.label}
        </h3>
        {group.date && (
          <span style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--lux-accent, var(--accent, #c5a55a))" }}>
            {group.date}
          </span>
        )}
      </div>

      {group.items.map((item, i) => (
        <div key={i} style={{ padding: "14px 0", borderTop: i > 0 ? "1px solid var(--lux-line, var(--border, #e8e1d6))" : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
            <div>
              <p style={{ fontFamily: "var(--serif)", fontSize: "1.05rem", fontWeight: 400, color: "var(--lux-ink, var(--text))", margin: 0 }}>{item.title}</p>
              {item.location && <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", color: "var(--lux-ink-faint, var(--text-3))", marginTop: 2 }}>{item.location}</p>}
            </div>
            <span style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", fontWeight: 600, color: "var(--lux-accent, var(--accent, #c5a55a))", whiteSpace: "nowrap" }}>{item.time}</span>
          </div>
          {item.description && (
            <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body)", color: "var(--lux-ink-soft, var(--text-2))", lineHeight: 1.7, marginTop: 8 }}>{item.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function LuxeItemCard({ time, title, description, location }: { time: string; title: string; description?: string; location?: string }) {
  return (
    <div
      style={{
        background: "var(--lux-card, var(--surface, #ffffff))",
        border: "1px solid var(--lux-line, var(--border, #e8e1d6))",
        borderRadius: 4,
        padding: "clamp(24px, 3vw, 32px)",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: "var(--lux-accent, var(--accent, #c5a55a))" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", fontWeight: 400, color: "var(--lux-ink, var(--text))", margin: 0 }}>{title}</h3>
        <span style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", fontWeight: 600, color: "var(--lux-accent, var(--accent, #c5a55a))", whiteSpace: "nowrap" }}>{time}</span>
      </div>
      {location && <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", color: "var(--lux-ink-faint, var(--text-3))", marginTop: 4 }}>{location}</p>}
      {description && <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body)", color: "var(--lux-ink-soft, var(--text-2))", lineHeight: 1.7, marginTop: 8 }}>{description}</p>}
    </div>
  );
}
