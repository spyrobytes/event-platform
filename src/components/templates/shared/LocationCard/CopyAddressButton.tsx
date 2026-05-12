"use client";

import { useClipboardCopy } from "@/hooks/use-clipboard-copy";
import { cn } from "@/lib/utils";

type CopyAddressButtonProps = {
  address: string;
  className?: string;
  /** Style override for the brief "Copied!" confirmation label. */
  copiedLabel?: string;
  /** Label rendered before the address is copied. Default: "Copy address". */
  label?: string;
};

/**
 * Copies the formatted address to the user's clipboard and flashes a
 * "Copied!" confirmation. Caller supplies `className` so each template's
 * chrome stays consistent (Party's vibrant pill vs Conference's outlined
 * sidebar button, etc.).
 */
export function CopyAddressButton({
  address,
  className,
  copiedLabel = "Copied!",
  label = "Copy address",
}: CopyAddressButtonProps) {
  const { copy, copied } = useClipboardCopy();

  return (
    <button
      type="button"
      onClick={() => void copy(address)}
      aria-live="polite"
      className={cn("inline-flex items-center gap-2", className)}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
