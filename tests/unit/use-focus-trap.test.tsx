import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

function Dialog({
  active = true,
  withDisabled = false,
  prefix = "",
}: {
  active?: boolean;
  withDisabled?: boolean;
  prefix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  const id = (name: string) => `${prefix}${name}`;
  return (
    <div ref={ref} tabIndex={-1} data-testid={id("dialog")}>
      {/* Disabled elements sit at the DOM boundaries so the wrap tests can
          only pass if the trap's disabled filter excludes them. */}
      {withDisabled && (
        <button disabled data-testid={id("disabled-leading")}>
          disabled
        </button>
      )}
      <button data-testid={id("first")}>first</button>
      <button data-testid={id("last")}>last</button>
      {withDisabled && (
        <button disabled data-testid={id("disabled-trailing")}>
          disabled
        </button>
      )}
    </div>
  );
}

/** Dialog whose subtree can unmount (render null) while the hook stays active. */
function NullableDialog({ renderBody }: { renderBody: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);
  if (!renderBody) return null;
  return (
    <div ref={ref} tabIndex={-1} data-testid="dialog">
      <button data-testid="first">first</button>
      <button data-testid="last">last</button>
    </div>
  );
}

// fireEvent returns false when a handler called preventDefault.
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

  it("skips a disabled element at the trailing boundary when wrapping forward", () => {
    render(<Dialog withDisabled />);
    // "last" is the last ENABLED focusable; without the disabled filter the
    // trap would treat disabled-trailing as the boundary and never wrap here.
    screen.getByTestId("last").focus();
    pressTab();
    expect(document.activeElement).toBe(screen.getByTestId("first"));
  });

  it("skips a disabled element at the leading boundary when wrapping backward", () => {
    render(<Dialog withDisabled />);
    screen.getByTestId("first").focus();
    pressTab(true);
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

  it("stops trapping (does not swallow Tab page-wide) when the dialog subtree unmounts while active", () => {
    function Harness({ renderBody }: { renderBody: boolean }) {
      return (
        <>
          <button data-testid="outside">outside</button>
          <NullableDialog renderBody={renderBody} />
        </>
      );
    }
    const { rerender } = render(<Harness renderBody={true} />);
    rerender(<Harness renderBody={false} />);

    screen.getByTestId("outside").focus();
    // Not cancelled (no preventDefault) and focus not yanked to a detached node.
    expect(pressTab()).toBe(true);
    expect(document.activeElement).toBe(screen.getByTestId("outside"));
  });

  it("arms the trap when the dialog subtree mounts after activation", () => {
    function Harness({ renderBody }: { renderBody: boolean }) {
      return (
        <>
          <button data-testid="outside">outside</button>
          <NullableDialog renderBody={renderBody} />
        </>
      );
    }
    const { rerender } = render(<Harness renderBody={false} />);
    rerender(<Harness renderBody={true} />);

    screen.getByTestId("outside").focus();
    pressTab();
    expect(document.activeElement).toBe(screen.getByTestId("first"));
  });

  it("gives escaped focus to the most recently activated trap when two are active", () => {
    render(
      <>
        <button data-testid="outside">outside</button>
        <Dialog prefix="a-" />
        <Dialog prefix="b-" />
      </>,
    );
    screen.getByTestId("outside").focus();
    pressTab();
    expect(document.activeElement).toBe(screen.getByTestId("b-first"));
  });

  it("pulls focus out of a background trap into the top-most one", () => {
    render(
      <>
        <Dialog prefix="a-" />
        <Dialog prefix="b-" />
      </>,
    );
    // Focus stranded in the background dialog: the top-most modal owns Tab.
    screen.getByTestId("a-first").focus();
    pressTab();
    expect(document.activeElement).toBe(screen.getByTestId("b-first"));
  });
});
