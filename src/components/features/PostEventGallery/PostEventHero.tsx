import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";

type Props = {
  title: string;
  description: string | null;
  coverUrl: string | null;
};

/**
 * Hero block for the dedicated post-event gallery page. Replaces the
 * pre-PR-C minimal `h1 + description` chrome with a full-bleed cover
 * image + gradient overlay + centered headline.
 *
 * Cover image is the gallery's resolved coverUrl (explicit organizer
 * pick → hero asset fallback chain handled upstream in `gallery-data.ts`).
 * Falls back to a soft surface gradient when no cover is available so
 * the hero doesn't collapse to a thin band.
 */
export function PostEventHero({ title, description, coverUrl }: Props) {
  return (
    <section
      className="relative isolate overflow-hidden"
      aria-labelledby="post-event-hero-title"
    >
      {coverUrl ? (
        <div className="absolute inset-0 -z-10">
          <Image
            src={coverUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            unoptimized={!isAllowedImageHost(coverUrl)}
          />
          {/* Bottom-weighted gradient so the headline reads against any
              cover image, light or dark. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-br from-muted via-background to-muted"
        />
      )}

      <div className="mx-auto flex min-h-[44vh] max-w-4xl flex-col items-center justify-center gap-4 px-4 py-16 text-center md:min-h-[55vh] md:py-24">
        <p
          className={
            coverUrl
              ? "text-xs font-medium uppercase tracking-[0.25em] text-white/80"
              : "text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground"
          }
        >
          Photo Gallery
        </p>
        <h1
          id="post-event-hero-title"
          className={
            coverUrl
              ? "text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl"
              : "text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl"
          }
        >
          {title}
        </h1>
        {description && (
          <p
            className={
              coverUrl
                ? "max-w-prose text-base leading-relaxed text-white/90 md:text-lg"
                : "max-w-prose text-base leading-relaxed text-muted-foreground md:text-lg"
            }
          >
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
