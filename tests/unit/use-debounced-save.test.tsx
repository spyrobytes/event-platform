import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

describe("useDebouncedSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts idle and does not save the initial value", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(({ v }) => useDebouncedSave(v, save, { delay: 100 }), {
      initialProps: { v: "a" },
    });
    expect(result.current.status).toBe("idle");
    expect(save).not.toHaveBeenCalled();
  });

  it("debounces saves until after delay", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedSave(v, save, { delay: 100, savedLingerMs: 1000 }),
      { initialProps: { v: "a" } }
    );
    rerender({ v: "ab" });
    rerender({ v: "abc" });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("abc");
    expect(result.current.status).toBe("saved");
  });

  it("reverts to idle after the saved linger window", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedSave(v, save, { delay: 50, savedLingerMs: 500 }),
      { initialProps: { v: "a" } }
    );
    rerender({ v: "b" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(result.current.status).toBe("saved");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.status).toBe("idle");
  });

  it("moves to error state and exposes retry()", async () => {
    const err = new Error("boom");
    const save = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce(undefined);

    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedSave(v, save, { delay: 50 }),
      { initialProps: { v: "a" } }
    );
    rerender({ v: "b" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(err);

    await act(async () => {
      result.current.retry();
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("saved");
    expect(result.current.error).toBeNull();
  });

  it("skips save when value equals last successfully saved value", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ v }) => useDebouncedSave(v, save, { delay: 50 }),
      { initialProps: { v: "a" } }
    );
    rerender({ v: "b" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(save).toHaveBeenCalledTimes(1);

    // Bounce back to same value as last-saved — should not re-fire.
    rerender({ v: "b" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending save when the value changes again", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ v }) => useDebouncedSave(v, save, { delay: 100 }),
      { initialProps: { v: "a" } }
    );
    rerender({ v: "b" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    rerender({ v: "c" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("c");
  });
});
