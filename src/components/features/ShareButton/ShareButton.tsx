"use client";

import { useState } from "react";
import styles from "./ShareButton.module.css";

type ShareButtonProps = {
  /** Title sent to navigator.share() — typically the event title. */
  title: string;
  /** Descriptive text for the OS share sheet. Optional but improves the
   *  preview on iOS/Android (shown beneath the title). */
  text?: string;
  /** Canonical URL to share. Always pass an explicit string — never derive
   *  from window.location.href, which can include ?tk= guest tokens that
   *  must not be broadcast. */
  url: string;
  /** Optional class merged onto the host button. Lets each template skin
   *  the icon button to match its own chrome (size, border, hover). */
  className?: string;
  /** Accessible label. Falls back to "Share this page" when omitted. */
  ariaLabel?: string;
};

/**
 * One-button share affordance. Tries navigator.share() first (opens the OS
 * share sheet — WhatsApp, iMessage, AirDrop, X, LinkedIn, etc.); falls
 * back to clipboard copy with a transient "Copied!" check icon.
 *
 * The component is chrome-light: it accepts a className so each template
 * can match the surrounding button shape, rather than imposing its own.
 *
 * Callers are responsible for visibility gating (e.g. only render for
 * PUBLIC events). UNLISTED events should not advertise share affordances.
 */
export function ShareButton({
  title,
  text,
  url,
  className,
  ariaLabel = "Share this page",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // AbortError = user dismissed the sheet; treat as success (no toast).
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Any other failure falls through to the clipboard path.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Final silent fallback. Clipboard requires a secure context + user
      // gesture; both hold for a click handler over HTTPS, so this is rare
      // (e.g. permissions policy explicitly blocks the API).
    }
  };

  const label = copied ? "Link copied" : ariaLabel;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[styles.button, className].filter(Boolean).join(" ")}
      title={label}
      aria-label={label}
      aria-live="polite"
    >
      {copied ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          width={18}
          height={18}
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          width={18}
          height={18}
          aria-hidden="true"
        >
          {/* iOS-style share glyph: arrow up out of a tray. */}
          <path d="M12 16V4" />
          <polyline points="7 9 12 4 17 9" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
      )}
    </button>
  );
}
