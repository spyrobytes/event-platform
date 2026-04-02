"use client";

/**
 * Vertical Itinerary Schedule — The Editorial
 *
 * Clean typographic schedule with centered header, timeline-connected
 * cards that lift on hover with accent border highlight. Each event
 * is a distinct card with dot marker on the timeline.
 */

import type { SectionRendererProps } from "../../types";
import type { ScheduleSection, ScheduleGroup } from "@/schemas/event-page";
import styles from "./VerticalItinerary.module.css";

export function VerticalItinerary({
  data,
}: SectionRendererProps<ScheduleSection["data"]>) {
  const { items, heading, description, groups } = data;
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;
  const displayHeading = heading || "Schedule";

  return (
    <section className={styles.section} aria-label="Schedule" id="schedule">
      <div className={styles.container}>
        {/* Centered header */}
        <div className={styles.header}>
          <p className={styles.kicker}>Schedule</p>
          <h2 className={styles.heading}>{displayHeading}</h2>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>

        {/* Itinerary */}
        <div className={styles.itinerary}>
          {hasGroups ? (
            groups.map((group, gi) => (
              <ItineraryGroup key={gi} group={group} isFirst={gi === 0} />
            ))
          ) : hasItems ? (
            <div className={styles.timeline}>
              <div className={styles.timelineLine} aria-hidden="true" />
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
            <p className={styles.empty}>Schedule coming soon</p>
          )}
        </div>
      </div>
    </section>
  );
}

function ItineraryGroup({ group, isFirst }: { group: ScheduleGroup; isFirst: boolean }) {
  return (
    <div className={styles.group}>
      {!isFirst && <div className={styles.groupSep} />}

      <div className={styles.groupHeader}>
        <h3 className={styles.groupLabel}>{group.label}</h3>
        {(group.date || group.location) && (
          <p className={styles.groupMeta}>
            {[group.date, group.location].filter(Boolean).join(" \u2022 ")}
          </p>
        )}
      </div>

      {group.items.length > 0 && (
        <div className={styles.timeline}>
          <div className={styles.timelineLine} aria-hidden="true" />
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
    <div className={styles.item}>
      <div className={styles.itemDot} aria-hidden="true" />
      <p className={styles.itemTime}>{time}</p>
      <h4 className={styles.itemTitle}>{title}</h4>
      {location && <p className={styles.itemLocation}>{location}</p>}
      {description && <p className={styles.itemDescription}>{description}</p>}
    </div>
  );
}
