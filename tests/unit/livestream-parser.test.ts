import { describe, it, expect } from "vitest";
import { parseStreamUrl } from "@/lib/livestream/parse-stream-url";
import { buildEmbedUrl } from "@/lib/livestream/build-embed-url";

function expectOk(input: string) {
  const result = parseStreamUrl(input);
  if (!result.ok) {
    throw new Error(`expected ok, got error: ${result.error.code} — ${result.error.message}`);
  }
  return result.stream;
}

function expectErr(input: string) {
  const result = parseStreamUrl(input);
  if (result.ok) {
    throw new Error(`expected error, got ok: ${JSON.stringify(result.stream)}`);
  }
  return result.error;
}

describe("parseStreamUrl — YouTube", () => {
  it("watch URL → canonical source + videoId", () => {
    const s = expectOk("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(s.provider).toBe("youtube");
    expect(s.videoId).toBe("dQw4w9WgXcQ");
    expect(s.sourceUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("youtu.be short URL → videoId", () => {
    const s = expectOk("https://youtu.be/dQw4w9WgXcQ");
    expect(s.videoId).toBe("dQw4w9WgXcQ");
  });

  it("youtube.com/live/ URL (livestream format)", () => {
    const s = expectOk("https://www.youtube.com/live/dQw4w9WgXcQ");
    expect(s.videoId).toBe("dQw4w9WgXcQ");
  });

  it("youtube.com/embed/ URL", () => {
    const s = expectOk("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(s.videoId).toBe("dQw4w9WgXcQ");
  });

  it("youtube-nocookie.com embed URL", () => {
    const s = expectOk("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(s.videoId).toBe("dQw4w9WgXcQ");
  });

  it("m.youtube.com mobile URL", () => {
    const s = expectOk("https://m.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(s.videoId).toBe("dQw4w9WgXcQ");
  });

  it("URL with extra query params (timestamp, tracking)", () => {
    const s = expectOk("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=share");
    expect(s.videoId).toBe("dQw4w9WgXcQ");
    expect(s.sourceUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("rejects video ID that's not 11 chars", () => {
    expectErr("https://www.youtube.com/watch?v=tooShort");
  });

  it("rejects URL with no video ID", () => {
    expectErr("https://www.youtube.com/feed/trending");
  });
});

describe("parseStreamUrl — Vimeo", () => {
  it("vimeo.com/<id> public", () => {
    const s = expectOk("https://vimeo.com/123456789");
    expect(s.provider).toBe("vimeo");
    expect(s.videoId).toBe("123456789");
    expect(s.vimeoHash).toBeUndefined();
    expect(s.sourceUrl).toBe("https://vimeo.com/123456789");
  });

  it("vimeo.com/<id>/<hash> preserves private hash (critical for unlisted streams)", () => {
    const s = expectOk("https://vimeo.com/123456789/abc123def");
    expect(s.videoId).toBe("123456789");
    expect(s.vimeoHash).toBe("abc123def");
    expect(s.sourceUrl).toBe("https://vimeo.com/123456789/abc123def");
  });

  it("player.vimeo.com/video/<id>", () => {
    const s = expectOk("https://player.vimeo.com/video/123456789");
    expect(s.videoId).toBe("123456789");
    expect(s.vimeoHash).toBeUndefined();
  });

  it("player.vimeo.com/video/<id>?h=<hash>", () => {
    const s = expectOk("https://player.vimeo.com/video/123456789?h=abc123def");
    expect(s.videoId).toBe("123456789");
    expect(s.vimeoHash).toBe("abc123def");
  });

  it("rejects /event/ paths with helpful message", () => {
    const err = expectErr("https://vimeo.com/event/9876");
    expect(err.code).toBe("unsupported_provider");
    expect(err.message).toMatch(/Events aren't supported/i);
  });
});

describe("parseStreamUrl — Facebook (best-effort)", () => {
  it("/<page>/videos/<id>", () => {
    const s = expectOk("https://www.facebook.com/eventfxr/videos/1234567890");
    expect(s.provider).toBe("facebook");
    expect(s.videoId).toBe("1234567890");
    expect(s.sourceUrl).toContain("facebook.com");
  });

  it("/watch/?v=<id>", () => {
    const s = expectOk("https://www.facebook.com/watch/?v=1234567890");
    expect(s.videoId).toBe("1234567890");
  });

  it("/live/?v=<id>", () => {
    const s = expectOk("https://www.facebook.com/live/?v=1234567890");
    expect(s.videoId).toBe("1234567890");
  });

  it("/share/v/<id>", () => {
    const s = expectOk("https://www.facebook.com/share/v/aBc123Def_/");
    expect(s.videoId).toBe("aBc123Def_");
  });

  it("fb.watch short URL", () => {
    const s = expectOk("https://fb.watch/abc123/");
    expect(s.videoId).toBe("abc123");
  });

  it("strips tracking query params from sourceUrl", () => {
    const s = expectOk(
      "https://www.facebook.com/eventfxr/videos/1234567890?__cft__=garbage&ref=share"
    );
    expect(s.sourceUrl).not.toContain("__cft__");
    expect(s.sourceUrl).not.toContain("ref=share");
  });
});

describe("parseStreamUrl — rejections", () => {
  it("empty string", () => {
    const err = expectErr("");
    expect(err.code).toBe("empty");
  });

  it("whitespace only", () => {
    expectErr("   ");
  });

  it("malformed URL", () => {
    expectErr("not a url at all");
  });

  it("non-https protocol", () => {
    expectErr("ftp://example.com/video");
  });

  it("raw iframe HTML", () => {
    const err = expectErr('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>');
    expect(err.code).toBe("invalid_url");
    expect(err.message).toMatch(/embed code/);
  });

  it("script tag", () => {
    expectErr('<script src="https://evil.com/x.js"></script>');
  });

  it("unsupported domain", () => {
    const err = expectErr("https://twitch.tv/somestreamer");
    expect(err.code).toBe("unsupported_provider");
  });
});

describe("buildEmbedUrl", () => {
  it("youtube defaults to nocookie", () => {
    const s = expectOk("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(buildEmbedUrl(s)).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("youtube with useNocookie:false", () => {
    const s = expectOk("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(buildEmbedUrl(s, { useNocookie: false })).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
  });

  it("vimeo public", () => {
    const s = expectOk("https://vimeo.com/123456789");
    expect(buildEmbedUrl(s)).toBe("https://player.vimeo.com/video/123456789");
  });

  it("vimeo private preserves hash via ?h=", () => {
    const s = expectOk("https://vimeo.com/123456789/abc123def");
    expect(buildEmbedUrl(s)).toBe(
      "https://player.vimeo.com/video/123456789?h=abc123def"
    );
  });

  it("facebook plugin URL encodes source href", () => {
    const s = expectOk("https://www.facebook.com/eventfxr/videos/1234567890");
    const embed = buildEmbedUrl(s);
    expect(embed).toContain("facebook.com/plugins/video.php");
    expect(embed).toContain(encodeURIComponent("https://www.facebook.com/eventfxr/videos/1234567890"));
    expect(embed).toContain("show_text=false");
  });
});
