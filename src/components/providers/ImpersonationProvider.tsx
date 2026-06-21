"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuthContext } from "./AuthProvider";

/** A live admin "act-as organizer" grant, as the client tracks it. */
export type ActiveGrant = {
  grantId: string;
  /** The grant is scoped to this one event — the header is only injected here. */
  eventId: string;
  expiresAt: string; // ISO
  target: { id: string; name: string | null; email: string };
};

export type StartActAsInput = {
  targetUserId: string;
  eventId: string;
  reason: string;
};

type ImpersonationContextValue = {
  /** The active act-as grant, or null when the admin is acting as themselves. */
  grant: ActiveGrant | null;
  /** Start a grant (admin only — POSTs to the admin endpoint) and remember it. */
  startActAs: (input: StartActAsInput) => Promise<ActiveGrant>;
  /** End the active grant and clear it. Best-effort on the server side. */
  exitActAs: () => Promise<void>;
  /**
   * Clear the local grant WITHOUT a server round-trip — for when the server has
   * already invalidated it (a 403 with code IMPERSONATION_INVALID).
   */
  clearGrant: () => void;
  /**
   * The `X-Act-As` header to merge into an editing request — but ONLY when the
   * active grant is for `eventId` and hasn't expired. Returns `{}` otherwise, so
   * editing call-sites can spread it unconditionally and a normal organizer (or
   * an admin editing a different event) never sends the header.
   */
  actAsHeaders: (eventId: string) => Record<string, string>;
};

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

const STORAGE_KEY = "efx_act_as_grant";

/** Error code the server returns when an act-as grant is no longer valid. */
export const IMPERSONATION_INVALID_CODE = "IMPERSONATION_INVALID";

/**
 * True when a failed editing response means the act-as grant is dead
 * (expired / ended / forged). The cue for a call-site to clearGrant() and tell
 * the admin their session ended, rather than surfacing a generic error.
 */
export function isImpersonationInvalid(body: unknown): boolean {
  return (
    !!body &&
    typeof body === "object" &&
    (body as { code?: unknown }).code === IMPERSONATION_INVALID_CODE
  );
}

/** Read + validate a persisted grant; drops it if malformed or expired. */
function readStoredGrant(): ActiveGrant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as ActiveGrant;
    if (!g?.grantId || new Date(g.expiresAt).getTime() <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return g;
  } catch {
    return null;
  }
}

/**
 * Tracks the admin's active act-as grant across the app. Persisted in
 * sessionStorage so it survives both a reload and the /efx-ctrl → /dashboard
 * navigation (the admin starts a grant in the admin area, then edits in the
 * organizer dashboard). Wraps the whole app (inside AuthProvider) because the
 * banner lives in the dashboard layout while the start action lives in /efx-ctrl.
 */
export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { getIdToken } = useAuthContext();
  const [grant, setGrant] = useState<ActiveGrant | null>(null);

  // Restore a persisted grant AFTER hydration (async setState → no SSR/client
  // mismatch, and lint-safe — same shape as StatusBanner's fetch effect).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = readStoredGrant();
      if (!cancelled && stored) setGrant(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-clear when the grant expires so the banner can't linger past its TTL.
  useEffect(() => {
    if (!grant) return;
    const ms = new Date(grant.expiresAt).getTime() - Date.now();
    if (ms <= 0) return; // readStoredGrant already drops expired grants
    const timer = setTimeout(() => {
      setGrant(null);
      window.sessionStorage.removeItem(STORAGE_KEY);
    }, ms);
    return () => clearTimeout(timer);
  }, [grant]);

  const startActAs = useCallback(
    async (input: StartActAsInput): Promise<ActiveGrant> => {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in.");
      const res = await fetch("/api/admin/impersonation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.data?.grantId) {
        throw new Error(body?.error || "Could not start editing on behalf.");
      }
      const next: ActiveGrant = {
        grantId: body.data.grantId,
        eventId: body.data.eventId,
        expiresAt: body.data.expiresAt,
        target: body.data.target,
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setGrant(next);
      return next;
    },
    [getIdToken],
  );

  const exitActAs = useCallback(async (): Promise<void> => {
    const current = grant;
    // Clear locally first so the UI exits act-as immediately.
    setGrant(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (!current) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(
        `/api/admin/impersonation?grantId=${encodeURIComponent(current.grantId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {
      // Best-effort — the grant also expires server-side on its own.
    }
  }, [grant, getIdToken]);

  // Clear the local grant WITHOUT calling the server — for when the server has
  // already invalidated it (403 IMPERSONATION_INVALID: expired / ended / forged).
  const clearGrant = useCallback(() => {
    setGrant(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  // Reads the persisted grant at call time instead of closing over `grant`
  // state, so its identity is STABLE across grant transitions. Editing effects
  // that list it in their deps therefore don't re-run (and re-fetch) when a
  // grant is restored, cleared, or expires — and on a reload the header is
  // available synchronously from sessionStorage, before React restores the
  // banner state, so the first fetch already carries it (no double-fetch race).
  const actAsHeaders = useCallback((eventId: string): Record<string, string> => {
    const active = readStoredGrant();
    if (active && active.eventId === eventId) {
      return { "x-act-as": active.grantId };
    }
    return {};
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{ grant, startActAs, exitActAs, clearGrant, actAsHeaders }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) {
    throw new Error(
      "useImpersonation must be used within an ImpersonationProvider",
    );
  }
  return ctx;
}
