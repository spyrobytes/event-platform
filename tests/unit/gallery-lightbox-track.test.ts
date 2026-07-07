import { describe, it, expect } from "vitest";
import {
  trackSlotAssignment,
  advanceCenterSlot,
} from "@/components/features/PostEventGallery/GalleryLightbox";
import { reanchorOffset } from "@/hooks/use-swipe-navigation";

const SLOTS = [0, 1, 2];

const assignmentsAt = (centerSlot: number, index: number, count: number) =>
  SLOTS.map((s) => trackSlotAssignment(s, centerSlot, index, count));

/** Walk a navigation sequence the way the component does. */
function* walk(
  count: number,
  steps: Array<"prev" | "next">,
  startIndex = 0,
) {
  let index = startIndex;
  let centerSlot = 0;
  yield { index, centerSlot, assignments: assignmentsAt(centerSlot, index, count) };
  for (const dir of steps) {
    index =
      dir === "next" ? (index + 1) % count : (index - 1 + count) % count;
    centerSlot = advanceCenterSlot(centerSlot, dir);
    yield { index, centerSlot, assignments: assignmentsAt(centerSlot, index, count) };
  }
}

const NEXT10 = Array.from({ length: 10 }, () => "next" as const);
const MIXED: Array<"prev" | "next"> = [
  "next", "next", "prev", "next", "prev", "prev", "prev", "next", "next", "next",
];

describe("trackSlotAssignment / advanceCenterSlot", () => {
  it("always covers offsets {-1, 0, +1} exactly once, across any sequence", () => {
    for (const count of [3, 4, 5, 15]) {
      for (const steps of [NEXT10, MIXED]) {
        for (const frame of walk(count, steps)) {
          const offsets = frame.assignments.map((a) => a.offset).sort((a, b) => a - b);
          expect(offsets).toEqual([-1, 0, 1]);
        }
      }
    }
  });

  it("maps every slot to items[(index + offset) mod count]", () => {
    for (const count of [2, 3, 7]) {
      for (const frame of walk(count, MIXED)) {
        for (const a of frame.assignments) {
          expect(a.itemIndex).toBe((((frame.index + a.offset) % count) + count) % count);
        }
      }
    }
  });

  it("center continuity: the slot peeking on the entered side becomes the center, keeping its item", () => {
    for (const count of [4, 5]) {
      for (const dir of ["next", "prev"] as const) {
        // Long enough to cross the album-boundary wrap in both directions —
        // the case an index-derived center slot gets wrong for count % 3 !== 0.
        const frames = [...walk(count, Array.from({ length: count + 2 }, () => dir))];
        for (let i = 1; i < frames.length; i++) {
          const before = frames[i - 1].assignments;
          const after = frames[i].assignments;
          const enteringSlot = before.findIndex(
            (a) => a.offset === (dir === "next" ? 1 : -1),
          );
          expect(after[enteringSlot].offset).toBe(0);
          expect(after[enteringSlot].itemIndex).toBe(before[enteringSlot].itemIndex);
        }
      }
    }
  });

  it("each step changes exactly one slot's item (only the new far side loads), for count >= 4", () => {
    for (const count of [4, 5, 15]) {
      for (const steps of [NEXT10, MIXED]) {
        const frames = [...walk(count, steps)];
        for (let i = 1; i < frames.length; i++) {
          const changed = SLOTS.filter(
            (s) =>
              frames[i - 1].assignments[s].itemIndex !==
              frames[i].assignments[s].itemIndex,
          );
          expect(changed).toHaveLength(1);
          // ...and the slot that changed is the new FAR side (off-screen),
          // never the center.
          expect(frames[i].assignments[changed[0]].offset).not.toBe(0);
        }
      }
    }
  });

  it("2-item gallery: both side slots always show the other photo", () => {
    for (const frame of walk(2, MIXED)) {
      const sides = frame.assignments.filter((a) => a.offset !== 0);
      expect(sides).toHaveLength(2);
      for (const side of sides) {
        expect(side.itemIndex).toBe((frame.index + 1) % 2);
      }
    }
  });

  it("wraps around album boundaries", () => {
    const count = 4;
    const atLast = assignmentsAt(0, count - 1, count);
    expect(atLast.find((a) => a.offset === 1)?.itemIndex).toBe(0);
    const atFirst = assignmentsAt(0, 0, count);
    expect(atFirst.find((a) => a.offset === -1)?.itemIndex).toBe(count - 1);
  });

  it("advanceCenterSlot: prev and next are inverse rotations", () => {
    for (const slot of SLOTS) {
      expect(advanceCenterSlot(advanceCenterSlot(slot, "next"), "prev")).toBe(slot);
      expect(advanceCenterSlot(slot, "next")).not.toBe(slot);
    }
  });
});

describe("reanchorOffset", () => {
  it("a next-commit re-anchors right of center by the un-dragged remainder", () => {
    // Drag left 30% of an 800px stage, commit next: after rotation the
    // incoming slide sits 70% right of center — the spring finishes the run.
    expect(reanchorOffset(-240, 800, "next")).toBe(560);
  });

  it("a prev-commit mirrors the sign", () => {
    expect(reanchorOffset(240, 800, "prev")).toBe(-560);
  });

  it("arrow/keyboard navigation (no drag) re-anchors a full step out", () => {
    expect(reanchorOffset(0, 800, "next")).toBe(800);
    expect(reanchorOffset(0, 800, "prev")).toBe(-800);
  });

  it("a flick committed against the drag direction still re-anchors on the thrown side", () => {
    // Finger drifted +12px but the velocity said "next": the rotation is
    // toward next, so the re-anchor must be on the right regardless of dx.
    expect(reanchorOffset(12, 800, "next")).toBe(812);
  });
});
