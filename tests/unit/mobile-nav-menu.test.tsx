import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MobileNavMenu } from "@/components/templates/shared/MobileNavMenu";

const items = [
  { id: "details", label: "Details", href: "#details" },
  { id: "rsvp", label: "RSVP", href: "/e/demo/rsvp", isCta: true },
];

function renderMenu(
  expression?: React.ComponentProps<typeof MobileNavMenu>["expression"],
) {
  return render(
    <MobileNavMenu
      brand="Demo"
      items={items}
      buttonStyle={{ width: 40, height: 40 }}
      expression={expression}
    />,
  );
}

/** The portal root that hosts the backdrop + panel for the open menu. */
function portalRoot() {
  return screen.getByLabelText("Mobile navigation").parentElement!;
}

/** Opens the menu and returns the host-positioned trigger wrapper,
 *  captured BEFORE opening — once open, the trigger and the panel's
 *  close button share an accessible name, and a hidden trigger drops
 *  out of the a11y tree entirely. */
function openMenu() {
  const trigger = screen.getByRole("button", { name: /open menu/i });
  const wrapper = trigger.parentElement!;
  fireEvent.click(trigger);
  return wrapper;
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("MobileNavMenu expression traits", () => {
  it("drawer paints a click-to-close backdrop and keeps the trigger visible", () => {
    renderMenu("drawer");
    const wrapper = openMenu();

    expect(portalRoot().querySelector(':scope > div[aria-hidden]')).not.toBeNull();
    expect(wrapper.style.visibility).not.toBe("hidden");
  });

  it("veil skips the backdrop and hides the host-positioned trigger", () => {
    renderMenu("veil");
    const wrapper = openMenu();

    expect(portalRoot().querySelector(':scope > div[aria-hidden]')).toBeNull();
    expect(wrapper.style.visibility).toBe("hidden");
    expect(wrapper.style.pointerEvents).toBe("none");
  });

  it("sheet paints the backdrop AND hides the trigger (the card covers it)", () => {
    renderMenu("sheet");
    const wrapper = openMenu();

    expect(portalRoot().querySelector(':scope > div[aria-hidden]')).not.toBeNull();
    expect(wrapper.style.visibility).toBe("hidden");
    expect(wrapper.style.pointerEvents).toBe("none");
  });

  it("stamps the expression on the portal root for the CSS module", () => {
    renderMenu("sheet");
    openMenu();

    expect(portalRoot().getAttribute("data-expression")).toBe("sheet");
  });
});

describe("MobileNavMenu BFCache cleanup", () => {
  it("unmounts the portaled drawer synchronously when a drawer link is clicked", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByLabelText("Mobile navigation")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("link", { name: "RSVP" }));

    expect(screen.queryByLabelText("Mobile navigation")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("unmounts the drawer before the pagehide BFCache snapshot", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByLabelText("Mobile navigation")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(screen.queryByLabelText("Mobile navigation")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("clears an open drawer state when restored from BFCache", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByLabelText("Mobile navigation")).toBeInTheDocument();

    const event = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(event, "persisted", { value: true });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(screen.queryByLabelText("Mobile navigation")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("MobileNavMenu veil fold-out exit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** The panel's own ✕ — scoped within the dialog so it never collides
   *  with the (hidden) trigger, which shares the "Close menu" name once open. */
  function panelCloseButton() {
    return within(screen.getByLabelText("Mobile navigation")).getByRole(
      "button",
      { name: /close menu/i },
    );
  }

  it("keeps the veil mounted during the closing phase, then unmounts after exitMs", () => {
    vi.useFakeTimers();
    renderMenu("veil");
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(portalRoot().getAttribute("data-state")).toBe("open");

    fireEvent.click(panelCloseButton());

    // Still mounted, now folding out — the exit keyframes get their frames.
    expect(screen.getByLabelText("Mobile navigation")).toBeInTheDocument();
    expect(portalRoot().getAttribute("data-state")).toBe("closing");

    // Reverse cascade: the last element to arrive (the bottom RSVP cta) is the
    // first to leave (delay 0), the top item leaves last (one stagger step).
    expect(screen.getByRole("link", { name: "RSVP" }).style.animationDelay).toBe(
      "0ms",
    );
    expect(
      screen.getByRole("link", { name: "Details" }).style.animationDelay,
    ).toBe("45ms");

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.queryByLabelText("Mobile navigation")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("does NOT animate navigation closes — a veil link tap unmounts synchronously", () => {
    vi.useFakeTimers();
    renderMenu("veil");
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByLabelText("Mobile navigation")).toBeInTheDocument();

    // No timer advance: the BFCache path must tear down in the same tick,
    // never via the closing phase.
    fireEvent.click(screen.getByRole("link", { name: "RSVP" }));

    expect(screen.queryByLabelText("Mobile navigation")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("skips the closing phase under prefers-reduced-motion (instant unmount)", () => {
    const original = window.matchMedia;
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    try {
      renderMenu("veil");
      fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
      expect(screen.getByLabelText("Mobile navigation")).toBeInTheDocument();

      // No closing phase, no timer — gone immediately.
      fireEvent.click(panelCloseButton());

      expect(
        screen.queryByLabelText("Mobile navigation"),
      ).not.toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it("compresses the reverse cascade for long menus so it stays within the dissolve window", () => {
    const many = Array.from({ length: 7 }, (_, i) => ({
      id: `s${i}`,
      label: `Section ${i}`,
      href: `#s${i}`,
    }));
    render(<MobileNavMenu brand="Demo" items={many} expression="veil" />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    fireEvent.click(panelCloseButton());

    // 7 items, no --motion-stagger in this bare render → fallback 45ms base, but
    // the count-aware cap 240/(7-1)=40ms engages (40 < 45). Top item leaves last
    // at 6*40=240ms (the window cap), bottom leaves first at 0ms — so the whole
    // cascade fits the panel's dissolve regardless of count.
    const delays = screen
      .getAllByRole("link")
      .map((l) => parseFloat(l.style.animationDelay));
    expect(Math.max(...delays)).toBe(240);
    expect(Math.min(...delays)).toBe(0);
  });

  it("injects --mnm-veil-exit-dur so the CSS fade and the unmount timer share one duration", () => {
    renderMenu("veil");
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    // The CSS mnmVeilOut reads this; exitMs is derived from the same constant,
    // so a retune can't desync the JS unmount from the CSS fade.
    expect(
      portalRoot().style.getPropertyValue("--mnm-veil-exit-dur"),
    ).toBe("600ms");
  });
});
