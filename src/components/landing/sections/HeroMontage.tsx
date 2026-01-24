import Image from "next/image";
import styles from "./HeroMontage.module.css";
import { ButtonLink } from "../ui/ButtonLink";
import { Container } from "../ui/Container";

const montage = [
  { src: "/landing/hero/01.jpg", alt: "Conference audience" },
  { src: "/landing/hero/02.jpg", alt: "Networking event" },
  { src: "/landing/hero/03.jpg", alt: "Community meetup" },
  { src: "/landing/hero/04.jpg", alt: "Celebration event" },
];

export function HeroMontage() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 z-0 bg-zinc-950" />

        {montage.map((img, i) => (
          <div
            key={img.src}
            className={[
              "absolute inset-0 z-10",
              styles.layer,
              styles.animate,
              i === 0 ? styles.firstVisible : "",
            ].join(" ")}
            style={{
              animationDelay: `${i * 4}s, ${i * 4}s`,
            }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              priority={i === 0}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/70" />
          </div>
        ))}
      </div>

      <Container className="relative z-20 py-24 sm:py-32">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white ring-1 ring-white/15">
            <span className="relative flex size-2">
              <span className={`absolute inset-0 rounded-full bg-emerald-400 ${styles.statusPulse}`} />
              <span className="relative size-2 rounded-full bg-emerald-500" />
            </span>
            Now in early access
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Bring people together.
            <span className="block text-white/70">Without the chaos.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-white/85 sm:text-xl">
            Create stunning event pages in minutes. Send invites, track RSVPs, and fill
            every seat — all from one place.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink href="/login" variant="primary" ariaLabel="Create your free event">
              Create Your Free Event
            </ButtonLink>

            <ButtonLink href="#demo" variant="secondary">
              See how it works →
            </ButtonLink>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
            <span className="flex items-center gap-2">
              <svg className="size-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Free to start
            </span>
            <span className="flex items-center gap-2">
              <svg className="size-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              No credit card
            </span>
            <span className="flex items-center gap-2">
              <svg className="size-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Launch in 5 minutes
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
