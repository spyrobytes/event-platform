import { afterEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
