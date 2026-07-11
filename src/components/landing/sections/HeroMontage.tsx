import Image from "next/image";
import { cn } from "@/lib/utils";
import styles from "./HeroMontage.module.css";
import { ButtonLink } from "../ui/ButtonLink";
import { Container } from "../ui/Container";
import { StatusDot } from "../ui/StatusDot";
import heroWedding from "../../../../public/landing/hero/wedding.jpg";
import heroGathering from "../../../../public/landing/hero/private-gathering.jpg";
import heroConference from "../../../../public/landing/hero/conference.jpg";
import heroCommunity from "../../../../public/landing/hero/community.jpg";

const CYCLE_SECONDS = 20;

/* One slide per UseCaseGrid row, same order — the montage is the four-beat
   pitch of the section it foreshadows, so captions must match its titles.
   Slide order is also paint order: each layer is a later sibling than the one
   before it, which the fade-over keyframes rely on (see the module CSS).
   Focal points keep each image's subject in frame when `object-fit: cover`
   crops on narrow viewports.

   CONTRACT: the module's keyframe percentages (heroZoom* and captionCycle)
   assume exactly 4 slides — 25% slots, hold to 33%, fade out by 41%. Only
   SLOT_SECONDS below derives from montage.length; the CSS does not. Adding
   or removing a slide without retuning those keyframes silently breaks the
   dip-free fade-over and desyncs captions from their photos. */
const montage = [
  { image: heroWedding, focal: "50% 40%", caption: "Weddings & celebrations" },
  { image: heroGathering, focal: "50% 45%", caption: "Private gatherings" },
  { image: heroConference, focal: "50% 55%", caption: "Conferences & summits" },
  { image: heroCommunity, focal: "55% 50%", caption: "Meetups & communities" },
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

        {/* Settle band: calms the imagery at the hero's foot so the
            AssuranceStrip's cream wave lands on a quiet edge, not photo
            noise. Deliberately dark — a fade *to white* here would fog the
            montage and fight the wave, which already owns the transition. */}
        <div className="absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-zinc-950/80 to-transparent" />

        {/* Slide-synced captions, ≥lg only: anchored to the section's bottom
            edge, which is only reliably inside the initial viewport on
            desktop. Below lg the content column (plus real-device browser
            chrome shrinking svh) can grow the section past 100svh, pushing
            this stack below the fold — there the in-flow copy inside the
            Container takes over. */}
        <div className="pointer-events-none absolute bottom-8 right-8 z-30 hidden justify-items-end lg:grid">
          <CaptionChips />
        </div>
      </div>

      {/* Decorative scroll cue — non-interactive so the hero can stay a
          server component (smooth anchor scrolling would need the JS util).
          ≥lg only, same below-the-fold reasoning as the caption overlay. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-5 z-30 hidden justify-center lg:flex"
      >
        <svg
          className={cn("size-6 text-white/60", styles.cueIcon)}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Mobile keeps the original tighter top rhythm (header + 1rem) so the
          full content column — captions included — fits short phone
          viewports; the airier +6rem is a desktop luxury from sm up. */}
      <Container className="relative z-30 flex flex-col justify-center pt-[calc(var(--site-header-height)+1rem)] pb-24 sm:pt-[calc(var(--site-header-height)+6rem)] sm:pb-32">
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

          {/* <lg: the slide-synced captions join the content flow, where
              they're guaranteed inside the first viewport (see the overlay
              copy above for why the bottom-anchored version can't work
              here). Decorative like the overlay — the same names are real
              text in UseCaseGrid. */}
          <div aria-hidden="true" className="mt-6 grid justify-items-start sm:mt-8 lg:hidden">
            <CaptionChips />
          </div>
        </div>
      </Container>
    </section>
  );
}

/* One chip per slide, stacked in a single grid cell; each shares its slide's
   --delay so the visible chip always names the photo on screen. Rendered
   twice (overlay ≥lg, in-flow <lg) — only one instance is displayed at a
   time, and the grid cell always reserves one chip of height, so there is
   no layout shift during the caption-free transition beats. */
function CaptionChips() {
  return (
    <>
      {montage.map(({ caption }, i) => (
        <span
          key={caption}
          className={cn(
            "col-start-1 row-start-1 inline-flex items-center self-end rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white ring-1 ring-white/15",
            styles.caption,
            i === 0 && styles.firstVisible
          )}
          style={
            {
              "--cycle": `${CYCLE_SECONDS}s`,
              "--delay": `${i * SLOT_SECONDS - FADE_IN_END_SECONDS}s`,
            } as React.CSSProperties
          }
        >
          {caption}
        </span>
      ))}
    </>
  );
}
