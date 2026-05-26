import { buildEmbedUrl } from "@/lib/livestream/build-embed-url";
import type { LivestreamSectionData } from "@/schemas/event-page";

type Props = {
  data: LivestreamSectionData;
  // When true, render the `replay` reference (if present) instead of `primary`.
  useReplay?: boolean;
};

// Iframe-only player. The "Open stream directly" fallback link below always
// shows so viewers can recover when an embed fails (the dominant Facebook
// failure mode, and a Vimeo private-link gotcha).
//
// Colors use template CSS variables with fallbacks — see LivestreamCountdown
// for the rationale.
export function LivestreamPlayer({ data, useReplay = false }: Props) {
  const ref = useReplay && data.replay ? data.replay : data.primary;
  if (!ref) {
    return (
      <div
        className="rounded-2xl px-6 py-12 text-center text-sm"
        style={{
          border: "1px solid var(--border, #e5e7eb)",
          background: "var(--surface, rgba(0,0,0,0.02))",
          color: "var(--text-2, #6b7280)",
        }}
      >
        The stream link hasn&apos;t been added yet.
      </div>
    );
  }
  const embedUrl = buildEmbedUrl(ref, { useNocookie: data.useNocookie ?? true });
  const title = data.heading || "Event live stream";

  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-2xl shadow-xl"
        style={{
          border: "1px solid var(--border, #e5e7eb)",
          background: "#000",
        }}
      >
        <iframe
          src={embedUrl}
          title={title}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <a
          href={ref.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
          style={{ color: "var(--accent, #1e1b17)" }}
        >
          <span>Open stream directly</span>
          <span aria-hidden>↗</span>
        </a>
        {data.fallbackMessage && (
          <p style={{ color: "var(--text-2, #6b7280)" }}>{data.fallbackMessage}</p>
        )}
      </div>
    </div>
  );
}
