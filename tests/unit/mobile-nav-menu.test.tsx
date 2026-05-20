import { afterEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MobileNavMenu } from "@/components/templates/shared/MobileNavMenu";

const items = [
  { id: "details", label: "Details", href: "#details" },
  { id: "rsvp", label: "RSVP", href: "/e/demo/rsvp", isCta: true },
];

function renderMenu() {
  return render(
    <MobileNavMenu
      brand="Demo"
      items={items}
      buttonStyle={{ width: 40, height: 40 }}
    />,
  );
}

afterEach(() => {
  document.body.style.overflow = "";
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
