import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { serverEnvSchema, clientEnvSchema } from "@/env";

const SRC_DIR = join(__dirname, "..", "..", "src");
const ENV_SCHEMA_PATH = join(SRC_DIR, "env.ts");

const ALLOW_LIST = new Set([
  "NODE_ENV",
  "SKIP_ENV_VALIDATION",
]);

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

describe("env references", () => {
  it("every process.env.X reference in src/ is declared in src/env.ts", () => {
    const declared = new Set([
      ...Object.keys(serverEnvSchema.shape),
      ...Object.keys(clientEnvSchema.shape),
    ]);
    const re = /process\.env\.([A-Z][A-Z0-9_]*)/g;
    const offenders: { var: string; file: string }[] = [];

    for (const file of walk(SRC_DIR)) {
      if (file === ENV_SCHEMA_PATH) continue;
      const src = readFileSync(file, "utf8");
      const seen = new Set<string>();
      for (const m of src.matchAll(re)) {
        const name = m[1];
        if (seen.has(name)) continue;
        seen.add(name);
        if (declared.has(name) || ALLOW_LIST.has(name)) continue;
        offenders.push({ var: name, file: relative(SRC_DIR, file) });
      }
    }

    expect(offenders, formatOffenders(offenders)).toEqual([]);
  });
});

function formatOffenders(offenders: { var: string; file: string }[]): string {
  if (offenders.length === 0) return "";
  const lines = offenders
    .map(({ var: v, file }) => `  ${v}  (${file})`)
    .join("\n");
  return (
    `Undeclared env vars referenced in src/:\n${lines}\n\n` +
    `Add them to the schema in src/env.ts, or to the ALLOW_LIST in this test if they are framework/meta vars.`
  );
}
