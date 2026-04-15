import { describe, it, expect } from "vitest";
import {
  formatViolation,
  formatViolations,
  validateRegistrySaveAgainstClaims,
} from "@/lib/registry-save-guards";
import type { EventPageConfigV1 } from "@/schemas/event-page";

type TestItem = {
  id: string;
  name?: string;
  type?: "link" | "fund";
  quantity?: number;
};

function buildConfig(items: TestItem[]): EventPageConfigV1 {
  return {
    version: 1,
    sections: [
      {
        type: "registry",
        data: {
          heading: "Registry",
          items: items.map((i) => ({
            id: i.id,
            name: i.name ?? i.id,
            type: i.type ?? "link",
            url: "https://example.com",
            quantity: i.quantity ?? 1,
          })),
        },
      },
    ],
  } as unknown as EventPageConfigV1;
}

describe("validateRegistrySaveAgainstClaims", () => {
  it("returns no violations when no claims exist", () => {
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: buildConfig([{ id: "a" }]),
      newConfig: buildConfig([]),
      existingClaims: [],
    });
    expect(out).toEqual([]);
  });

  it("returns no violations when config is unchanged and claims fit", () => {
    const cfg = buildConfig([{ id: "a", quantity: 3 }]);
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: cfg,
      newConfig: cfg,
      existingClaims: [
        { itemId: "a", quantity: 1, source: "GUEST" },
        { itemId: "a", quantity: 1, source: "GUEST" },
      ],
    });
    expect(out).toEqual([]);
  });

  it("blocks removing an item that has live claims", () => {
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: buildConfig([{ id: "a", name: "Blender" }]),
      newConfig: buildConfig([]),
      existingClaims: [{ itemId: "a", quantity: 1, source: "GUEST" }],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "removed_with_claims",
      itemId: "a",
      itemName: "Blender",
      claimedQuantity: 1,
    });
  });

  it("treats a link→fund type switch as removal when claims exist", () => {
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: buildConfig([{ id: "a", name: "Blender", type: "link" }]),
      newConfig: buildConfig([{ id: "a", name: "Blender", type: "fund" }]),
      existingClaims: [{ itemId: "a", quantity: 2, source: "GUEST" }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("removed_with_claims");
  });

  it("blocks reducing quantity below the already-claimed total", () => {
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: buildConfig([{ id: "a", name: "Towels", quantity: 5 }]),
      newConfig: buildConfig([{ id: "a", name: "Towels", quantity: 2 }]),
      existingClaims: [
        { itemId: "a", quantity: 1, source: "GUEST" },
        { itemId: "a", quantity: 1, source: "GUEST" },
        { itemId: "a", quantity: 1, source: "GUEST" },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "quantity_below_claims",
      itemId: "a",
      newQuantity: 2,
      claimedQuantity: 3,
    });
  });

  it("allows reducing quantity down to exactly the claimed total", () => {
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: buildConfig([{ id: "a", quantity: 5 }]),
      newConfig: buildConfig([{ id: "a", quantity: 2 }]),
      existingClaims: [
        { itemId: "a", quantity: 1, source: "GUEST" },
        { itemId: "a", quantity: 1, source: "GUEST" },
      ],
    });
    expect(out).toEqual([]);
  });

  it("counts organizer claims toward the total (purchased toggle)", () => {
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: buildConfig([{ id: "a", quantity: 2 }]),
      newConfig: buildConfig([{ id: "a", quantity: 1 }]),
      existingClaims: [{ itemId: "a", quantity: 2, source: "ORGANIZER" }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("quantity_below_claims");
  });

  it("accumulates multiple violations in one pass", () => {
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: buildConfig([
        { id: "a", name: "Blender" },
        { id: "b", name: "Towels", quantity: 5 },
      ]),
      newConfig: buildConfig([{ id: "b", name: "Towels", quantity: 1 }]),
      existingClaims: [
        { itemId: "a", quantity: 1, source: "GUEST" },
        { itemId: "b", quantity: 3, source: "GUEST" },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out.map((v) => v.kind).sort()).toEqual([
      "quantity_below_claims",
      "removed_with_claims",
    ]);
  });

  it("uses placeholder name when old config can't be parsed for a removed item", () => {
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: null,
      newConfig: buildConfig([]),
      existingClaims: [{ itemId: "orphan", quantity: 1, source: "GUEST" }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].itemName).toBe("this gift");
  });

  it("ignores zero-quantity entries (should not occur, defensive)", () => {
    const out = validateRegistrySaveAgainstClaims({
      oldConfig: buildConfig([{ id: "a" }]),
      newConfig: buildConfig([]),
      existingClaims: [{ itemId: "a", quantity: 0, source: "GUEST" }],
    });
    expect(out).toEqual([]);
  });
});

describe("formatViolation", () => {
  it("renders removed_with_claims copy with singular/plural guests", () => {
    expect(
      formatViolation({
        kind: "removed_with_claims",
        itemId: "a",
        itemName: "Blender",
        claimedQuantity: 1,
      })
    ).toContain("1 guest has");
    expect(
      formatViolation({
        kind: "removed_with_claims",
        itemId: "a",
        itemName: "Blender",
        claimedQuantity: 3,
      })
    ).toContain("3 guests have");
  });

  it("joins multiple violations in formatViolations", () => {
    const msg = formatViolations([
      {
        kind: "removed_with_claims",
        itemId: "a",
        itemName: "Blender",
        claimedQuantity: 1,
      },
      {
        kind: "quantity_below_claims",
        itemId: "b",
        itemName: "Towels",
        newQuantity: 1,
        claimedQuantity: 3,
      },
    ]);
    expect(msg).toContain("Blender");
    expect(msg).toContain("Towels");
  });
});
