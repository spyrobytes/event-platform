import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

import { MarkOpenedBeacon } from "@/components/features/Analytics/MarkOpenedBeacon";

// The PR's whole premise: JS executes -> the beacon POSTs (so a real view
// marks OPENED); HTML-only crawlers don't run this, so they can't. These tests
// verify the JS-fires half (the route handler is covered separately).
const fetchMock = vi.fn(
  async (_input: string, _init?: RequestInit) => ({ ok: true, status: 204 }),
);

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MarkOpenedBeacon", () => {
  it("POSTs the token to /api/invites/opened once on mount", async () => {
    render(<MarkOpenedBeacon token="raw-token-123" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/invites/opened");
    expect(opts?.method).toBe("POST");
    expect(JSON.parse(opts?.body as string)).toEqual({ token: "raw-token-123" });
  });

  it("does not fire again on re-render (the fired ref dedupes)", async () => {
    const { rerender } = render(<MarkOpenedBeacon token="raw-token-123" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(<MarkOpenedBeacon token="raw-token-123" />);
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders nothing", () => {
    const { container } = render(<MarkOpenedBeacon token="t" />);
    expect(container.firstChild).toBeNull();
  });
});
