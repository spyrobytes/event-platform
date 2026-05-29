import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GALLERY_BUCKET_SPEC } from "@/lib/gallery-config";

/**
 * Drift guard. The worker self-heals the prod `gallery` bucket from
 * GALLERY_BUCKET_SPEC (src/lib/gallery-config.ts), while local dev provisions
 * it declaratively from supabase/config.toml [storage.buckets.gallery].
 * Nothing keeps the two in sync at runtime, so assert parity here — if either
 * side changes without the other, CI fails. See the 2026-05-29 prod incident:
 * a bucket whose spec silently diverges from what the worker creates is the
 * same class of footgun as a bucket that doesn't exist at all.
 */

const configToml = readFileSync(
  path.resolve(process.cwd(), "supabase/config.toml"),
  "utf8",
);

/** Body of a `[storage.buckets.<name>]` block, up to the next TOML table
 *  header or EOF. */
function tomlBucketBlock(name: string): string {
  const header = `[storage.buckets.${name}]`;
  const start = configToml.indexOf(header);
  if (start === -1) {
    throw new Error(`config.toml: ${header} not found`);
  }
  const rest = configToml.slice(start + header.length);
  const next = rest.search(/\n\s*\[/);
  return next === -1 ? rest : rest.slice(0, next);
}

function mibStringToBytes(s: string): number {
  const m = s.match(/^(\d+(?:\.\d+)?)\s*MiB$/);
  if (!m) {
    throw new Error(`config.toml: expected an "<n>MiB" file_size_limit, got "${s}"`);
  }
  return Math.round(Number.parseFloat(m[1]) * 1024 * 1024);
}

describe("gallery bucket spec parity (config.toml ↔ GALLERY_BUCKET_SPEC)", () => {
  const block = tomlBucketBlock("gallery");

  it("public flag matches", () => {
    const m = block.match(/public\s*=\s*(true|false)/);
    expect(m?.[1]).toBe(String(GALLERY_BUCKET_SPEC.public));
  });

  it("file_size_limit matches GALLERY_BUCKET_SPEC.fileSizeBytes", () => {
    const m = block.match(/file_size_limit\s*=\s*"([^"]+)"/);
    expect(m, "file_size_limit not found in config.toml gallery block").toBeTruthy();
    expect(mibStringToBytes(m![1])).toBe(GALLERY_BUCKET_SPEC.fileSizeBytes);
  });

  it("allowed_mime_types matches GALLERY_BUCKET_SPEC.allowedMimeTypes", () => {
    const m = block.match(/allowed_mime_types\s*=\s*\[([^\]]*)\]/);
    expect(m, "allowed_mime_types not found in config.toml gallery block").toBeTruthy();
    const types = m![1]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    expect(types).toEqual([...GALLERY_BUCKET_SPEC.allowedMimeTypes]);
  });
});
