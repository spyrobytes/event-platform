import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

afterEach(() => {
  document.body.style.overflow = "";
});

describe("useBodyScrollLock", () => {
  it("locks body scroll while active and restores on unmount", () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("does nothing while inactive", () => {
    document.body.style.overflow = "auto";
    renderHook(() => useBodyScrollLock(false));
    expect(document.body.style.overflow).toBe("auto");
  });

  it("locks when active flips true and unlocks when it flips back", () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useBodyScrollLock(active),
      { initialProps: { active: false } },
    );
    expect(document.body.style.overflow).toBe("");
    rerender({ active: true });
    expect(document.body.style.overflow).toBe("hidden");
    rerender({ active: false });
    expect(document.body.style.overflow).toBe("");
  });

  it("restores the PRIOR overflow value, not a hardcoded default", () => {
    document.body.style.overflow = "clip";
    const { unmount } = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("clip");
  });

  it("keeps an outer lock intact when a stacked inner lock releases first", () => {
    // Outer surface (e.g. a modal) locks, then a lightbox stacks on top.
    const outer = renderHook(() => useBodyScrollLock(true));
    const inner = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");

    // Inner closes first: the page must stay locked for the outer surface.
    inner.unmount();
    expect(document.body.style.overflow).toBe("hidden");

    outer.unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
