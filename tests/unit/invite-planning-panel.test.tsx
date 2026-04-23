import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  InvitePlanningPanel,
  type PanelInvite,
} from "@/components/features/InviteManager/InvitePlanningPanel";

// jsdom does not implement HTMLDialogElement.showModal/close. Stub minimally.
beforeEach(() => {
  if (typeof HTMLDialogElement !== "undefined") {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

const baseInvite: PanelInvite = {
  id: "invite-1",
  name: "Jamie Doe",
  email: "jamie@example.com",
  phone: null,
  status: "SENT",
  plusOnesAllowed: 2,
  seatAssignment: null,
  plannerNotes: null,
  rsvp: { response: "YES", guestName: "Jamie Doe", guestCount: 3 },
};

describe("InvitePlanningPanel", () => {
  it("renders guest name, RSVP badge, and party label", () => {
    render(
      <InvitePlanningPanel
        open
        invite={baseInvite}
        token="raw-token-xyz"
        onClose={() => {}}
        onSavePlanning={async () => {}}
      />
    );

    expect(screen.getByRole("heading", { name: "Jamie Doe" })).toBeInTheDocument();
    expect(screen.getByText("Attending")).toBeInTheDocument();
    expect(screen.getByText("Party of 3")).toBeInTheDocument();
  });

  it("shows 'RSVP pending' when no RSVP row exists, and plus-ones cap as party label", () => {
    render(
      <InvitePlanningPanel
        open
        invite={{ ...baseInvite, rsvp: null }}
        token="raw-token-xyz"
        onClose={() => {}}
        onSavePlanning={async () => {}}
      />
    );
    expect(screen.getByText("RSVP pending")).toBeInTheDocument();
    expect(screen.getByText("Up to 3 guests")).toBeInTheDocument();
  });

  it("renders empty state when invite is null", () => {
    render(
      <InvitePlanningPanel
        open
        invite={null}
        token={null}
        onClose={() => {}}
        onSavePlanning={async () => {}}
      />
    );
    expect(screen.getByRole("heading", { name: "Invite not found" })).toBeInTheDocument();
  });

  it("enforces 500-char cap on the seat input (hard limit)", () => {
    render(
      <InvitePlanningPanel
        open
        invite={baseInvite}
        token="raw-token-xyz"
        onClose={() => {}}
        onSavePlanning={async () => {}}
      />
    );
    const input = screen.getByLabelText("Seat assignment") as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: "a".repeat(600) } });
    });
    expect(input.value.length).toBe(500);
  });

  it("does NOT auto-save when the user has not edited anything (regression: snapshot identity)", async () => {
    vi.useFakeTimers();
    const onSavePlanning = vi.fn().mockResolvedValue(undefined);
    render(
      <InvitePlanningPanel
        open
        invite={baseInvite}
        token="raw-token-xyz"
        onClose={() => {}}
        onSavePlanning={onSavePlanning}
      />
    );
    // Sit idle across many debounce windows; an unstable snapshot reference
    // would cause a save-loop at 500ms rate.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(onSavePlanning).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("auto-saves planning fields with debounce and shows status transitions", async () => {
    vi.useFakeTimers();
    const onSavePlanning = vi.fn().mockResolvedValue(undefined);
    render(
      <InvitePlanningPanel
        open
        invite={baseInvite}
        token="raw-token-xyz"
        onClose={() => {}}
        onSavePlanning={onSavePlanning}
      />
    );
    const seat = screen.getByLabelText("Seat assignment") as HTMLInputElement;

    act(() => {
      fireEvent.change(seat, { target: { value: "Table 4, Seat 2" } });
    });
    expect(onSavePlanning).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(onSavePlanning).toHaveBeenCalledTimes(1);
    expect(onSavePlanning).toHaveBeenCalledWith({
      seatAssignment: "Table 4, Seat 2",
      plannerNotes: null,
    });
    expect(screen.getByText("Saved ✓")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("shows 'Save failed — retry' on error and re-fires on click", async () => {
    vi.useFakeTimers();
    const err = new Error("network");
    const onSavePlanning = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce(undefined);

    render(
      <InvitePlanningPanel
        open
        invite={baseInvite}
        token="raw-token-xyz"
        onClose={() => {}}
        onSavePlanning={onSavePlanning}
      />
    );
    const seat = screen.getByLabelText("Seat assignment") as HTMLInputElement;

    act(() => {
      fireEvent.change(seat, { target: { value: "A5" } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(screen.getByText("Save failed")).toBeInTheDocument();
    const retry = screen.getByText("Save failed — retry");
    await act(async () => {
      fireEvent.click(retry);
    });
    expect(onSavePlanning).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("Copy invite link writes the canonical /invite/[token] URL to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <InvitePlanningPanel
        open
        invite={baseInvite}
        token="raw-token-xyz"
        onClose={() => {}}
        onSavePlanning={async () => {}}
      />
    );
    const btn = screen.getByRole("button", { name: "Copy invite link" });
    await act(async () => {
      fireEvent.click(btn);
    });
    const copiedUrl = writeText.mock.calls[0][0];
    expect(copiedUrl.endsWith("/invite/raw-token-xyz")).toBe(true);
    expect(screen.getByText("Copied ✓")).toBeInTheDocument();
  });

  it("hides the Copy invite link button when no token is cached and points to Regenerate", () => {
    render(
      <InvitePlanningPanel
        open
        invite={baseInvite}
        token={null}
        onClose={() => {}}
        onSavePlanning={async () => {}}
        onRegenerate={async () => {}}
      />
    );
    expect(screen.queryByRole("button", { name: "Copy invite link" })).toBeNull();
    expect(
      screen.getByText(/isn't stored server-side/i)
    ).toBeInTheDocument();
  });

  it("surfaces the regenerate counter and disables at the limit", () => {
    const atLimit = { ...baseInvite, tokenRegenerateCount: 3 };
    const { rerender } = render(
      <InvitePlanningPanel
        open
        invite={{ ...baseInvite, tokenRegenerateCount: 1 }}
        token={null}
        onClose={() => {}}
        onSavePlanning={async () => {}}
        onRegenerate={async () => {}}
      />
    );
    // 3 - 1 = 2 remaining
    expect(
      screen.getByRole("button", { name: "Regenerate invite link (2 left)" })
    ).toBeInTheDocument();

    rerender(
      <InvitePlanningPanel
        open
        invite={atLimit}
        token={null}
        onClose={() => {}}
        onSavePlanning={async () => {}}
        onRegenerate={async () => {}}
      />
    );
    const btn = screen.getByRole("button", { name: "Limit reached" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <InvitePlanningPanel
        open
        invite={baseInvite}
        token="raw-token-xyz"
        onClose={onClose}
        onSavePlanning={async () => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
