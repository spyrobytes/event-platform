import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// Replace child components with simple harnesses so we can trigger the
// onSelected callback directly without dragging in Google Picker / OAuth.
type PickerOnSelected = (result: {
  galleryId: string;
  jobId: string;
  accepted: number;
  skipped: { id: string; name: string; reason: string }[];
}) => void;

let lastOnSelected: PickerOnSelected | null = null;

vi.mock(
  "@/components/features/PostEventGallery/GoogleDrivePickerLauncher",
  () => ({
    GoogleDrivePickerLauncher: (props: {
      onSelected: PickerOnSelected;
      busy: boolean;
    }) => {
      lastOnSelected = props.onSelected;
      return (
        <div data-testid="picker" data-busy={String(props.busy)}>
          Picker
        </div>
      );
    },
  }),
);

vi.mock(
  "@/components/features/PostEventGallery/GoogleDriveConnectButton",
  () => ({
    GoogleDriveConnectButton: () => <div>Connect</div>,
  }),
);

vi.mock(
  "@/components/features/PostEventGallery/GalleryImportProgress",
  () => ({
    GalleryImportProgress: (props: { onDismiss?: () => void }) => (
      <div data-testid="progress">
        Progress
        {props.onDismiss && (
          <button onClick={() => props.onDismiss?.()}>dismiss-progress</button>
        )}
      </div>
    ),
  }),
);

import { GoogleDriveGallerySection } from "@/components/features/PostEventGallery/GoogleDriveGallerySection";

const getIdToken = vi.fn(async () => "fake-token");

beforeEach(() => {
  getIdToken.mockClear();
  lastOnSelected = null;
  // /status returns connected so the picker mounts.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: { connected: true } }),
    })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GoogleDriveGallerySection — skipped files surface", () => {
  it("renders an inline notice when the picker callback reports skipped files", async () => {
    render(
      <GoogleDriveGallerySection
        eventId="evt_1"
        returnPath="/dashboard/events/evt_1"
        getIdToken={getIdToken}
        onGalleryChanged={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("picker")).toBeInTheDocument());
    expect(lastOnSelected).toBeTruthy();

    lastOnSelected?.({
      galleryId: "gal_1",
      jobId: "job_1",
      accepted: 2,
      skipped: [
        { id: "f1", name: "photo.heic", reason: "unsupported-mime" },
        { id: "f2", name: "scan.pdf", reason: "unsupported-mime" },
        { id: "f3", name: "huge.jpg", reason: "too-large" },
        { id: "f4", name: "extra.gif", reason: "unsupported-mime" },
      ],
    });

    await waitFor(() => screen.getByRole("status"));
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(/4 files skipped/i);
    expect(notice).toHaveTextContent(/photo\.heic/);
    expect(notice).toHaveTextContent(/scan\.pdf/);
    expect(notice).toHaveTextContent(/huge\.jpg/);
    expect(notice).toHaveTextContent(/and 1 more/);
  });

  it("Dismiss removes the notice", async () => {
    render(
      <GoogleDriveGallerySection
        eventId="evt_1"
        returnPath="/dashboard/events/evt_1"
        getIdToken={getIdToken}
        onGalleryChanged={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("picker")).toBeInTheDocument());
    lastOnSelected?.({
      galleryId: "gal_1",
      jobId: "job_1",
      accepted: 0,
      skipped: [{ id: "f1", name: "photo.heic", reason: "unsupported-mime" }],
    });
    await waitFor(() => screen.getByRole("status"));
    fireEvent.click(
      screen.getByRole("button", { name: /dismiss skipped-files notice/i }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders nothing when zero files were skipped", async () => {
    render(
      <GoogleDriveGallerySection
        eventId="evt_1"
        returnPath="/dashboard/events/evt_1"
        getIdToken={getIdToken}
        onGalleryChanged={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("picker")).toBeInTheDocument());
    lastOnSelected?.({
      galleryId: "gal_1",
      jobId: "job_1",
      accepted: 3,
      skipped: [],
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("clears activeJobId via onDismiss so the picker isn't stuck busy", async () => {
    render(
      <GoogleDriveGallerySection
        eventId="evt_1"
        returnPath="/dashboard/events/evt_1"
        getIdToken={getIdToken}
        onGalleryChanged={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("picker")).toBeInTheDocument());
    // Submit a selection → activeJobId set → picker becomes busy.
    lastOnSelected?.({
      galleryId: "gal_1",
      jobId: "job_1",
      accepted: 1,
      skipped: [],
    });
    await waitFor(() => screen.getByTestId("progress"));
    expect(screen.getByTestId("picker").getAttribute("data-busy")).toBe("true");

    // Simulate the progress component dispatching onDismiss after an error.
    fireEvent.click(screen.getByText("dismiss-progress"));

    await waitFor(() =>
      expect(screen.queryByTestId("progress")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("picker").getAttribute("data-busy")).toBe("false");
  });
});
