import { type CSSProperties, type ReactNode } from "react";
import { cn, getInitials } from "@/lib/utils";
import { Section } from "../ui/Section";
import { EnvelopeIcon, ShieldCheckIcon } from "../ui/icons";
import { RevealOnScroll } from "../ui/RevealOnScroll";
import reveal from "../ui/reveal.module.css";
import { STORY } from "./story";
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
    icon: <EnvelopeIcon className="size-5" />,
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
    icon: <ShieldCheckIcon className="size-5" />,
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
 * (see ./story.ts — same numbers as the CreationDemo dashboard). Per-stage
 * hues (user-directed), validated as a categorical set in this adjacency
 * order (worst CVD ΔE 19.2; the amber and emerald sub-3:1 contrast is
 * relieved by the visible label + value on every bar). Ends on emerald =
 * attending; STATUS_STYLES below speaks the same color vocabulary. Bar
 * widths derive from the values; hues flow to CSS as inline scalars.
 */
const FUNNEL_STAGES = [
  { label: "Invited", value: STORY.invited, step: "#6366f1" },
  { label: "Opened", value: STORY.opened, step: "#f59e0b" },
  { label: "Responded", value: STORY.responded, step: "#f43f5e" },
  { label: "Attending", value: STORY.attending, step: "#10b981" },
];

/*
 * 12-week response-rate trend in a 100x32 viewBox; the accent segment, the
 * end dot, and the gray line all derive from this one array. The final x is
 * inset from the viewBox edge and the dot renders as an HTML overlay (see
 * .sparkDot) so non-uniform SVG scaling can't clip or squash it.
 */
const SPARK_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0, 26], [8, 24], [16, 25], [24, 22], [32, 23], [40, 19], [48, 20],
  [56, 16], [64, 17], [72, 13], [80, 11], [88, 9], [96, 6],
];

const toPoints = (pts: ReadonlyArray<readonly [number, number]>) =>
  pts.map(([x, y]) => `${x},${y}`).join(" ");

const SPARK_ACCENT = SPARK_POINTS.slice(-3);
const [SPARK_END_X, SPARK_END_Y] = SPARK_POINTS[SPARK_POINTS.length - 1];

/* One source for the status color vocabulary (matches the funnel: amber =
   opened, emerald = attending). */
const STATUS_STYLES = {
  Opened: "bg-amber-500/15 text-amber-700",
  Attending: "bg-emerald-600/10 text-emerald-700",
  Delivered: "bg-zinc-500/10 text-zinc-600",
} as const;

type GuestRow = { name: string; status: keyof typeof STATUS_STYLES };

const GUEST_ROWS: GuestRow[] = [
  { name: "Amara Okafor", status: "Opened" },
  { name: "Jordan Lee", status: "Attending" },
  { name: "Tunde Bakare", status: "Delivered" },
];

/* The roster strip shows attendees only — Jordan Lee from the rows above
   plus guests beyond the visible list — so it can't contradict the
   statuses it sits under. Initials derive from the names. */
const ATTENDING_SAMPLE = ["Jordan Lee", "Rina Sato", "Marcus Kim", "Deja Adams"];

function FunnelPanel() {
  const maxValue = FUNNEL_STAGES[0].value;

  return (
    <div
      className={cn(reveal.item, styles.panel, styles.panelFunnel, "p-5")}
      style={{ "--reveal-i": 0 } as CSSProperties}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold text-black">RSVP funnel</div>
        <div className="text-xs text-black/45">{STORY.eventName}</div>
      </div>
      <div className="mt-4">
        {FUNNEL_STAGES.map((stage) => (
          <div key={stage.label} className={styles.funnelRow}>
            <div className="text-xs text-black/55">{stage.label}</div>
            <div className={styles.funnelBarLane}>
              <div
                className={styles.funnelBar}
                style={
                  {
                    "--w": `${Math.round((stage.value / maxValue) * 100)}%`,
                    "--step": stage.step,
                  } as CSSProperties
                }
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
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold text-black">{STORY.responseRate}</span>
        <span className="whitespace-nowrap text-xs font-medium text-emerald-700">↑ 9% this week</span>
      </div>
      <div className={cn(styles.sparkWrap, "mt-2")}>
        <svg aria-hidden className={styles.sparkline} viewBox="0 0 100 32" preserveAspectRatio="none">
          <polyline
            points={toPoints(SPARK_POINTS)}
            fill="none"
            stroke="#d4d4d8"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={toPoints(SPARK_ACCENT)}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          aria-hidden
          className={styles.sparkDot}
          style={
            {
              "--dot-x": `${SPARK_END_X}%`,
              "--dot-y": `${(SPARK_END_Y / 32) * 100}%`,
            } as CSSProperties
          }
        />
      </div>
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
            <span className={cn(styles.pill, STATUS_STYLES[row.status])}>
              <span className={styles.pillDot} />
              {row.status}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2 border-t border-black/5 pt-3">
        <div className="flex -space-x-1.5">
          {ATTENDING_SAMPLE.map((name) => (
            <span
              key={name}
              className="flex size-6 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-semibold text-black/60 ring-2 ring-white"
            >
              {getInitials(name)}
            </span>
          ))}
        </div>
        <span className="text-xs text-black/50">
          +{STORY.attending - ATTENDING_SAMPLE.length} more · {STORY.attending} attending
        </span>
      </div>
    </div>
  );
}

export function ProductValueSplit() {
  return (
    <Section id="how-it-works" className="bg-zinc-50">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div
          className={styles.stage}
          role="group"
          aria-label="Sample event dashboard preview with illustrative data"
        >
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
