"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  GooglePickerCallback,
  GooglePickerDocument,
} from "./google-picker-types";

const GAPI_SCRIPT = "https://apis.google.com/js/api.js";

type Props = {
  eventId: string;
  /** True if the user has an active Drive connection. Disables the
   *  launcher when false — caller should render <GoogleDriveConnectButton>
   *  instead in that case. */
  connected: boolean;
  /** True if an import job is already QUEUED/PROCESSING for this event. */
  busy: boolean;
  /** Provided by the dashboard page so we can refresh the gallery row
   *  after selection lands. */
  getIdToken: () => Promise<string | null>;
  onSelected: (result: {
    galleryId: string;
    jobId: string;
    accepted: number;
    skipped: { id: string; name: string; reason: string }[];
  }) => void;
  /** Fires when the access-token endpoint returns 409 (token revoked
   *  while the dashboard was sitting on a stale `connected: true`). The
   *  parent should refetch /status so the UI swaps the Picker for the
   *  Connect button. */
  onReconnectRequired?: () => void;
};

type LauncherState = "idle" | "loading" | "ready" | "error";

/**
 * "Select Photos" button that loads the Google Picker, opens it with a
 * fresh access token from the backend, and submits the chosen files.
 *
 * Picker JS API behavior worth knowing:
 *   - Loads ~50KB on first use; lazy-loaded only when the button is
 *     clicked (we don't include it in the page bundle).
 *   - The Picker's iframe inherits the user's existing Google session.
 *     We pass the access token via setOAuthToken so its file-listing
 *     stays scoped to the drive.file files this app has touched.
 *   - On `cancel` we do NOT submit; the user just closes the dialog.
 */
export function GoogleDrivePickerLauncher({
  eventId,
  connected,
  busy,
  getIdToken,
  onSelected,
  onReconnectRequired,
}: Props) {
  const [state, setState] = useState<LauncherState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitSelection = useCallback(
    async (docs: GooglePickerDocument[]) => {
      setSubmitting(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not authenticated");
        const res = await fetch(
          `/api/events/${eventId}/gallery/google-drive/selection`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              files: docs.map((d) => ({
                id: d.id,
                name: d.name,
                mimeType: d.mimeType,
                ...(typeof d.sizeBytes === "number" ? { sizeBytes: d.sizeBytes } : {}),
                ...(d.thumbnailUrl ? { thumbnailUrl: d.thumbnailUrl } : {}),
              })),
            }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to queue import");
        }
        onSelected(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to queue import");
      } finally {
        setSubmitting(false);
      }
    },
    [eventId, getIdToken, onSelected],
  );

  const ensureGapiLoaded = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined") return;
    if (window.gapi && window.google?.picker) return;
    setState("loading");
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${GAPI_SCRIPT}"]`,
      );
      const onReady = () => {
        if (!window.gapi) return reject(new Error("gapi failed to load"));
        window.gapi.load("picker", {
          callback: () => resolve(),
          onerror: () => reject(new Error("Picker library failed to load")),
        });
      };
      if (existing) {
        if (window.gapi) onReady();
        else existing.addEventListener("load", onReady, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = GAPI_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = onReady;
      script.onerror = () => reject(new Error("Failed to load Google API script"));
      document.head.appendChild(script);
    });
    setState("ready");
  }, []);

  const openPicker = useCallback(async () => {
    setError(null);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Picker API key is not configured. Ask the operator to set NEXT_PUBLIC_GOOGLE_PICKER_API_KEY.",
        );
      }
      const appId = process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID;
      if (!appId) {
        // Without setAppId the Picker silently fails in three observable
        // ways: thumbnails never load, the PICKED-action grant doesn't
        // complete (so the onSelected callback never fires), and the
        // Picker chrome can't be dismissed — the user has to close the
        // browser tab. Fail fast with a clear message instead.
        throw new Error(
          "Picker app ID is not configured. Ask the operator to set NEXT_PUBLIC_GOOGLE_PICKER_APP_ID to the Google Cloud project number.",
        );
      }

      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const tokenRes = await fetch("/api/auth/google-drive/access-token", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tokenRes.status === 409) {
        // Token revoked / never connected — signal the parent so it
        // refetches /status and swaps the Picker for the Connect button.
        // We still throw so the existing error UI shows a reconnect
        // prompt while the parent is loading the new status.
        onReconnectRequired?.();
        throw new Error("Reconnect Google Drive to continue.");
      }
      if (!tokenRes.ok) {
        const data = await tokenRes.json().catch(() => null);
        throw new Error(data?.error ?? "Could not retrieve a Drive access token");
      }
      const { data: tokenData } = await tokenRes.json();

      await ensureGapiLoaded();
      const picker = window.google?.picker;
      if (!picker) throw new Error("Picker library failed to initialize");

      // ViewId.DOCS_IMAGES is the Drive *image-files* view — it renders as
      // a thumbnail grid by default and is filtered to image MIME types.
      // The previous ViewId.DOCS choice defaulted to a list of filename
      // rows with generic icons (organizers saw "blank thumb" placeholders
      // and couldn't tell their photos apart). setMode(GRID) belts the
      // suspenders in case a future Picker default flips back to LIST.
      //
      // No ownership filter — .setOwnedByMe(true) restricts to files
      // owned by the viewer, .setOwnedByMe(false) restricts to
      // shared-with-me. Omitting the call lets the Picker show everything
      // the user can navigate to in Drive (My Drive, Shared with me,
      // Recent, Starred), which is the only behaviour that makes sense
      // with the drive.file scope where the Picker is the source of
      // authorization for each picked file.
      const view = new picker.DocsView(picker.ViewId.DOCS_IMAGES)
        .setMode(picker.DocsViewMode.GRID)
        .setMimeTypes("image/jpeg,image/png,image/webp")
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const callback: GooglePickerCallback = (data) => {
        if (data.action === picker.Action.PICKED && data.docs?.length) {
          void submitSelection(data.docs);
        }
      };

      new picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(tokenData.accessToken)
        .setDeveloperKey(apiKey)
        // App ID couples the Picker session to our Google Cloud project so
        // the drive.file grant flows back to the OAuth client correctly.
        // See the env.ts comment for the failure modes if this is missing.
        .setAppId(appId)
        .enableFeature(picker.Feature.MULTISELECT_ENABLED)
        .setTitle("Select photos to import")
        .setCallback(callback)
        .build()
        .setVisible(true);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not open Drive picker");
    }
  }, [ensureGapiLoaded, getIdToken, submitSelection, onReconnectRequired]);

  const disabled = !connected || busy || submitting || state === "loading";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={disabled}
        onClick={() => void openPicker()}
      >
        {submitting
          ? "Queuing import…"
          : state === "loading"
            ? "Loading Picker…"
            : busy
              ? "Import in progress…"
              : "Select photos from Drive"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
