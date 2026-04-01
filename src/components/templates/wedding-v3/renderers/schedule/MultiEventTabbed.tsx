"use client";

/**
 * Multi-Event Tabbed Schedule — The Celebration House
 *
 * Tabbed interface for multi-day/multi-event agendas.
 * When groups exist, each group becomes a tab. For flat items,
 * renders as a single enriched list. More event-centric and
 * communal than other schedule renderers.
 */

import { useState } from "react";
import type { SectionRendererProps } from "../../types";
import type { ScheduleSection } from "@/schemas/event-page";

export function MultiEventTabbed({
  data,
}: SectionRendererProps<ScheduleSection["data"]>) {
  const { items, heading, description, groups } = data;
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;
  const [activeTab, setActiveTab] = useState(0);

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
            fontSize: "var(--h2)",
            fontWeight: 500,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(8px, 1vw, 12px)",
          }}
        >
          {heading || "Wedding Events"}
        </h2>
        {description && (
          <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body)", color: "var(--text-2)", lineHeight: 1.75, maxWidth: "50ch", margin: "0 auto clamp(24px, 3vw, 36px)" }}>
            {description}
          </p>
        )}

        {hasGroups ? (
          <>
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 4,
                marginBottom: "clamp(24px, 3vw, 36px)",
                flexWrap: "wrap",
              }}
              role="tablist"
            >
              {groups.map((group, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={activeTab === i}
                  onClick={() => setActiveTab(i)}
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    padding: "8px 20px",
                    borderRadius: "var(--r, 16px)",
                    border: "1px solid",
                    borderColor: activeTab === i ? "var(--accent, #7a8c72)" : "var(--border, #e8e1d6)",
                    background: activeTab === i ? "var(--accent, #7a8c72)" : "transparent",
                    color: activeTab === i ? "var(--surface, #ffffff)" : "var(--text-2, #786f65)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                >
                  {group.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ maxWidth: 640, margin: "0 auto" }} role="tabpanel">
              {groups[activeTab] && (
                <>
                  {groups[activeTab].date && (
                    <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", fontWeight: 500, color: "var(--accent, #7a8c72)", marginBottom: 16, letterSpacing: "0.1em" }}>
                      {groups[activeTab].date}
                      {groups[activeTab].location && ` \u2022 ${groups[activeTab].location}`}
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {groups[activeTab].items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          background: "var(--surface, #ffffff)",
                          border: "1px solid var(--border, #e8e1d6)",
                          borderRadius: "var(--r, 16px)",
                          padding: "clamp(16px, 2vw, 24px)",
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 16,
                        }}
                      >
                        <div>
                          <p style={{ fontFamily: "var(--serif)", fontSize: "1.05rem", fontWeight: 500, color: "var(--text)", margin: 0 }}>
                            {item.title}
                          </p>
                          {item.location && (
                            <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", color: "var(--text-3)", marginTop: 2 }}>{item.location}</p>
                          )}
                          {item.description && (
                            <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body)", color: "var(--text-2)", lineHeight: 1.7, marginTop: 8 }}>{item.description}</p>
                          )}
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--sans)",
                            fontSize: "var(--sm)",
                            fontWeight: 600,
                            color: "var(--accent, #7a8c72)",
                            background: "color-mix(in srgb, var(--accent, #7a8c72) 10%, transparent)",
                            padding: "4px 10px",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : hasItems ? (
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r, 16px)",
                  padding: "clamp(16px, 2vw, 24px)",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div>
                  <p style={{ fontFamily: "var(--serif)", fontSize: "1.05rem", fontWeight: 500, color: "var(--text)", margin: 0 }}>{item.title}</p>
                  {item.description && <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body)", color: "var(--text-2)", lineHeight: 1.7, marginTop: 8 }}>{item.description}</p>}
                </div>
                <span style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", fontWeight: 600, color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-3)", fontFamily: "var(--sans)" }}>Schedule coming soon</p>
        )}
      </div>
    </section>
  );
}
