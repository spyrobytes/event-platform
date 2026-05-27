import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GalleryImportProgress } from "@/components/features/PostEventGallery/GalleryImportProgress";

const getIdToken = vi.fn(async () => "fake-token");

beforeEach(() => {
  getIdToken.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GalleryImportProgress — polling error recovery", () => {
  it("shows Retry + Dismiss buttons after a polling failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <GalleryImportProgress
        eventId="evt_1"
        jobId="job_1"
        getIdToken={getIdToken}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it("Retry kicks off a fresh poll cycle and renders progress on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "job_1",
            status: "PROCESSING",
            totalItems: 5,
            processedItems: 2,
            failedItems: 0,
            skippedItems: 0,
            pendingItems: 3,
            errorCode: null,
            errorMessage: null,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <GalleryImportProgress
        eventId="evt_1"
        jobId="job_1"
        getIdToken={getIdToken}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    });

    await waitFor(() =>
      expect(screen.getByText(/importing/i)).toBeInTheDocument(),
    );
    // Progress count visible after the second (successful) poll.
    expect(screen.getByText(/2 of 5/i)).toBeInTheDocument();
  });

  it("Dismiss invokes onDismiss so the parent can clear activeJobId", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const onDismiss = vi.fn();
    render(
      <GalleryImportProgress
        eventId="evt_1"
        jobId="job_1"
        getIdToken={getIdToken}
        onDismiss={onDismiss}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
