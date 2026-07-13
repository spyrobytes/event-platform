import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import WishesModerationPage from "@/app/(auth)/dashboard/events/[id]/wishes/page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "evt-1" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// The auth context object must be render-stable (as the real provider's is):
// the page's effects depend on getIdToken, and a new identity per render
// would re-run them against already-consumed mock Responses.
const { stableAuth } = vi.hoisted(() => ({
  stableAuth: { getIdToken: async () => "test-token" },
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuthContext: () => stableAuth,
}));

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const EMPTY_WISHES = {
  data: {
    counts: { pending: 0, approved: 0, hidden: 0 },
    messages: [],
    nextCursor: null,
  },
};

const EMPTY_MANUAL = { data: { total: 0, wishes: [], nextCursor: null } };

describe("WishesModerationPage load race", () => {
  let resolveEvent: (r: Response) => void;

  beforeEach(() => {
    const eventResponse = new Promise<Response>((resolve) => {
      resolveEvent = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        // The lists answer immediately; the event fetch stays in flight
        // until the test releases it — the ordering that caused the flash.
        if (url.includes("/wishes/manual")) return jsonResponse(EMPTY_MANUAL);
        if (url.includes("/wishes")) return jsonResponse(EMPTY_WISHES);
        return eventResponse;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the spinner (no 'Event not found' flash) while only the event fetch is pending", async () => {
    render(<WishesModerationPage />);

    // Let the wishes-list fetch complete while the event fetch hangs.
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalled();
    });
    // The regression: with `loading` cleared by the list fetch, the page
    // used to fall through to the error screen here.
    await waitFor(() => {
      expect(screen.queryByText(/event not found/i)).toBeNull();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    resolveEvent(jsonResponse({ data: { id: "evt-1", title: "Test Wedding" } }));

    await waitFor(() => {
      expect(screen.getByText("Wedding Wishes")).toBeInTheDocument();
      expect(screen.getByText(/Test Wedding/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/event not found/i)).toBeNull();
  });

  it("shows the error screen once the event fetch actually fails", async () => {
    render(<WishesModerationPage />);

    resolveEvent(new Response("nope", { status: 404 }));

    await waitFor(() => {
      expect(screen.getByText(/event not found/i)).toBeInTheDocument();
    });
  });
});
