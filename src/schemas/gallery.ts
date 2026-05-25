import { z } from "zod";

/**
 * URL validator that accepts only http:// and https:// schemes.
 *
 * `z.string().url()` uses the URL constructor, which happily parses
 * `javascript:` and `data:` URIs — letting one of those reach a public
 * `<a href>` is a stored-XSS vector. This guard is the single chokepoint
 * for any externally-renderable URL stored on a gallery.
 */
const httpUrl = (max: number) =>
  z
    .string()
    .url("Must be a valid URL")
    .max(max)
    .refine(
      (v) => {
        try {
          const scheme = new URL(v).protocol;
          return scheme === "http:" || scheme === "https:";
        } catch {
          return false;
        }
      },
      { message: "URL must use http or https" },
    );

/**
 * Provider-specific reference payloads stored in `event_galleries.source_ref`.
 *
 * The DB column is untyped JSON; this discriminated union is the only place
 * the shape is enforced. Any API route or service that writes to source_ref
 * MUST validate through `gallerySourceRefSchema` first.
 */
export const externalLinkSourceRefSchema = z.object({
  kind: z.literal("EXTERNAL_LINK"),
  url: httpUrl(2048),
  ctaLabel: z.string().trim().min(1).max(60).optional(),
  /** Free-form provider hint (e.g. "Pixieset"). Not used for trust decisions. */
  providerHint: z.string().trim().max(60).optional(),
});

export const googleDriveSourceRefSchema = z.object({
  kind: z.literal("GOOGLE_DRIVE"),
  folderId: z.string().min(1).max(120).optional(),
  pickedAt: z.string().datetime(),
});

export const gallerySourceRefSchema = z.discriminatedUnion("kind", [
  externalLinkSourceRefSchema,
  googleDriveSourceRefSchema,
]);

export type GallerySourceRef = z.infer<typeof gallerySourceRefSchema>;
export type ExternalLinkSourceRef = z.infer<typeof externalLinkSourceRefSchema>;

/**
 * String-literal mirror of the Prisma `GalleryStatus` enum, kept here so
 * client components can type the value without pulling in `@prisma/client`
 * (which can drag Node-specific runtime into the browser bundle — see how
 * `wishes/page.tsx` mirrors `MessageStatus` the same way).
 *
 * Must stay in sync with prisma/schema.prisma `enum GalleryStatus`. If the
 * enum changes, TypeScript won't catch the drift here — but `STATUS_LABEL`
 * usage of `Record<GalleryStatus, ...>` will force every label to be
 * present, which is the practical safety net.
 */
export type GalleryStatus =
  | "DRAFT"
  | "SYNCING"
  | "READY"
  | "PUBLISHED"
  | "ERROR"
  | "HIDDEN";

// =============================================================================
// API request schemas
// =============================================================================

/**
 * POST /api/events/[id]/gallery/external-link
 *
 * Upsert: creates the gallery if none exists, updates the existing row
 * otherwise. `publish=true` flips status to PUBLISHED in the same call;
 * omit to keep status as DRAFT.
 */
export const upsertExternalLinkInputSchema = z.object({
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  url: httpUrl(2048),
  ctaLabel: z.string().trim().min(1).max(60).optional(),
  /** MediaAsset.id to use as the cover. Cleared by passing null explicitly. */
  coverMediaAssetId: z.string().cuid().nullable().optional(),
  publish: z.boolean().optional(),
});

export type UpsertExternalLinkInput = z.infer<typeof upsertExternalLinkInputSchema>;

/**
 * POST /api/events/[id]/gallery/google-drive/selection
 *
 * Shape of one file as returned by Google Picker's `getDocuments()` and
 * forwarded to the backend. The Picker actually returns more fields
 * (parentId, lastEditedUtc, …) but we only persist what the worker needs
 * — provider IDs are not stored beyond what's strictly required.
 *
 * `sizeBytes` and `thumbnailUrl` come from the Picker as best-effort and
 * are NOT used for trust decisions — the worker re-validates everything
 * server-side via the Drive API before importing.
 */
export const googleDrivePickedFileSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().nonnegative().optional(),
  thumbnailUrl: z.string().url().max(2048).optional(),
});

export const googleDriveSelectionInputSchema = z.object({
  files: z
    .array(googleDrivePickedFileSchema)
    .min(1, "Pick at least one file")
    // 200 is a generous upper-bound; per-gallery total is checked separately
    // against GALLERY_LIMITS.maxImagesPerGallery in the route handler.
    .max(200, "Too many files in one selection"),
});

export type GoogleDrivePickedFile = z.infer<typeof googleDrivePickedFileSchema>;
export type GoogleDriveSelectionInput = z.infer<typeof googleDriveSelectionInputSchema>;

// =============================================================================
// Public response shapes
// =============================================================================

/**
 * Public payload returned by the dedicated `/e/[slug]/gallery` route and
 * consumed by the teaser / hero CTA. Excludes anything provider-specific
 * (source IDs, raw URLs, internal storage keys).
 */
export type PublicGallery =
  | {
      id: string;
      sourceType: "EXTERNAL_LINK";
      title: string | null;
      description: string | null;
      coverUrl: string | null;
      externalLink: {
        url: string;
        ctaLabel: string;
        trustedHostName: string | null;
      };
    }
  | {
      id: string;
      sourceType: "NATIVE";
      title: string | null;
      description: string | null;
      coverUrl: string | null;
      /** Populated in PR #4+ once imported items exist. Empty for now. */
      items: PublicGalleryItem[];
      pageInfo: { nextCursor: string | null };
    };

export type PublicGalleryItem = {
  id: string;
  src: string;
  thumbnailSrc: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  alt: string;
  caption: string | null;
};
