import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Section } from "../ui/Section";
import { ButtonLink } from "../ui/ButtonLink";
import { RevealOnScroll } from "../ui/RevealOnScroll";
import reveal from "../ui/reveal.module.css";
import { showcaseSerif } from "./showcase-fonts";
import styles from "./TemplateShowcase.module.css";

type Plate = {
  number: string;
  name: string;
  blurb: string;
  src: string;
  alt: string;
  /** aspect-ratio of the source capture, passed to CSS as a scalar */
  ratio: string;
  stagger?: "drop" | "lift";
  /** Live demo page (/sample-templates/*) — makes the plate clickable. */
  href?: string;
};

const tallPlates: Plate[] = [
  {
    number: "№ 01",
    name: "Wedding Cinematic",
    blurb: "A slow-reveal, film-title opening for the big day.",
    src: "/landing/templates/cinematic.jpg",
    alt: "Wedding Cinematic template — full-bleed ceremony photo behind the couple's names",
    ratio: "43 / 88",
    href: "/sample-templates/cinematic",
  },
  {
    number: "№ 02",
    name: "The Grand Luxe",
    blurb: "Cutout couple portraits layered over dark florals, with gilded details.",
    src: "/landing/templates/grand-luxe.jpg",
    alt: "The Grand Luxe template — couple cutout layered over dark florals with serif names",
    ratio: "860 / 1760",
    stagger: "drop",
    href: "/sample-templates/grand-luxe",
  },
  {
    number: "№ 03",
    name: "Celebration",
    blurb: "Warm champagne light for parties of every kind.",
    src: "/landing/templates/celebration.jpg",
    alt: "Celebration template — champagne-toned page with framed photo and events timeline",
    ratio: "860 / 1760",
    stagger: "lift",
    href: "/sample-templates/celebration",
  },
];

const scrapbookPlate: Plate = {
  number: "№ 04",
  name: "Scrapbook Gallery",
  blurb: "Tilted polaroids and taped memories, straight from your photos.",
  src: "/landing/templates/scrapbook.jpg",
  alt: "Scrapbook Gallery — a row of tilted polaroid wedding photos on a cream page",
  ratio: "1805 / 547",
  href: "/sample-templates/cinematic?edition=scrapbook",
};

const partyPlate: Plate = {
  number: "№ 05",
  name: "The Wedding Party",
  blurb: "Introduce your people — portraits, roles, and all.",
  src: "/landing/templates/wedding-party.jpg",
  alt: "Wedding party section — couture polaroid portraits of the bridal party with names and roles",
  ratio: "2414 / 1318",
  href: "/sample-templates/grand-luxe#party",
};

