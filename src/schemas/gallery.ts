import { z } from "zod";

/**
 * Provider-specific reference payloads stored in `event_galleries.source_ref`.
 *
 * The DB column is untyped JSON; this discriminated union is the only place
 * the shape is enforced. Any API route or service that writes to source_ref
 * MUST validate through `gallerySourceRefSchema` first.
 */
export const externalLinkSourceRefSchema = z.object({
  kind: z.literal("EXTERNAL_LINK"),
  url: z.string().url("Must be a valid URL").max(2048),
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
  url: z.string().url("Must be a valid URL").max(2048),
  ctaLabel: z.string().trim().min(1).max(60).optional(),
  /** MediaAsset.id to use as the cover. Cleared by passing null explicitly. */
  coverMediaAssetId: z.string().cuid().nullable().optional(),
  publish: z.boolean().optional(),
});

export type UpsertExternalLinkInput = z.infer<typeof upsertExternalLinkInputSchema>;

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
