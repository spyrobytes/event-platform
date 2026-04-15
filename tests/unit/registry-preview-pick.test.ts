import { describe, it, expect } from "vitest";
import { pickPreviewItems } from "@/lib/registry-claims";

type Item = { id: string; featured?: boolean };
const items = (xs: Array<string | [string, boolean]>): Item[] =>
  xs.map((x) =>
    typeof x === "string" ? { id: x } : { id: x[0], featured: x[1] }
  );

describe("pickPreviewItems", () => {
  it("returns featured items first in authored order", () => {
    const out = pickPreviewItems(
      items([["a", false], ["b", true], ["c", false], ["d", true]]),
      4
    );
    expect(out.map((i) => i.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("caps the result at N", () => {
    const out = pickPreviewItems(items(["a", "b", "c", "d", "e", "f"]), 4);
    expect(out.map((i) => i.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("fills remaining slots with non-featured when featured < cap", () => {
    const out = pickPreviewItems(
      items([["a", false], ["b", true], ["c", false]]),
      4
    );
    expect(out.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("preserves authored order within each bucket", () => {
    const out = pickPreviewItems(
      items([["z", true], ["a", false], ["y", true], ["b", false]]),
      4
    );
    expect(out.map((i) => i.id)).toEqual(["z", "y", "a", "b"]);
  });

  it("returns empty array when cap <= 0", () => {
    expect(pickPreviewItems(items(["a", "b"]), 0)).toEqual([]);
    expect(pickPreviewItems(items(["a", "b"]), -1)).toEqual([]);
  });

  it("treats undefined/false featured consistently (both non-featured)", () => {
    const out = pickPreviewItems(
      [{ id: "a" }, { id: "b", featured: false }, { id: "c", featured: true }],
      3
    );
    expect(out.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("handles empty input", () => {
    expect(pickPreviewItems([], 4)).toEqual([]);
  });
});
