import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LazyMap } from "@/components/templates/shared/LocationCard/LazyMap";
import { CopyAddressButton } from "@/components/templates/shared/LocationCard/CopyAddressButton";
import { LocationNotes } from "@/components/templates/shared/LocationCard/LocationNotes";
import type { MapSection } from "@/schemas/event-page";

// useIntersectionObserver depends on the browser's IntersectionObserver,
// which jsdom doesn't ship. The hook in the codebase already guards via
// element-ref attachment, but we still need a stub so the constructor exists.
let observerInstances: Array<{ trigger: (intersecting: boolean) => void }> = [];
beforeEach(() => {
  observerInstances = [];
  class StubIntersectionObserver {
    private callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      observerInstances.push({
        trigger: (intersecting) => {
          this.callback(
            [{ isIntersecting: intersecting, intersectionRatio: intersecting ? 1 : 0 } as IntersectionObserverEntry],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this as any
          );
        },
      });
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IntersectionObserver = StubIntersectionObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LazyMap", () => {
  it("returns null when coordinates are absent", () => {
    const { container } = render(<LazyMap data={{ formattedAddress: "X" }} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a placeholder (not the iframe) before the observer fires", () => {
    const { container } = render(
      <LazyMap data={{ latitude: 0, longitude: 0 }} />
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("mounts the iframe once the observer reports intersection", () => {
    const { container } = render(
      <LazyMap data={{ latitude: 43.65, longitude: -79.38 }} />
    );
    expect(container.querySelector("iframe")).toBeNull();
    act(() => {
      observerInstances.forEach((o) => o.trigger(true));
    });
    const iframe = container.querySelector("iframe") as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe!.src).toMatch(/openstreetmap\.org\/export\/embed/);
  });
});

describe("CopyAddressButton", () => {
  beforeEach(() => {
    // jsdom's navigator.clipboard isn't installed by default.
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(async () => undefined) },
    });
  });

  it("renders the default label", () => {
    render(<CopyAddressButton address="100 King St W" />);
    expect(screen.getByRole("button")).toHaveTextContent("Copy address");
  });

  it("writes the address to the clipboard on click", async () => {
    render(<CopyAddressButton address="100 King St W" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("100 King St W");
  });

  it("flashes the copied label after a successful write", async () => {
    render(<CopyAddressButton address="100 King St W" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Copied!");
    });
  });
});

describe("LocationNotes", () => {
  const baseData = {
    heading: "Location",
    zoom: 15,
    showDirectionsLink: true,
  } as MapSection["data"];

  it("renders nothing when all notes are absent or empty", () => {
    const { container } = render(<LocationNotes data={baseData} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when notes are present but only whitespace", () => {
    const { container } = render(
      <LocationNotes
        data={{ ...baseData, parkingNote: "   ", entranceNote: "" }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders only the notes that are populated", () => {
    render(
      <LocationNotes
        data={{ ...baseData, parkingNote: "Valet at the main entrance.", accessibilityNote: "Step-free." }}
      />
    );
    expect(screen.getByText("Parking")).toBeInTheDocument();
    expect(screen.getByText("Valet at the main entrance.")).toBeInTheDocument();
    expect(screen.getByText("Accessibility")).toBeInTheDocument();
    expect(screen.getByText("Step-free.")).toBeInTheDocument();
    expect(screen.queryByText("Entrance")).toBeNull();
  });
});
