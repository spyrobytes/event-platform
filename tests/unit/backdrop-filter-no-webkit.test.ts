import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Guard: source CSS must NOT hand-write `-webkit-backdrop-filter`.
 *
 * This project's production CSS pipeline (Next 16 + Tailwind v4 / Lightning
 * CSS) GENERATES the `-webkit-` prefix from a standard-only `backdrop-filter`
 * declaration off its browser targets, so authoring standard-only ships BOTH
 * properties (works on old iOS Safari <18 AND modern Firefox/Chrome).
 *
 * Hand-writing the pair is actively harmful: Lightning's dedup keeps only the
 * LAST of the two equal-valued declarations and drops the other. Authoring
 * `backdrop-filter` then `-webkit-backdrop-filter` (the natural habit) ships
 * webkit-ONLY in prod, silently breaking the blur on Firefox (Gecko never
 * supported the `-webkit-` alias). See MobileNavMenu.module.css for the full
 * write-up; verified against production builds.
 *
 * Legitimate uses of the token are allowed: listing it in a `transition`
 * property value, `@supports (-webkit-backdrop-filter: ...)` feature
 * detection, and discussing it in a comment. Only a standalone property
 * *declaration* is forbidden.
 */

/** Blank out `/* … *\/` comment bodies while preserving newlines, so a
 *  comment that merely mentions the property can't trip the guard and line
 *  numbers stay accurate for offender reporting. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

const SRC_DIR = join(__dirname, "..", "..", "src");

function walkCss(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkCss(p));
    else if (e.name.endsWith(".css")) out.push(p);
  }
  return out;
}

describe("backdrop-filter prefix hygiene", () => {
  it("no source CSS hand-writes a -webkit-backdrop-filter declaration (Lightning generates it)", () => {
    const offenders: { file: string; line: number; text: string }[] = [];

    for (const file of walkCss(SRC_DIR)) {
      const lines = stripComments(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (!/-webkit-backdrop-filter\s*:/.test(line)) return;
        // Allow the two legitimate token uses: transition-property lists and
        // @supports feature queries. Everything else is a property declaration.
        if (/\btransition\b/.test(line) || /@supports/.test(line)) return;
        offenders.push({
          file: relative(SRC_DIR, file),
          line: i + 1,
          text: line.trim(),
        });
      });
    }

    expect(
      offenders,
      `Found hand-written -webkit-backdrop-filter declaration(s). Delete them and ` +
        `keep the standard \`backdrop-filter\` only — Lightning CSS generates the ` +
        `prefix in the prod build. See MobileNavMenu.module.css.\n` +
        offenders.map((o) => `  ${o.file}:${o.line}  ${o.text}`).join("\n"),
    ).toEqual([]);
  });
});
