"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CopyAddressButtonProps = {
  address: string;
  className?: string;
  /** Style override for the brief "Copied!" confirmation label. */
  copiedLabel?: string;
  /** Label rendered before the address is copied. Default: "Copy address". */
  label?: string;
};

const COPIED_RESET_MS = 2_000;

/**
 * Copies the formatted address to the user's clipboard and flashes a
 * "Copied!" confirmation. Intentionally not bound to a specific visual
 * style — caller supplies `className` so each template's chrome stays
 * consistent (Party's vibrant pill vs Conference's outlined sidebar
 * button, etc.).
 */
export function CopyAddressButton({
  address,
  className,
  copiedLabel = "Copied!",
  label = "Copy address",
}: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Clipboard API can fail when the page lacks user gesture (rare on a
      // button click) or in older browsers. Swallow — the address is still
      // selectable in the DOM as a fallback.
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-live="polite"
      className={cn("inline-flex items-center gap-2", className)}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
