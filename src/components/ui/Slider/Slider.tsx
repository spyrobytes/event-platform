import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Range slider primitive. Wraps a native `<input type="range">` with the
 * project's focus/disabled styling. Consumers handle value display alongside.
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="range"
        ref={ref}
        className={cn(
          "h-2 w-full cursor-pointer accent-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

Slider.displayName = "Slider";
