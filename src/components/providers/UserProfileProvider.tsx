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

type ProfileData = {
  id: string;
  email: string;
  name: string | null;
};

type UserProfileContextValue = {
  profile: ProfileData | null;
  loading: boolean;
  /** Re-fetch from the server. Use after an external mutation. */
  refresh: () => Promise<void>;
  /** Replace the in-memory profile (e.g. after a PATCH the caller already
   *  performed) without re-fetching. */
  setProfile: (profile: ProfileData) => void;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

/**
 * Provides the current user's DB profile (id, email, name) to descendants.
 * Fetches once after auth resolves; consumers read derived state (banner
 * needs-name, profile-page form seed) without each issuing their own
 * /api/users/me request, and the profile page can call setProfile() after
 * a successful save so the banner reacts immediately.
 */
export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { getIdToken, isAuthenticated, loading: authLoading } = useAuthContext();
  const [profile, setProfileState] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setProfileState(data);
      }
    } catch {
      // Non-critical — consumers gracefully degrade when profile is null.
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchProfile();
  }, [authLoading, isAuthenticated, fetchProfile]);

  return (
    <UserProfileContext.Provider
      value={{ profile, loading, refresh: fetchProfile, setProfile: setProfileState }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return ctx;
}
