import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  WeddingPartyGroups,
  type WeddingPartyLayoutClasses,
} from "@/components/templates/wedding-v3/renderers/wedding-party/shared/WeddingPartyGroups";
import type { PartyMember } from "@/components/templates/wedding-v3/renderers/wedding-party/shared/party-groups";

// Identity-ish stub: each layout slot gets a distinct, present class string so a
// dropped key would surface as `undefined` in markup (none should).
const CLASSES: WeddingPartyLayoutClasses = {
  grid: "grid",
  gridSpaced: "gridSpaced",
  groupSpaced: "groupSpaced",
  specialGrid: "specialGrid",
  divider: "divider",
  dividerLine: "dividerLine",
  dividerLabel: "dividerLabel",
  empty: "empty",
};

describe("WeddingPartyGroups layout", () => {
  it("passes a continuous global index (bride → groom → others → special) to renderCard", () => {
    // Roles chosen to land in each bucket: 'Maid of Honor'/'Bridesmaid'/'Best Man'
    // are NOT special-role keywords (they group by side); 'Flower Girl' IS special.
    const members: PartyMember[] = [
      { name: "B1", role: "Maid of Honor", side: "bride" },
      { name: "B2", role: "Bridesmaid", side: "bride" },
      { name: "G1", role: "Best Man", side: "groom" },
      { name: "O1", role: "Friend of the couple", side: "other" },
      { name: "S1", role: "Flower Girl" },
    ];

    const calls: Array<{ name: string; index: number; isSpecial: boolean }> = [];
    render(
      <WeddingPartyGroups
        members={members}
        classes={CLASSES}
        emptyLabel="none"
        renderCard={(member, index, isSpecial) => {
          calls.push({ name: member.name, index, isSpecial });
          return <div data-testid="card">{member.name}</div>;
        }}
      />,
    );

    // Indices are assigned in render order and are contiguous across groups;
    // only the special bucket is flagged isSpecial.
    expect(calls).toEqual([
      { name: "B1", index: 0, isSpecial: false },
      { name: "B2", index: 1, isSpecial: false },
      { name: "G1", index: 2, isSpecial: false },
      { name: "O1", index: 3, isSpecial: false },
      { name: "S1", index: 4, isSpecial: true },
    ]);
    expect(screen.getAllByTestId("card")).toHaveLength(5);
  });

  it("renders the empty-state label and calls renderCard zero times when there are no members", () => {
    const calls: PartyMember[] = [];
    render(
      <WeddingPartyGroups
        members={[]}
        classes={CLASSES}
        emptyLabel="Wedding party portraits coming soon"
        renderCard={(member) => {
          calls.push(member);
          return <div>{member.name}</div>;
        }}
      />,
    );

    expect(calls).toHaveLength(0);
    expect(screen.getByText("Wedding party portraits coming soon")).toBeDefined();
  });
});
