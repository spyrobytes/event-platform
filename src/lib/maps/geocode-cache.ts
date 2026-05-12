/**
 * Two-tier cache for geocode results.
 *
 *   1. Process-local LRU (capacity 256) — fast path, avoids the DB on warm
 *      Vercel function instances.
 *   2. Prisma `GeocodeCache` table — durable across cold starts and shared
 *      across all functions/instances.
 *
 * Also hosts the daily budget guard (`GeocodeUsage`) so a runaway editor
 * session can't exhaust LocationIQ's 5k/day free tier and break production.
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";
import type { GeocodeResult } from "@/lib/maps/geocode";

const TTL_DAYS = 30;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

// Refuse new provider calls once today's count crosses this. Leaves a
// 1,000-request safety margin under LocationIQ's free-tier 5k/day cap.
export const DAILY_BUDGET_FLOOR = 4_000;

// Process-local LRU cache. Bounded so hot pages don't accumulate entries
// over the function's lifetime. `Map` iteration order is insertion order,
// which gives us LRU semantics for free: on read we delete + re-insert.
const LRU_CAPACITY = 256;
const lru = new Map<string, { result: GeocodeResult[]; expiresAt: number }>();

function lruGet(key: string): GeocodeResult[] | null {
  const entry = lru.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    lru.delete(key);
    return null;
  }
  // Refresh insertion order so frequently-hit entries don't age out.
  lru.delete(key);
  lru.set(key, entry);
  return entry.result;
}

function lruSet(key: string, result: GeocodeResult[]): void {
  if (lru.size >= LRU_CAPACITY) {
    const oldest = lru.keys().next().value;
    if (oldest !== undefined) lru.delete(oldest);
  }
  lru.set(key, { result, expiresAt: Date.now() + TTL_MS });
}

// Cache key folds whitespace + case so semantically-identical queries hit
// the same row. The provider is part of the key so swapping providers in
// the future doesn't serve stale shape from a different schema. `limit` is
// included so a caller asking for limit=3 never receives a cached limit=5
// payload (and vice versa) — today the route hardcodes 5, but the key
// stays future-proof for callers that want narrower results.
export function buildCacheKey(args: {
  query: string;
  provider: string;
  biasCountry?: string;
  limit?: number;
}): string {
  const normalized = args.query.trim().replace(/\s+/g, " ").toLowerCase();
  const payload = JSON.stringify({
    q: normalized,
    p: args.provider,
    c: args.biasCountry?.toLowerCase() ?? null,
    l: args.limit ?? null,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export async function readCache(key: string): Promise<GeocodeResult[] | null> {
  const hot = lruGet(key);
  if (hot) return hot;

  const row = await db.geocodeCache.findUnique({ where: { key } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    // Lazy expiry — best-effort cleanup, ignore races.
    await db.geocodeCache.delete({ where: { key } }).catch(() => undefined);
    return null;
  }
  const result = row.response as unknown as GeocodeResult[];
  lruSet(key, result);
  return result;
}

export async function writeCache(args: {
  key: string;
  provider: string;
  result: GeocodeResult[];
}): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.geocodeCache.upsert({
    where: { key: args.key },
    create: {
      key: args.key,
      provider: args.provider,
      response: args.result as unknown as object,
      expiresAt,
    },
    update: {
      provider: args.provider,
      response: args.result as unknown as object,
      expiresAt,
    },
  });
  lruSet(args.key, args.result);
}

// UTC date key so day boundaries are consistent across Vercel regions.
function todayKey(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function getTodayUsage(): Promise<number> {
  const row = await db.geocodeUsage.findUnique({ where: { date: todayKey() } });
  return row?.count ?? 0;
}

export async function incrementTodayUsage(): Promise<void> {
  const date = todayKey();
  await db.geocodeUsage.upsert({
    where: { date },
    create: { date, count: 1 },
    update: { count: { increment: 1 } },
  });
}

export type BudgetCheck = { allowed: true } | { allowed: false; todayCount: number };

export async function checkDailyBudget(): Promise<BudgetCheck> {
  const todayCount = await getTodayUsage();
  if (todayCount >= DAILY_BUDGET_FLOOR) {
    return { allowed: false, todayCount };
  }
  return { allowed: true };
}

// Exposed for tests.
export const __testing = { lru, todayKey };
