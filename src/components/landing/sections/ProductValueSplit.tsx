import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Section } from "../ui/Section";
import { RevealOnScroll } from "../ui/RevealOnScroll";
import reveal from "../ui/reveal.module.css";
import styles from "./ProductValueSplit.module.css";

type Feature = {
  icon: ReactNode;
  text: string;
};

const features: Feature[] = [
  {
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    text: "SEO-optimized event pages built for discovery",
  },
  {
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    text: "Invitations, confirmations, and reminders",
  },
  {
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    text: "Real-time RSVP tracking and insights",
  },
  {
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    text: "Privacy-first and secure by default",
  },
  {
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m-9.75 0h7.5" />
      </svg>
    ),
    text: "Exportable guest lists and a live attendee roster",
  },
];

/*
 * The funnel plots the real invite pipeline for the page's one-story event
 * (Avery & Jordan: 120 invited, 86 responded — same numbers as the
 * CreationDemo dashboard). Single-hue ordinal ramp, validated indigo
 * 400→800; widths and steps flow to CSS as inline scalars.
 */
const FUNNEL_STAGES = [
  { label: "Invited", value: 120, width: "100%", step: "#818cf8" },
  { label: "Opened", value: 104, width: "87%", step: "#6366f1" },
  { label: "Responded", value: 86, width: "72%", step: "#4f46e5" },
  { label: "Attending", value: 74, width: "62%", step: "#3730a3" },
];

/* 12-point response-rate trend; de-emphasis stroke with the current period
   picked out in the accent, per the stat-tile contract. */
const SPARK_POINTS = "0,24 9,21 18,22 27,19 36,20 45,16 54,17 63,13 72,14 81,10 90,8 100,5";

const GUEST_ROWS = [
  { name: "Amara Okafor", status: "Opened", pillClass: "bg-indigo-600/10 text-indigo-700" },
  { name: "Jordan Lee", status: "Attending", pillClass: "bg-emerald-600/10 text-emerald-700" },
  { name: "Tunde Bakare", status: "Delivered", pillClass: "bg-zinc-500/10 text-zinc-600" },
];

const ROSTER_INITIALS = ["AO", "JL", "TB", "RS"];

function FunnelPanel() {
  return (
    <div
      className={cn(reveal.item, styles.panel, styles.panelFunnel, "p-5")}
      style={{ "--reveal-i": 0 } as CSSProperties}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold text-black">RSVP funnel</div>
        <div className="text-xs text-black/45">Avery &amp; Jordan&apos;s Wedding</div>
      </div>
      <div className="mt-4">
        {FUNNEL_STAGES.map((stage) => (
          <div key={stage.label} className={styles.funnelRow}>
            <div className="text-xs text-black/55">{stage.label}</div>
            <div className={styles.funnelBarLane}>
              <div
                className={styles.funnelBar}
                style={{ "--w": stage.width, "--step": stage.step } as CSSProperties}
              />
              <div className="text-xs font-semibold text-black">{stage.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatPanel() {
  return (
    <div
      className={cn(reveal.item, styles.panel, styles.panelStat, "p-4")}
      style={{ "--reveal-i": 1 } as CSSProperties}
    >
      <div className="text-xs text-black/55">Response rate</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-black">72%</span>
        <span className="whitespace-nowrap text-xs font-medium text-emerald-700">↑ 9% this week</span>
      </div>
      <svg aria-hidden className={cn(styles.sparkline, "mt-2")} viewBox="0 0 100 28" preserveAspectRatio="none">
        <polyline points={SPARK_POINTS} fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points="81,10 90,8 100,5" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="100" cy="5" r="4" fill="#4f46e5" stroke="#fff" strokeWidth="2" />
      </svg>
    </div>
  );
}

function GuestsPanel() {
  return (
    <div
      className={cn(reveal.item, styles.panel, styles.panelGuests, "p-5")}
      style={{ "--reveal-i": 2 } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-black">Guest list</div>
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-medium text-black/70">
          <svg aria-hidden className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </div>
      </div>

      <ul className="mt-3 divide-y divide-black/5">
        {GUEST_ROWS.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-3 py-2">
            <span className="text-xs text-black/75">{row.name}</span>
            <span className={cn(styles.pill, row.pillClass)}>
              <span className={styles.pillDot} />
              {row.status}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2 border-t border-black/5 pt-3">
        <div className="flex -space-x-1.5">
          {ROSTER_INITIALS.map((initials) => (
            <span
              key={initials}
              className="flex size-6 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-semibold text-black/60 ring-2 ring-white"
            >
              {initials}
            </span>
          ))}
        </div>
        <span className="text-xs text-black/50">+70 more · 74 attending</span>
      </div>
    </div>
  );
}

export function ProductValueSplit() {
  return (
    <Section id="how-it-works" className="bg-zinc-50">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className={styles.stage}>
          <RevealOnScroll className={styles.cluster} visibleClassName={reveal.groupVisible}>
            <FunnelPanel />
            <StatPanel />
            <GuestsPanel />
          </RevealOnScroll>
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
            Everything you need — nothing you don&apos;t
          </h2>
          <p className="mt-3 text-base text-black/70">
            Launch an event in minutes, keep your workflow clean, and stay in control as
            attendance grows.
          </p>

          <ul className="mt-8 space-y-4">
            {features.map((feature) => (
              <li key={feature.text} className="flex gap-4 text-sm text-black/80">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/5 text-black/70">
                  {feature.icon}
                </span>
                <span className="pt-2.5">{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
