import { describe, it, expect } from "vitest";
import {
  partitionPartyMembers,
  type PartyMember,
} from "@/components/templates/shared/wedding-party/party-groups";

describe("partitionPartyMembers", () => {
  it("splits special roles, bride/groom sides, and others", () => {
    const members: PartyMember[] = [
      { name: "A", role: "Maid of Honor", side: "bride" },
      { name: "B", role: "Bridesmaid", side: "bride" },
      { name: "C", role: "Best Man", side: "groom" },
      { name: "D", role: "Flower Girl" }, // special role (keyword), regardless of side
      { name: "E", role: "Friend of the couple", side: "other" },
    ];
    const g = partitionPartyMembers(members);
    expect(g.specialMembers.map((m) => m.name)).toEqual(["D"]);
    expect(g.bridesSide.map((m) => m.name)).toEqual(["A", "B"]);
    expect(g.groomsSide.map((m) => m.name)).toEqual(["C"]);
    expect(g.others.map((m) => m.name)).toEqual(["E"]);
    expect(g.hasSides).toBe(true);
  });

  it("reports no sides when nobody is on a bride/groom side", () => {
    const g = partitionPartyMembers([
      { name: "X", role: "Friend of the couple", side: "other" },
    ]);
    expect(g.hasSides).toBe(false);
    expect(g.others.map((m) => m.name)).toEqual(["X"]);
    expect(g.bridesSide).toHaveLength(0);
    expect(g.groomsSide).toHaveLength(0);
  });

  it("treats special-role members as special even with an explicit side", () => {
    // isSpecialRole is checked first, so 'Usher' (a special keyword) is special
    // even though it carries a groom side.
    const g = partitionPartyMembers([{ name: "U", role: "Usher", side: "groom" }]);
    expect(g.specialMembers.map((m) => m.name)).toEqual(["U"]);
    expect(g.groomsSide).toHaveLength(0);
  });
});
