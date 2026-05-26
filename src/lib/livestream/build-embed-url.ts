// Compute the iframe `src` URL from parsed stream fields. Pure function.
// Kept separate from the parser so the renderer can call it directly
// without re-validating user input.

import type { StreamReference } from "@/schemas/event-page";

type BuildEmbedOptions = {
  // YouTube only — when true (default) the embed loads from
  // youtube-nocookie.com instead of youtube.com.
  useNocookie?: boolean;
  // Future: autoplay, mute, start-seconds, etc. Add per provider as needed.
};

export function buildEmbedUrl(
  stream: StreamReference,
  options: BuildEmbedOptions = {}
): string {
  const useNocookie = options.useNocookie ?? true;

  switch (stream.provider) {
    case "youtube": {
      const host = useNocookie ? "www.youtube-nocookie.com" : "www.youtube.com";
      return `https://${host}/embed/${encodeURIComponent(stream.videoId)}`;
    }
    case "vimeo": {
      const base = `https://player.vimeo.com/video/${encodeURIComponent(stream.videoId)}`;
      if (!stream.vimeoHash) return base;
      const u = new URL(base);
      u.searchParams.set("h", stream.vimeoHash);
      return u.toString();
    }
    case "facebook": {
      const u = new URL("https://www.facebook.com/plugins/video.php");
      u.searchParams.set("href", stream.sourceUrl);
      u.searchParams.set("show_text", "false");
      u.searchParams.set("width", "auto");
      return u.toString();
    }
  }
}

// Allowlist of frame-src hosts the renderer touches. Surfaced for tests
// and for any future CSP work — single source of truth so the allowlist
// can't drift from the embed builder.
export const LIVESTREAM_FRAME_HOSTS: ReadonlyArray<string> = [
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
  "https://player.vimeo.com",
  "https://www.facebook.com",
];
