import { type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { FaqJsonLd, type FaqItem } from "@/components/seo";
import { Section } from "../ui/Section";
import { RevealOnScroll } from "../ui/RevealOnScroll";
import reveal from "../ui/reveal.module.css";
import styles from "./Faq.module.css";

/*
 * Every answer is grounded in shipped behavior — the JSON-LD mirrors this
 * exact list, so nothing here may claim what the product can't do:
 * - guest access: tokenized links + invitation codes, no guest accounts
 * - visibility: EventVisibility PUBLIC / UNLISTED / PRIVATE (schema.prisma)
 * - plus-ones: invite schema; confirmations/reminders: email pipeline
 * - QR passes: /invite/pass/[passId]
 * - after the event: /e/[slug]/gallery + /wishes sub-pages
 * - free to start: mirrors the hero + metadata claims exactly
 * - CSV export: /api/events/[id]/invites/export
 * - templates + section control: template registry + page editor
 */
const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Do my guests need an account or an app?",
    answer:
      "No. Guests open a personal invitation link or enter an invitation code on the event page — shared over WhatsApp, text message, or email. There's nothing to install and nothing to sign up for.",
  },
  {
    question: "Can I keep my event private?",
    answer:
      "Yes. Every event has a visibility setting: public events are listed in discovery and indexed by search engines, unlisted events are reachable only by direct link, and private events are invitation-only — each guest uses their own secure access.",
  },
  {
    question: "How do RSVPs work?",
    answer:
      "Each guest responds through their own secure link or invitation code, plus-ones included. Responses appear in your dashboard in real time, and confirmations and reminders go out by email automatically.",
  },
  {
    question: "Do guests get tickets or passes?",
    answer:
      "Confirmation emails can include a personal QR pass to scan at check-in — handy for conferences and celebrations with multiple functions.",
  },
  {
    question: "What happens after the event?",
    answer:
      "Your event page stays live. You can open a photo gallery for guests, collect written wishes, and keep everything at the same link your guests already have.",
  },
  {
    question: "Can I export my guest list?",
    answer:
      "Yes. The dashboard tracks every invitation from sent to responded, and you can export your full guest list as a CSV at any time.",
  },
  {
    question: "Can I change how my event page looks?",
    answer:
      "Every event starts from a template — from cinematic wedding pages to conference sites — and you control which sections appear: schedule, travel, registry, gallery, and more.",
  },
  {
    question: "Is it free to start?",
    answer: "Yes — create your first event free, with no credit card required.",
  },
];

export function Faq() {
  return (
    <Section id="faq" className="bg-zinc-50">
      <FaqJsonLd items={FAQ_ITEMS} />
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-black sm:text-3xl">
          Questions, answered
        </h2>
        <p className="mt-3 text-center text-base text-black/70">
          The things organizers ask before their first event.
        </p>

        <RevealOnScroll
          className={cn(styles.list, "mt-10")}
          visibleClassName={reveal.groupVisible}
        >
          {FAQ_ITEMS.map((item, index) => (
            <details
              key={item.question}
              className={cn(reveal.item, styles.item)}
              style={{ "--reveal-i": index } as CSSProperties}
            >
              <summary className={styles.summary}>
                {item.question}
                <span aria-hidden className={styles.marker} />
              </summary>
              <p className={styles.answer}>{item.answer}</p>
            </details>
          ))}
        </RevealOnScroll>
      </div>
    </Section>
  );
}
