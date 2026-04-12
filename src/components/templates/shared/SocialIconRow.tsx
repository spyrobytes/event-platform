"use client";

import type { CSSProperties } from "react";
import {
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Music2,
  Globe,
  type LucideIcon,
} from "lucide-react";
import type { SocialLink, SocialPlatform } from "@/schemas/event-page";

const PLATFORM_ICONS: Record<SocialPlatform, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  x: Twitter,
  pinterest: Globe,
  website: Globe,
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X (Twitter)",
  pinterest: "Pinterest",
  website: "Website",
};

export type SocialIconRowProps = {
  links?: SocialLink[];
  /** Icon size in pixels. Default 20. */
  size?: number;
  /** Gap between icons in pixels. Default 16. */
  gap?: number;
  /** Inline style overrides applied to the outer nav element */
  style?: CSSProperties;
  /** Optional className applied to the outer nav element */
  className?: string;
  /** Base color — defaults to --text-2 */
  color?: string;
  /** Hover color — defaults to --accent */
  hoverColor?: string;
};

/**
 * Renders a row of social media icon links for use inside footers.
 *
 * Inherits footer theme tokens via CSS variables; no hardcoded colors.
 * Returns null when `links` is empty so callers can unconditionally render it.
 */
export function SocialIconRow({
  links,
  size = 20,
  gap = 16,
  style,
  className,
  color = "var(--text-2, #786f65)",
  hoverColor = "var(--accent, #7a8c72)",
}: SocialIconRowProps) {
  if (!links || links.length === 0) return null;

  return (
    <nav
      aria-label="Social media links"
      className={className}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap,
        flexWrap: "wrap",
        ...style,
      }}
    >
      {links.map((link, i) => {
        const Icon = PLATFORM_ICONS[link.platform];
        const label = link.label || PLATFORM_LABELS[link.platform];
        return (
          <a
            key={`${link.platform}-${i}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: size + 16,
              height: size + 16,
              borderRadius: "50%",
              color,
              textDecoration: "none",
              transition: "color 0.2s ease, background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = hoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = color;
            }}
          >
            <Icon size={size} strokeWidth={1.75} aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
}
