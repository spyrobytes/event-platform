import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "../ui/Container";
import { RevealOnScroll } from "../ui/RevealOnScroll";
import { assuranceSerif } from "./showcase-fonts";
import reveal from "../ui/reveal.module.css";
import styles from "./AssuranceStrip.module.css";

type AssurancePoint = {
  title: string;
  body: string;
  icon: ReactNode;
};

/**
 * Every claim here maps to a shipped capability: the email outbox +
 * delivery webhooks, hashed RSVP tokens, QR passes on confirmation
 * emails, SEO-first public pages, and guest-token section visibility.
 * Keep it that way — this strip replaced an engineer-facing section
 * with invented metrics.
 */
const assurancePoints: AssurancePoint[] = [
  {
    title: "Invitations that arrive",
    body: "Delivery tracked per guest — sent, delivered, opened.",
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    title: "RSVPs you can trust",
    body: "Secure one-per-guest links, responses in real time.",
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Passes that scan",
    body: "Optional QR passes admit guests to each function.",
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM17.25 17.25h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75z" />
      </svg>
    ),
  },
  {
    title: "Pages guests find fast",
    body: "Built for search and instant loads from day one.",
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    title: "Private stays private",
    body: "Invitation-only pages that never hit public listings.",
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
];

/*
 * The thread: a champagne hairline undulating through the five medallion
 * centers on desktop. Columns sit at 10/30/50/70/90% of the row, so with
 * preserveAspectRatio="none" (horizontal stretch only — the CSS height
 * matches the viewBox height 1:1) the curve passes through x=100..900 in a
 * 0–1000 viewBox. The y values mirror the per-column crest offsets in the
 * CSS module (--crest + half the 44px medallion): keep both in sync.
 */
const THREAD_PATH =
  "M0,44 C40,38 60,32 100,32 C180,32 220,60 300,60 C380,60 420,28 500,28 C580,28 620,64 700,64 C780,64 820,42 900,42 C950,42 985,46 1000,48";

export function AssuranceStrip() {
  return (
    <section
      aria-label="Why organizers trust EventFXr"
      className={cn(styles.strip, assuranceSerif.variable)}
    >
      <div aria-hidden className={styles.waveTop} />
      <div className={styles.band}>
        <Container>
          <RevealOnScroll
            className={styles.points}
            visibleClassName={cn(reveal.groupVisible, styles.threadDrawn)}
          >
            <svg
              aria-hidden
              focusable="false"
              className={styles.thread}
              viewBox="0 0 1000 110"
              preserveAspectRatio="none"
            >
              <path d={THREAD_PATH} pathLength={1} vectorEffect="non-scaling-stroke" />
            </svg>
            {assurancePoints.map((point, index) => (
              <div
                key={point.title}
                className={cn(reveal.item, styles.point)}
                style={{ "--reveal-i": index } as CSSProperties}
              >
                <span className={styles.medallion}>{point.icon}</span>
                <span className={styles.title}>{point.title}</span>
                <span className={styles.body}>{point.body}</span>
              </div>
            ))}
          </RevealOnScroll>
        </Container>
      </div>
      <div aria-hidden className={styles.waveBottom} />
    </section>
  );
}
