import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Section } from "../ui/Section";
import { ButtonLink } from "../ui/ButtonLink";
import { ShieldCheckIcon } from "../ui/icons";
import { RevealOnScroll } from "../ui/RevealOnScroll";
import { StatusDot } from "../ui/StatusDot";
import reveal from "../ui/reveal.module.css";
import styles from "./FinalCTA.module.css";

type TrustPoint = {
  icon: ReactNode;
  text: string;
  iconClassName: string;
};

/* Three concrete, true reassurances — the old fake-avatar social proof and
   the unverifiable "100+ organizers" claim are gone on purpose. */
const trustPoints: TrustPoint[] = [
  {
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    text: "No credit card required",
    iconClassName: "bg-blue-500/15 text-blue-400",
  },
  {
    icon: <ShieldCheckIcon className="size-5" />,
    text: "Privacy-first by default",
    iconClassName: "bg-emerald-500/15 text-emerald-400",
  },
  {
    icon: (
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    text: "Your event page stays live after the big day",
    iconClassName: "bg-amber-500/15 text-amber-400",
  },
];

/*
 * The page's close carries the mission (folded in from the deleted
 * MissionStatement section) — the emotional lead — with the sign-up ask as
 * its consequence. Keeps id="mission" so the header nav item still lands
 * here.
 */
export function FinalCTA() {
  return (
    <Section id="mission" className="bg-zinc-950 text-white overflow-hidden">
      <div className="relative">
        <div className={styles.glowOrb} aria-hidden="true" />

        <RevealOnScroll
          className={cn(styles.stage, "relative grid gap-10 lg:grid-cols-2 lg:items-center")}
          visibleClassName={reveal.groupVisible}
        >
          <div className={reveal.item} style={{ "--reveal-i": 0 } as CSSProperties}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/10">
              <StatusDot />
              Ready when you are
            </div>

            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Make it effortless
              <span className="block text-white/60">to bring people together.</span>
            </h2>

            <p className="mt-4 text-lg text-white/70 max-w-md">
              Events are about people, not spreadsheets. Launch your first event in
              minutes — and scale when you&apos;re ready.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink
                href="/join"
                variant="secondary"
                className="px-6 py-3 text-base"
              >
                Create Your Free Event
              </ButtonLink>
              <ButtonLink
                href="#demo"
                variant="ghost"
                className="text-white/80 hover:text-white"
              >
                Watch it in action →
              </ButtonLink>
            </div>
          </div>

          <div className={reveal.item} style={{ "--reveal-i": 1 } as CSSProperties}>
            <div className="rounded-3xl bg-gradient-to-br from-white/10 to-white/5 p-8 ring-1 ring-white/10 backdrop-blur-sm">
              <div className="text-sm font-semibold text-white/90 mb-6">
                Why organizers choose us
              </div>

              {/* Plain rows, not reveal.items — nesting items inside the
                  card's reveal.item compounds the fades (opacity × opacity,
                  offset + offset); the card reveals as one unit. */}
              <div className="space-y-5">
                {trustPoints.map((point) => (
                  <div key={point.text} className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        point.iconClassName
                      )}
                    >
                      {point.icon}
                    </div>
                    <span className="text-sm text-white/80">{point.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </Section>
  );
}
