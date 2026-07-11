import Image from "next/image";
import { cn } from "@/lib/utils";
import styles from "./HeroMontage.module.css";
import { ButtonLink } from "../ui/ButtonLink";
import { Container } from "../ui/Container";
import { StatusDot } from "../ui/StatusDot";
import hero01 from "../../../../public/landing/hero/01.jpg";
import hero02 from "../../../../public/landing/hero/02.jpg";
import hero03 from "../../../../public/landing/hero/03.jpg";
import hero04 from "../../../../public/landing/hero/04.jpg";

const CYCLE_SECONDS = 20;

/* Slide order is also paint order: each layer is a later sibling than the one
   before it, which the fade-over keyframes rely on (see the module CSS).
   Focal points keep each image's subject in frame when `object-fit: cover`
   crops on narrow viewports. */
const montage = [
  { image: hero01, focal: "50% 45%" },
  { image: hero02, focal: "50% 55%" },
  { image: hero03, focal: "50% 45%" },
  { image: hero04, focal: "50% 45%" },
];

const SLOT_SECONDS = CYCLE_SECONDS / montage.length;

/* Starting slide 0 this far into its cycle (via negative delay) means the
   very first frame is already fully visible — no fade-in from black on load. */
const FADE_IN_END_SECONDS = CYCLE_SECONDS * 0.08;

const ASSURANCES = ["Free to start", "No credit card", "Launch in 5 minutes"];

export function HeroMontage() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative -mt-[var(--site-header-height)] flex min-h-[clamp(38rem,85svh,52rem)] overflow-hidden"
    >
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 z-0 bg-zinc-950" />

        {montage.map(({ image, focal }, i) => (
          <div
            key={image.src}
            className={cn(
              "absolute inset-0 z-10",
              styles.layer,
              i % 2 === 0 ? styles.animate : styles.animateAlt,
              i === 0 && styles.firstVisible
            )}
            style={
              {
                "--cycle": `${CYCLE_SECONDS}s`,
                "--delay": `${i * SLOT_SECONDS - FADE_IN_END_SECONDS}s`,
                "--focal": focal,
              } as React.CSSProperties
            }
          >
            <Image
              src={image}
              alt=""
              fill
              preload={i === 0}
              placeholder="blur"
              className={styles.image}
              sizes="100vw"
            />
          </div>
        ))}

        {/* Single static scrim above the whole stack — per-layer copies would
            double-darken while two slides overlap mid-transition. */}
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/55 via-black/45 to-black/70" />
      </div>

      <Container className="relative z-30 flex flex-col justify-center pt-[calc(var(--site-header-height)+6rem)] pb-24 sm:pb-32">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white ring-1 ring-white/15">
            <StatusDot className="size-2" />
            Now in early access
          </div>

          <h1
            id="hero-heading"
            className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Bring people together.
            <span className="block text-white/70">Without the chaos.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-white/85 sm:text-xl">
            Create stunning event pages in minutes. Send invites, track RSVPs, and fill
            every seat — all from one place.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink href="/join" variant="primary" ariaLabel="Create your free event">
              Create Your Free Event
            </ButtonLink>

            <ButtonLink href="#demo" variant="secondary">
              See how it works →
            </ButtonLink>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
            {ASSURANCES.map((assurance) => (
              <li key={assurance} className="flex items-center gap-2">
                <svg
                  aria-hidden="true"
                  className="size-4 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {assurance}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
