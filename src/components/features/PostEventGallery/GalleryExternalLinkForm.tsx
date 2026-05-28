"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  upsertExternalLinkInputSchema,
  type GalleryStatus,
} from "@/schemas/gallery";
import { getTrustedHostName } from "@/lib/gallery-trusted-hosts";

type ExistingGallery = {
  id: string;
  title: string | null;
  description: string | null;
  sourceType: string;
  status: GalleryStatus;
  sourceRef: unknown;
};

type Props = {
  eventId: string;
  existing: ExistingGallery | null;
  getIdToken: () => Promise<string | null>;
  onSaved: () => void;
};

type Submitting = "draft" | "publish" | null;

export function GalleryExternalLinkForm({
  eventId,
  existing,
  getIdToken,
  onSaved,
}: Props) {
  const externalRef = parseExternalRef(existing?.sourceRef);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [url, setUrl] = useState(externalRef?.url ?? "");
  const [ctaLabel, setCtaLabel] = useState(externalRef?.ctaLabel ?? "");
  const [submitting, setSubmitting] = useState<Submitting>(null);
  const [error, setError] = useState<string | null>(null);

  // trim mirrors what we send on submit, otherwise pasting a URL with
  // trailing whitespace would suppress the badge preview but still save fine.
  const trustedHost = url.trim() ? getTrustedHostName(url.trim()) : null;

  const submit = async (publish: boolean) => {
    setError(null);
    setSubmitting(publish ? "publish" : "draft");
    try {
      const parsed = upsertExternalLinkInputSchema.safeParse({
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        url: url.trim(),
        ctaLabel: ctaLabel.trim() || undefined,
        publish,
      });
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        setError(first?.message ?? "Invalid input");
        setSubmitting(null);
        return;
      }
      const token = await getIdToken();
      if (!token) {
        setError("Not authenticated");
        setSubmitting(null);
        return;
      }
      const res = await fetch(
        `/api/events/${eventId}/gallery/external-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(parsed.data),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save gallery");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save gallery");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        // For a published gallery the "Save as draft" submit button is hidden;
        // Enter-key (implicit form submission) needs to take the same code
        // path as the visible primary button so the spinner state is correct.
        void submit(existing?.status === "PUBLISHED");
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="gallery-title">Gallery title</Label>
        <Input
          id="gallery-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Album from our wedding"
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Defaults to &ldquo;{`{Event}`} Album&rdquo; on the public page.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gallery-description">Short description</Label>
        <Textarea
          id="gallery-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Snapshots from the day. Thanks for being part of it."
          maxLength={1000}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gallery-url">
          Album URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="gallery-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://photographer.pixieset.com/yourevent"
          required
        />
        {trustedHost && (
          <p className="text-xs text-muted-foreground">
            We&apos;ll show a &ldquo;Hosted on {trustedHost}&rdquo; badge on the
            public page.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gallery-cta">Button label</Label>
        <Input
          id="gallery-cta"
          value={ctaLabel}
          onChange={(e) => setCtaLabel(e.target.value)}
          placeholder="View Album"
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Defaults to &ldquo;View Album&rdquo;.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* "Save as draft" is only meaningful when the gallery isn't already
            published — otherwise this button would just save the title/URL
            without changing visibility, which contradicts its label. For a
            published gallery, the explicit Unpublish action handles state
            transition; this form's primary button just saves changes. */}
        {existing?.status !== "PUBLISHED" && (
          <Button
            type="submit"
            variant="outline"
            disabled={submitting !== null}
          >
            {submitting === "draft" ? "Saving…" : "Save as draft"}
          </Button>
        )}
        <Button
          type="button"
          disabled={submitting !== null || !url.trim()}
          onClick={() => void submit(true)}
        >
          {submitting === "publish"
            ? existing?.status === "PUBLISHED"
              ? "Saving…"
              : "Publishing…"
            : existing?.status === "PUBLISHED"
              ? "Save changes"
              : "Save & publish"}
        </Button>
      </div>
    </form>
  );
}

function parseExternalRef(
  ref: unknown,
): { url?: string; ctaLabel?: string } | null {
  if (!ref || typeof ref !== "object") return null;
  const obj = ref as Record<string, unknown>;
  if (obj.kind !== "EXTERNAL_LINK") return null;
  return {
    url: typeof obj.url === "string" ? obj.url : undefined,
    ctaLabel: typeof obj.ctaLabel === "string" ? obj.ctaLabel : undefined,
  };
}
