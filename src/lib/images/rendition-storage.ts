import { generateRenditions } from "@/lib/media-validation";
import { uploadFile, getRenditionPath } from "@/lib/supabase-storage";

/**
 * Server-side orchestration for responsive rendition siblings — the generate +
 * upload + path logic shared by the media POST `after()` job, the media DELETE
 * cleanup, and the rendition backfill script. Centralizing it here means the
 * `{base}_w{width}.webp` naming and the upload options can never drift between
 * ingestion, deletion, and backfill (they used to be copy-pasted across all
 * three). Persistence (`renditionWidths`) and cleanup policy stay with each
 * caller, since those legitimately differ (best-effort ingestion vs
 * all-or-nothing backfill).
 *
 * NOTE: server-only (pulls in sharp via generateRenditions + the storage
 * client). The pure, client-safe path/URL helpers live in `./rendition.ts`.
 */

/** 1-year cache applied to every uploaded rendition sibling. */
const RENDITION_CACHE_CONTROL = "public, max-age=31536000";

/**
 * Storage paths of an asset's rendition siblings for the given widths:
 * `{base}.webp` + 640 → `{base}_w640.webp`. Pure (no I/O) — used to build the
 * delete list for cleanup. Accepts any iterable so a de-duped `Set` works.
 */
export function renditionSiblingPaths(
  basePath: string,
  widths: Iterable<number>,
): string[] {
  return Array.from(widths, (w) => getRenditionPath(basePath, w));
}

export type UploadRenditionsResult = {
  /** Widths `generateRenditions` actually produced (ladder rungs < source). */
  generatedWidths: number[];
  /** Subset that uploaded successfully, sorted ascending. */
  uploadedWidths: number[];
};

/**
 * Generates the responsive ladder for `buffer` and uploads each rendition next
 * to `basePath`. Storage I/O only — the caller writes `renditionWidths` and
 * decides what to do on a partial upload. A failed upload is logged and
 * excluded from `uploadedWidths`; compare its length to `generatedWidths` to
 * detect partial failure.
 *
 * `upsert` overwrites existing siblings (backfill re-runs); omit it for
 * first-write ingestion.
 */
export async function uploadRenditions(params: {
  bucket: string;
  basePath: string;
  buffer: Buffer;
  widths: readonly number[];
  upsert?: boolean;
}): Promise<UploadRenditionsResult> {
  const { bucket, basePath, buffer, widths, upsert } = params;

  const renditions = await generateRenditions(buffer, widths);
  const results = await Promise.all(
    renditions.map(async ({ width, buffer: renditionBuffer }) => {
      const result = await uploadFile(
        bucket,
        getRenditionPath(basePath, width),
        renditionBuffer,
        {
          contentType: "image/webp",
          cacheControl: RENDITION_CACHE_CONTROL,
          ...(upsert ? { upsert: true } : {}),
        },
      );
      if ("error" in result) {
        console.error(`Rendition upload failed (w=${width}):`, result.error);
        return null;
      }
      return width;
    }),
  );

  return {
    generatedWidths: renditions.map((r) => r.width).sort((a, b) => a - b),
    uploadedWidths: results
      .filter((w): w is number => w !== null)
      .sort((a, b) => a - b),
  };
}
