import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildPassUrl,
  buildQrFilename,
  generateQrSvg,
  generateQrPngBuffer,
  generateQrDataUrl,
} from "@/lib/qr";

describe("buildPassUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://eventfxr.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds a pass URL keyed on passId", () => {
    expect(buildPassUrl("abc-123")).toBe("https://eventfxr.com/invite/pass/abc-123");
  });

  it("strips a trailing slash from the base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://eventfxr.com/");
    expect(buildPassUrl("abc-123")).toBe("https://eventfxr.com/invite/pass/abc-123");
  });

  it("strips multiple trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://eventfxr.com///");
    expect(buildPassUrl("abc-123")).toBe("https://eventfxr.com/invite/pass/abc-123");
  });

  it("throws a clear error when NEXT_PUBLIC_BASE_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "");
    expect(() => buildPassUrl("abc-123")).toThrow(/NEXT_PUBLIC_BASE_URL/);
  });
});

describe("generateQrSvg", () => {
  it("returns a valid SVG string", async () => {
    const svg = await generateQrSvg("https://example.com/x");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("respects the size argument", async () => {
    const svg = await generateQrSvg("https://example.com/x", 256);
    expect(svg).toMatch(/(width="256"|width=256)/);
  });
});

describe("generateQrPngBuffer", () => {
  it("returns a non-empty Buffer with PNG magic bytes", async () => {
    const buf = await generateQrPngBuffer("https://example.com/x");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });
});

describe("generateQrDataUrl", () => {
  it("returns a data:image/png;base64 URL", async () => {
    const url = await generateQrDataUrl("https://example.com/x");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    expect(url.length).toBeGreaterThan("data:image/png;base64,".length);
  });
});

describe("buildQrFilename", () => {
  const passId = "0123abcd-aaaa-bbbb-cccc-ddddeeeeffff";

  it("uses the guest name when provided", () => {
    expect(buildQrFilename("Alice", passId)).toBe("rsvp-alice-0123abcd.png");
  });

  it("falls back to 'invite' when name is null", () => {
    expect(buildQrFilename(null, passId)).toBe("rsvp-invite-0123abcd.png");
  });

  it("falls back to 'invite' when name is empty", () => {
    expect(buildQrFilename("", passId)).toBe("rsvp-invite-0123abcd.png");
  });

  it("falls back to 'invite' when name has no usable characters", () => {
    expect(buildQrFilename("!!!", passId)).toBe("rsvp-invite-0123abcd.png");
  });

  it("strips diacritics", () => {
    expect(buildQrFilename("Renée", passId)).toBe("rsvp-renee-0123abcd.png");
  });

  it("collapses non-alphanumeric runs to a single hyphen", () => {
    expect(buildQrFilename("John  &  Jane", passId)).toBe(
      "rsvp-john-jane-0123abcd.png"
    );
  });

  it("trims leading and trailing hyphens", () => {
    expect(buildQrFilename("--bob--", passId)).toBe("rsvp-bob-0123abcd.png");
  });

  it("caps the safe portion at 32 characters", () => {
    const longName = "a".repeat(40);
    const filename = buildQrFilename(longName, passId);
    expect(filename).toBe(`rsvp-${"a".repeat(32)}-0123abcd.png`);
  });

  it("preserves the first 8 chars of the passId as a suffix", () => {
    const otherPassId = "ffff1111-aaaa-bbbb-cccc-ddddeeeeffff";
    expect(buildQrFilename("Alice", otherPassId)).toBe("rsvp-alice-ffff1111.png");
  });
});