function PlateCaption({ plate }: { plate: Plate }) {
  return (
    <figcaption className="mt-4">
      <div className="flex items-baseline gap-3">
        <span className={styles.plateNumber}>{plate.number}</span>
        <span className="text-sm font-semibold tracking-wide text-[#f5efe4]">
          {plate.name}
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[#f5efe4]/55">{plate.blurb}</p>
    </figcaption>
  );
}

function ShowcasePlate({
  plate,
  index,
  sizes,
}: {
  plate: Plate;
  index: number;
  sizes: string;
}) {
  const frame = (
    <div className={styles.plateFrame}>
      <div className={styles.plateImageWrap}>
        <Image
          src={plate.src}
          alt={plate.alt}
          fill
          className="object-cover object-top"
          sizes={sizes}
        />
      </div>
      {plate.href && (
        <span className={styles.plateHint} aria-hidden="true">
          View live demo →
        </span>
      )}
    </div>
  );

  return (
    <figure
      className={cn(
        reveal.item,
        styles.plate,
        plate.stagger === "drop" && styles.plateDrop,
        plate.stagger === "lift" && styles.plateLift
      )}
      style={{ "--reveal-i": index, "--plate-ar": plate.ratio } as React.CSSProperties}
    >
      {plate.href ? (
        <Link
          href={plate.href}
          className={styles.plateLink}
          aria-label={`${plate.name} — view the live demo`}
        >
          {frame}
        </Link>
      ) : (
        frame
      )}
      <PlateCaption plate={plate} />
    </figure>
  );
}

/**
 * The one section of the landing page rendered in the product's own voice:
 * every plate is a real EventFXr template captured from a live render — no
 * mockups. Serif, champagne and ink deliberately break from the SaaS chrome
 * around it.
 */
export function TemplateShowcase() {
  return (
    <Section
      id="templates"
      className={`${showcaseSerif.variable} ${styles.stage} relative overflow-hidden bg-[#181310]`}
    >
      <RevealOnScroll visibleClassName={reveal.groupVisible}>
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <span className={styles.eyebrow}>The Template Collection</span>
          </div>
          <h2 className={`${styles.headline} mt-5 text-4xl sm:text-5xl`}>
            Pages your guests
            <span className={styles.headlineAccent}> will keep</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#f5efe4]/60">
            These aren&apos;t mockups. Every frame below is a real EventFXr page,
            rendered from a live template — click one to walk through it, then
            add your names and it&apos;s yours.
          </p>
        </div>

        <div className={`${styles.filmstrip} mt-14 lg:grid lg:grid-cols-3 lg:gap-8`}>
          {tallPlates.map((plate, i) => (
            <ShowcasePlate
              key={plate.name}
              plate={plate}
              index={i}
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 44vw, 74vw"
            />
          ))}
        </div>

        <div className="mt-10 lg:mt-14">
          <ShowcasePlate plate={scrapbookPlate} index={3} sizes="92vw" />
        </div>

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <ShowcasePlate
              plate={partyPlate}
              index={4}
              sizes="(min-width: 1024px) 55vw, 92vw"
            />
          </div>

          <figure
            className={cn(reveal.item, styles.plate, "lg:col-span-5")}
            style={{ "--reveal-i": 5 } as React.CSSProperties}
          >
            <div className={styles.envelopeStage} aria-hidden="true">
              <div className={styles.gcrStage}>
                <div className={styles.gcrCard}>
                  <div className={`${styles.gcrFace} ${styles.gcrBack}`}>
                    <div className={styles.gcrSeal}>
                      <span className={styles.gcrSealGlow} />
                      <span className={`${styles.gcrSealHalf} ${styles.gcrSealLeft}`}>
                        <span className={styles.gcrSealMonogram}>A·J</span>
                      </span>
                      <span className={`${styles.gcrSealHalf} ${styles.gcrSealRight}`}>
                        <span className={styles.gcrSealMonogram}>A·J</span>
                      </span>
                    </div>
                  </div>
                  <div className={`${styles.gcrFace} ${styles.gcrFront}`}>
                    <span className={styles.gcrFrontScript}>Together with their families</span>
                    <span className={styles.gcrFrontNames}>Avery &amp; Jordan</span>
                    <span className={styles.gcrFrontRule} />
                    <span className={styles.gcrFrontDate}>08 · 15 · 2026</span>
                  </div>
                </div>
              </div>
            </div>
            <PlateCaption
              plate={{
                number: "№ 06",
                name: "Animated Invitation Cards",
                blurb:
                  "Shown: Golden Card Reveal. Also in the collection — Split Reveal, Flip Flap Reveal, and the Wedding Storybook.",
                src: "",
                alt: "",
                ratio: "",
              }}
            />
          </figure>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/join" variant="secondary" className="px-6 py-3 text-base">
            Start with a template
          </ButtonLink>
          <ButtonLink
            href="/events"
            variant="ghost"
            className="text-[#f5efe4]/75 hover:text-[#f5efe4]"
          >
            See events built with EventFXr →
          </ButtonLink>
        </div>
      </RevealOnScroll>
    </Section>
  );
}
