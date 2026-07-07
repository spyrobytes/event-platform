import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

function Dialog({
  active = true,
  withDisabled = false,
}: {
  active?: boolean;
  withDisabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <div ref={ref} tabIndex={-1} data-testid="dialog">
      <button data-testid="first">first</button>
      {withDisabled && (
        <button disabled data-testid="disabled">
          disabled
        </button>
      )}
      <button data-testid="last">last</button>
    </div>
  );
}

const pressTab = (shiftKey = false) =>
  fireEvent.keyDown(document, { key: "Tab", shiftKey });

describe("useFocusTrap", () => {
  it("moves focus to the container on activation", () => {
    render(<Dialog />);
    expect(document.activeElement).toBe(screen.getByTestId("dialog"));
  });

  it("does not move focus while inactive", () => {
    render(
      <>
        <button data-testid="outside">outside</button>
        <Dialog active={false} />
      </>,
    );
    screen.getByTestId("outside").focus();
    pressTab();
    expect(document.activeElement).toBe(screen.getByTestId("outside"));
  });

  it("routes Tab from the container itself to the first focusable", () => {
    render(<Dialog />);
    pressTab();
    expect(document.activeElement).toBe(screen.getByTestId("first"));
  });

  it("routes Shift+Tab from the container itself to the last focusable", () => {
    render(<Dialog />);
    pressTab(true);
    expect(document.activeElement).toBe(screen.getByTestId("last"));
  });

  it("wraps Tab from the last focusable to the first", () => {
    render(<Dialog />);
    screen.getByTestId("last").focus();
    pressTab();
    expect(document.activeElement).toBe(screen.getByTestId("first"));
  });

  it("wraps Shift+Tab from the first focusable to the last", () => {
    render(<Dialog />);
    screen.getByTestId("first").focus();
    pressTab(true);
    expect(document.activeElement).toBe(screen.getByTestId("last"));
  });

  it("skips disabled elements at the wrap boundary", () => {
    render(<Dialog withDisabled />);
    screen.getByTestId("first").focus();
    pressTab(true);
    // Wraps to the last ENABLED element, not the disabled one.
    expect(document.activeElement).toBe(screen.getByTestId("last"));
  });

  it("routes focus back into the trap when it escaped the dialog", () => {
    render(
      <>
        <button data-testid="outside">outside</button>
        <Dialog />
      </>,
    );
    screen.getByTestId("outside").focus();
    pressTab();
    expect(document.activeElement).toBe(screen.getByTestId("first"));
  });

  it("restores focus to the previously-focused element on deactivation", () => {
    function Harness({ active }: { active: boolean }) {
      return (
        <>
          <button data-testid="opener">opener</button>
          <Dialog active={active} />
        </>
      );
    }
    const { rerender } = render(<Harness active={false} />);
    screen.getByTestId("opener").focus();

    rerender(<Harness active={true} />);
    expect(document.activeElement).toBe(screen.getByTestId("dialog"));

    rerender(<Harness active={false} />);
    expect(document.activeElement).toBe(screen.getByTestId("opener"));
  });

  it("ignores non-Tab keys", () => {
    render(<Dialog />);
    screen.getByTestId("first").focus();
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByTestId("first"));
  });
});
