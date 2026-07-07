import { describe, it, expect } from "vitest";
import { deriveAltFromFilename } from "@/lib/gallery-alt";

describe("deriveAltFromFilename", () => {
  it("humanizes descriptive filenames", () => {
    expect(deriveAltFromFilename("first-dance_golden-hour.jpg")).toBe(
      "first dance golden hour",
    );
    expect(deriveAltFromFilename("Émilie & Marc first dance.HEIC")).toBe(
      "Émilie & Marc first dance",
    );
    expect(deriveAltFromFilename("cake cutting.webp")).toBe("cake cutting");
    // Dotted word separators humanize too (extension stripped first).
    expect(deriveAltFromFilename("our.wedding.day.jpg")).toBe(
      "our wedding day",
    );
    // A trailing ".2024" is content, not an extension (extensions start
    // with a letter) — the year survives.
    expect(deriveAltFromFilename("reception.2024")).toBe("reception 2024");
  });

  it("keeps hex-alphabet words that only look like hashes", () => {
    expect(deriveAltFromFilename("dead beef cafe faced.jpg")).toBe(
      "dead beef cafe faced",
    );
  });

  it("returns empty for camera-generated names", () => {
    expect(deriveAltFromFilename("IMG_4021.JPG")).toBe("");
    expect(deriveAltFromFilename("DSC0042.jpg")).toBe("");
    expect(deriveAltFromFilename("DSCN 1234.jpg")).toBe("");
    expect(deriveAltFromFilename("PXL_20240613_123456789.jpg")).toBe("");
    expect(deriveAltFromFilename("Screenshot 2024-06-13 at 12.30.00.png")).toBe(
      "",
    );
    expect(deriveAltFromFilename("photo_2024-06-13_21-45-12.jpg")).toBe("");
    expect(deriveAltFromFilename("Burst01.jpg")).toBe("");
  });

  it("returns empty for messenger export names", () => {
    expect(
      deriveAltFromFilename("WhatsApp Image 2024-06-13 at 21.45.12.jpeg"),
    ).toBe("");
    expect(deriveAltFromFilename("received_482910284.jpeg")).toBe("");
  });

  it("returns empty for bare timestamps and digit soup", () => {
    expect(deriveAltFromFilename("2024-06-13 21.45.12.jpg")).toBe("");
    expect(deriveAltFromFilename("20240613_214512.jpg")).toBe("");
  });

  it("returns empty for opaque ids and hashes", () => {
    expect(
      deriveAltFromFilename("3f2a9c81-77de-4b1a-9c2f-1d2e3f4a5b6c.jpg"),
    ).toBe("");
    expect(deriveAltFromFilename("a1b2c3d4e5f6a7b8c9d0.webp")).toBe("");
  });

  it("handles null/undefined/empty", () => {
    expect(deriveAltFromFilename(null)).toBe("");
    expect(deriveAltFromFilename(undefined)).toBe("");
    expect(deriveAltFromFilename("")).toBe("");
    expect(deriveAltFromFilename(".jpg")).toBe("");
  });

  it("caps very long names at 140 chars", () => {
    const long = `${"wedding party ".repeat(20)}finale.jpg`;
    expect(deriveAltFromFilename(long).length).toBeLessThanOrEqual(140);
  });
});
