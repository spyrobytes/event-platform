import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Section } from "../ui/Section";
import { RevealOnScroll } from "../ui/RevealOnScroll";
import reveal from "../ui/reveal.module.css";

type AssurancePoint = {
  title: string;
  body: string;
  icon: ReactNode;
  iconClassName: string;
};

/**
 * Every claim here maps to a shipped capability: the email outbox +
 * delivery webhooks, hashed RSVP tokens, SEO-first public pages, and
 * guest-token section visibility. Keep it that way — this strip replaced
 * an engineer-facing section with invented metrics.
 */
const assurancePoints: AssurancePoint[] = [
  {
    title: "Invitations that arrive",
    body: "Delivery tracked per guest — sent, delivered, opened.",
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    iconClassName: "bg-indigo-600/10 text-indigo-600",
  },
  {
    title: "RSVPs you can trust",
    body: "Secure one-per-guest links, responses in real time.",
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    iconClassName: "bg-emerald-600/10 text-emerald-600",
  },
  {
    title: "Pages guests find fast",
    body: "Built for search and instant loads from day one.",
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    iconClassName: "bg-sky-600/10 text-sky-600",
  },
  {
    title: "Private stays private",
    body: "Invitation-only pages that never hit public listings.",
    icon: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    iconClassName: "bg-amber-600/10 text-amber-600",
  },
];

export function AssuranceStrip() {
  return (
    <Section className="py-8 sm:py-10 bg-white border-y border-black/5">
      <RevealOnScroll
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
        visibleClassName={reveal.groupVisible}
      >
        {assurancePoints.map((point, index) => (
          <div
            key={point.title}
            className={cn(reveal.item, "flex items-start gap-3")}
            style={{ "--reveal-i": index } as CSSProperties}
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                point.iconClassName
              )}
            >
              {point.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-black">{point.title}</div>
              <div className="mt-0.5 text-sm text-black/60">{point.body}</div>
            </div>
          </div>
        ))}
      </RevealOnScroll>
    </Section>
  );
}
