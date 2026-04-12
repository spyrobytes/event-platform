"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  SOCIAL_PLATFORMS,
  type SocialLink,
  type SocialPlatform,
} from "@/schemas/event-page";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X (Twitter)",
  pinterest: "Pinterest",
  website: "Website",
};

const PLATFORM_PLACEHOLDERS: Record<SocialPlatform, string> = {
  facebook: "https://facebook.com/your-page",
  instagram: "https://instagram.com/your-handle",
  youtube: "https://youtube.com/@your-channel",
  tiktok: "https://tiktok.com/@your-handle",
  x: "https://x.com/your-handle",
  pinterest: "https://pinterest.com/your-board",
  website: "https://your-website.com",
};

const MAX_LINKS = 8;

type SocialLinksEditorProps = {
  value: SocialLink[] | undefined;
  onChange: (links: SocialLink[] | undefined) => void;
};

function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Editor for optional footer social media links.
 * Rendered in the page editor only for templates that opt in
 * via TEMPLATES_WITH_SOCIAL_LINKS.
 */
export function SocialLinksEditor({ value, onChange }: SocialLinksEditorProps) {
  const links = useMemo(() => value || [], [value]);

  const update = useCallback(
    (next: SocialLink[]) => {
      // Drop the field entirely when empty so it doesn't clutter stored config.
      onChange(next.length === 0 ? undefined : next);
    },
    [onChange]
  );

  const addLink = useCallback(() => {
    if (links.length >= MAX_LINKS) return;
    // Pick the first platform not already used, falling back to "instagram"
    const used = new Set(links.map((l) => l.platform));
    const nextPlatform: SocialPlatform =
      SOCIAL_PLATFORMS.find((p) => !used.has(p)) ?? "instagram";
    update([...links, { platform: nextPlatform, url: "" }]);
  }, [links, update]);

  const removeLink = useCallback(
    (index: number) => {
      update(links.filter((_, i) => i !== index));
    },
    [links, update]
  );

  const updateLink = useCallback(
    (index: number, patch: Partial<SocialLink>) => {
      const next = links.map((link, i) =>
        i === index ? { ...link, ...patch } : link
      );
      update(next);
    },
    [links, update]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Add links to your social profiles. They appear as icons in the footer
          of your wedding page.
        </p>
      </div>

      <div className="space-y-3">
        {links.map((link, index) => {
          const urlInvalid = link.url.length > 0 && !isValidUrl(link.url);
          return (
            <div
              key={index}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                    <div>
                      <Label
                        htmlFor={`social-platform-${index}`}
                        className="text-xs"
                      >
                        Platform
                      </Label>
                      <Select
                        id={`social-platform-${index}`}
                        value={link.platform}
                        onChange={(e) =>
                          updateLink(index, {
                            platform: e.target.value as SocialPlatform,
                          })
                        }
                      >
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <option key={platform} value={platform}>
                            {PLATFORM_LABELS[platform]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label
                        htmlFor={`social-url-${index}`}
                        className="text-xs"
                      >
                        URL
                      </Label>
                      <Input
                        id={`social-url-${index}`}
                        type="url"
                        value={link.url}
                        onChange={(e) =>
                          updateLink(index, { url: e.target.value })
                        }
                        placeholder={PLATFORM_PLACEHOLDERS[link.platform]}
                      />
                      {urlInvalid && (
                        <p className="text-xs text-amber-600 mt-1">
                          Please enter a valid URL (e.g., https://…)
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor={`social-label-${index}`}
                      className="text-xs"
                    >
                      Custom label (optional)
                    </Label>
                    <Input
                      id={`social-label-${index}`}
                      value={link.label || ""}
                      onChange={(e) =>
                        updateLink(index, {
                          label: e.target.value || undefined,
                        })
                      }
                      placeholder={`Defaults to "${PLATFORM_LABELS[link.platform]}"`}
                      maxLength={40}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLink(index)}
                  className="mt-5 h-8 w-8 p-0 text-destructive hover:text-destructive"
                  aria-label="Remove social link"
                >
                  ×
                </Button>
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLink}
          disabled={links.length >= MAX_LINKS}
        >
          + Add Social Link
          {links.length >= MAX_LINKS && ` (max ${MAX_LINKS})`}
        </Button>
      </div>
    </div>
  );
}
