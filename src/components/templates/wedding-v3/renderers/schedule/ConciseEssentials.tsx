"use client";

/**
 * Concise Essentials Schedule — The Intimate Note
 *
 * Minimal schedule with centered layout. Each item is a bordered
 * row with time in accent color and title. Hover brings subtle
 * opacity change. Groups separated by thin rules with label.
 */

import type { SectionRendererProps } from "../../types";
import type { ScheduleSection } from "@/schemas/event-page";
import styles from "./ConciseEssentials.module.css";

export function ConciseEssentials({
  data,
}: SectionRendererProps<ScheduleSection["data"]>) {
  const { items, heading, description, groups } = data;
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;
  const displayHeading = heading || "Schedule";

  return (
    <section className={styles.section} aria-label="Schedule" id="schedule">
      <div className={styles.container}>
        <h2 className={styles.heading}>{displayHeading}</h2>

        {description && (
          <p className={styles.description}>{description}</p>
        )}

        <div className={styles.items}>
          {hasGroups ? (
            groups.map((group, gi) => (
              <div key={gi} className={styles.group}>
                {gi > 0 && <div className={styles.groupSep} />}
                {group.label && (
                  <p className={styles.groupLabel}>{group.label}</p>
                )}
                {group.items.map((item, i) => (
                  <div key={i} className={styles.row}>
                    <span className={styles.time}>{item.time}</span>
                    <span className={styles.title}>{item.title}</span>
                  </div>
                ))}
              </div>
            ))
          ) : hasItems ? (
            items.map((item, i) => (
              <div key={i} className={styles.row}>
                <span className={styles.time}>{item.time}</span>
                <span className={styles.title}>{item.title}</span>
              </div>
            ))
          ) : (
            <p className={styles.empty}>Schedule coming soon</p>
          )}
        </div>
      </div>
    </section>
  );
}
