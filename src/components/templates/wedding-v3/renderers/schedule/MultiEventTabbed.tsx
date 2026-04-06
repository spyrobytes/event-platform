"use client";

/**
 * Multi-Event Tabbed Schedule — The Celebration House
 *
 * Tabbed interface for multi-day/multi-event agendas with
 * sectional navigation menu. When groups exist, each group
 * becomes a tab with its own detailed event listing including
 * time, location, and description. For flat items, renders
 * as an enriched list. More event-centric and communal than
 * other schedule renderers.
 */

import { useState, useRef, useCallback } from "react";
import type { SectionRendererProps } from "../../types";
import type { ScheduleSection } from "@/schemas/event-page";

export function MultiEventTabbed({
  data,
}: SectionRendererProps<ScheduleSection["data"]>) {
  const { items, heading, description, groups } = data;
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;
  const [activeTab, setActiveTab] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTabChange = useCallback((index: number) => {
    setActiveTab(index);
    // Smooth scroll to content area when switching tabs on mobile
    if (window.innerWidth < 640 && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

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
            {/* Sectional Navigation — pill-style tabs */}
            <nav
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                marginBottom: "clamp(28px, 3.5vw, 44px)",
                flexWrap: "wrap",
              }}
              role="tablist"
              aria-label="Event groups"
            >
              {groups.map((group, i) => {
                const isActive = activeTab === i;
                return (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${i}`}
                    onClick={() => handleTabChange(i)}
                    onMouseEnter={(e) => {
                      if (isActive) return;
                      e.currentTarget.style.background = "color-mix(in srgb, var(--accent, #7a8c72) 18%, transparent)";
                      e.currentTarget.style.color = "var(--text, #3d3830)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      if (isActive) return;
                      e.currentTarget.style.background = "color-mix(in srgb, var(--accent, #7a8c72) 8%, transparent)";
                      e.currentTarget.style.color = "var(--text-2, #786f65)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase" as const,
                      padding: "10px 22px",
                      borderRadius: 999,
                      border: "none",
                      background: isActive
                        ? "var(--accent, #7a8c72)"
                        : "color-mix(in srgb, var(--accent, #7a8c72) 8%, transparent)",
                      color: isActive
                        ? "var(--surface, #ffffff)"
                        : "var(--text-2, #786f65)",
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transform: isActive ? "scale(1.02)" : "scale(1)",
                      boxShadow: isActive
                        ? "0 4px 16px color-mix(in srgb, var(--accent, #7a8c72) 30%, transparent)"
                        : "none",
                    }}
                  >
                    {group.label}
                  </button>
                );
              })}
            </nav>

            {/* Tab content */}
            <div
              ref={contentRef}
              id={`tabpanel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              style={{ maxWidth: 680, margin: "0 auto" }}
            >
              {groups[activeTab] && (
                <>
                  {/* Group header with date + location */}
                  {(groups[activeTab].date || groups[activeTab].location) && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      marginBottom: "clamp(20px, 2.5vw, 28px)",
                      flexWrap: "wrap",
                    }}>
                      {groups[activeTab].date && (
                        <span style={{
                          fontFamily: "var(--sans)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase" as const,
                          color: "var(--accent, #7a8c72)",
                          background: "color-mix(in srgb, var(--accent, #7a8c72) 10%, transparent)",
                          padding: "6px 14px",
                          borderRadius: 999,
                        }}>
                          {groups[activeTab].date}
                        </span>
                      )}
                      {groups[activeTab].location && (
                        <span style={{
                          fontFamily: "var(--sans)",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "var(--text-3, #a69e93)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14} style={{ flexShrink: 0 }}>
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            <circle cx="12" cy="9" r="2.5" />
                          </svg>
                          {groups[activeTab].location}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Event items with rich details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {groups[activeTab].items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          background: "var(--surface, #ffffff)",
                          border: "1px solid var(--border, #e8e1d6)",
                          borderRadius: "var(--r, 16px)",
                          padding: "clamp(20px, 2.5vw, 28px)",
                          textAlign: "left",
                          transition: "box-shadow 0.3s ease, transform 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.06)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontFamily: "var(--serif)",
                              fontSize: "1.1rem",
                              fontWeight: 500,
                              color: "var(--text)",
                              margin: 0,
                              lineHeight: 1.3,
                            }}>
                              {item.title}
                            </p>
                            {item.location && (
                              <p style={{
                                fontFamily: "var(--sans)",
                                fontSize: "var(--sm, 0.85rem)",
                                color: "var(--text-3, #a69e93)",
                                marginTop: 4,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={12} height={12} style={{ flexShrink: 0 }}>
                                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                  <circle cx="12" cy="9" r="2.5" />
                                </svg>
                                {item.location}
                              </p>
                            )}
                            {item.description && (
                              <p style={{
                                fontFamily: "var(--sans)",
                                fontSize: "var(--body, 0.95rem)",
                                color: "var(--text-2, #786f65)",
                                lineHeight: 1.7,
                                marginTop: 10,
                              }}>
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span
                            style={{
                              fontFamily: "var(--sans)",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              color: "var(--accent, #7a8c72)",
                              background: "color-mix(in srgb, var(--accent, #7a8c72) 10%, transparent)",
                              padding: "6px 14px",
                              borderRadius: 999,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            {item.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : hasItems ? (
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--border, #e8e1d6)",
                  borderRadius: "var(--r, 16px)",
                  padding: "clamp(20px, 2.5vw, 28px)",
                  textAlign: "left",
                  transition: "box-shadow 0.3s ease, transform 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", fontWeight: 500, color: "var(--text)", margin: 0 }}>
                      {item.title}
                    </p>
                    {item.location && (
                      <p style={{
                        fontFamily: "var(--sans)",
                        fontSize: "var(--sm, 0.85rem)",
                        color: "var(--text-3, #a69e93)",
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={12} height={12} style={{ flexShrink: 0 }}>
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                        {item.location}
                      </p>
                    )}
                    {item.description && (
                      <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body, 0.95rem)", color: "var(--text-2, #786f65)", lineHeight: 1.7, marginTop: 10 }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span style={{
                    fontFamily: "var(--sans)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--accent, #7a8c72)",
                    background: "color-mix(in srgb, var(--accent, #7a8c72) 10%, transparent)",
                    padding: "6px 14px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                    {item.time}
                  </span>
                </div>
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
