// Provider-aware parser for organizer-pasted stream URLs. Pure module —
// no I/O, no React. Used by both the editor (instant validation) and the
// API schema (server-side normalization at save time). Output is the
// minimum set of fields needed to (a) re-render the canonical sourceUrl,
// and (b) compute the safe embed URL via build-embed-url.ts.

export type StreamProvider = "youtube" | "vimeo" | "facebook";

export type ParsedStream = {
  provider: StreamProvider;
  videoId: string;
  vimeoHash?: string;
  // Canonical source URL — what we render in "Open stream directly" and
  // what we re-feed to the Facebook plugin. Always https.
  sourceUrl: string;
};

export type ParseError =
  | { code: "empty"; message: string }
  | { code: "invalid_url"; message: string }
  | { code: "unsupported_provider"; message: string }
  | { code: "missing_video_id"; message: string };

export type ParseResult =
  | { ok: true; stream: ParsedStream }
  | { ok: false; error: ParseError };

// 11-char YouTube video ID, base64-url alphabet.
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

const FB_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.watch",
]);

export function parseStreamUrl(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: { code: "empty", message: "Paste a stream URL." } };
  }

  // Reject obvious raw HTML — never allow organizers to paste <iframe>/<script>.
  if (/<\s*(iframe|script|object|embed)\b/i.test(trimmed)) {
    return {
      ok: false,
      error: {
        code: "invalid_url",
        message:
          "Paste the link to the video page, not the embed code.",
      },
    };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error: { code: "invalid_url", message: "That doesn't look like a valid URL." },
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      error: { code: "invalid_url", message: "URL must start with https://" },
    };
  }

  const host = url.hostname.toLowerCase();

  if (YT_HOSTS.has(host)) return parseYouTube(url, host);
  if (VIMEO_HOSTS.has(host)) return parseVimeo(url, host);
  if (FB_HOSTS.has(host)) return parseFacebook(url, host);

  return {
    ok: false,
    error: {
      code: "unsupported_provider",
      message: "Only YouTube, Vimeo, and Facebook stream links are supported.",
    },
  };
}

function parseYouTube(url: URL, host: string): ParseResult {
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = firstPathSegment(url.pathname);
  } else {
    const path = url.pathname;
    if (path === "/watch" || path === "/watch/") {
      videoId = url.searchParams.get("v");
    } else if (path.startsWith("/live/")) {
      videoId = firstPathSegment(path.slice("/live".length));
    } else if (path.startsWith("/embed/")) {
      videoId = firstPathSegment(path.slice("/embed".length));
    } else if (path.startsWith("/shorts/")) {
      // Shorts are short uploaded clips, not livestreams. Accept the ID so the
      // editor doesn't reject them outright (organizers occasionally use this
      // format for replays), but the same 11-char rule applies.
      videoId = firstPathSegment(path.slice("/shorts".length));
    }
  }

  if (!videoId || !YT_ID_RE.test(videoId)) {
    return {
      ok: false,
      error: {
        code: "missing_video_id",
        message: "Couldn't find a YouTube video ID in that URL.",
      },
    };
  }

  return {
    ok: true,
    stream: {
      provider: "youtube",
      videoId,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    },
  };
}

function parseVimeo(url: URL, host: string): ParseResult {
  let videoId: string | null = null;
  let vimeoHash: string | undefined;

  if (host === "player.vimeo.com") {
    // player.vimeo.com/video/<id>(?h=<hash>)
    const m = url.pathname.match(/^\/video\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (m) {
      videoId = m[1];
      if (m[2]) vimeoHash = m[2];
    }
    if (!vimeoHash) {
      const h = url.searchParams.get("h");
      if (h && /^[a-zA-Z0-9]+$/.test(h)) vimeoHash = h;
    }
  } else {
    // vimeo.com/<id> or vimeo.com/<id>/<hash>
    // Reject /event/ paths — Vimeo livestream events use a different
    // embed format and aren't supported in MVP.
    if (url.pathname.startsWith("/event/")) {
      return {
        ok: false,
        error: {
          code: "unsupported_provider",
          message:
            "Vimeo Events aren't supported yet. Use the regular Vimeo video URL (vimeo.com/<id>).",
        },
      };
    }
    const m = url.pathname.match(/^\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (m) {
      videoId = m[1];
      if (m[2]) vimeoHash = m[2];
    }
  }

  if (!videoId) {
    return {
      ok: false,
      error: {
        code: "missing_video_id",
        message: "Couldn't find a Vimeo video ID in that URL.",
      },
    };
  }

  const sourceUrl = vimeoHash
    ? `https://vimeo.com/${videoId}/${vimeoHash}`
    : `https://vimeo.com/${videoId}`;

  return {
    ok: true,
    stream: { provider: "vimeo", videoId, vimeoHash, sourceUrl },
  };
}

function parseFacebook(url: URL, host: string): ParseResult {
  let videoId: string | null = null;

  if (host === "fb.watch") {
    // fb.watch/<shortcode>
    videoId = firstPathSegment(url.pathname);
  } else {
    const path = url.pathname;
    // /<page>/videos/<id>  or  /videos/<id>
    const videosMatch = path.match(/\/videos\/(\d+)/);
    if (videosMatch) {
      videoId = videosMatch[1];
    } else if (path === "/watch" || path === "/watch/" || path.includes("/watch/")) {
      videoId = url.searchParams.get("v");
    } else if (path.startsWith("/live") || path.includes("/live/")) {
      // /live/?v=<id>  or  /<page>/live/<id>
      videoId = url.searchParams.get("v");
      if (!videoId) {
        const liveMatch = path.match(/\/live\/(\d+)/);
        if (liveMatch) videoId = liveMatch[1];
      }
    } else if (path.startsWith("/share/v/")) {
      const m = path.match(/^\/share\/v\/([A-Za-z0-9_-]+)/);
      if (m) videoId = m[1];
    } else if (path.includes("/posts/")) {
      // Posts can wrap a video; accept best-effort.
      const m = path.match(/\/posts\/([A-Za-z0-9_-]+)/);
      if (m) videoId = m[1];
    }
  }

  if (!videoId) {
    return {
      ok: false,
      error: {
        code: "missing_video_id",
        message:
          "Couldn't recognize that Facebook URL. Use a public video or watch link.",
      },
    };
  }

  // Facebook's plugin resolves by full source URL, so preserve the original
  // (normalized to https). Strip query params except `v` to avoid leaking
  // tracking params into the embed.
  const stripped = new URL(url.toString());
  stripped.protocol = "https:";
  // Remove non-essential query params; keep `v` if present.
  const keptV = stripped.searchParams.get("v");
  for (const key of Array.from(stripped.searchParams.keys())) {
    stripped.searchParams.delete(key);
  }
  if (keptV) stripped.searchParams.set("v", keptV);

  return {
    ok: true,
    stream: {
      provider: "facebook",
      videoId,
      sourceUrl: stripped.toString(),
    },
  };
}

function firstPathSegment(path: string): string | null {
  const seg = path.replace(/^\/+/, "").split("/")[0];
  return seg ? decodeURIComponent(seg) : null;
}
