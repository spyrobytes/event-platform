import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GoogleDrivePickerLauncher } from "@/components/features/PostEventGallery/GoogleDrivePickerLauncher";

const getIdToken = vi.fn(async () => "fake-id-token");

/**
 * Capture the calls made against the Picker view + builder so we can assert
 * the launcher never restricts ownership (a previous version called
 * setOwnedByMe(false), which collapsed the view to "shared with me" and
 * left organizers staring at an empty state).
 */
function installPickerStubs() {
  const viewCalls: Array<{ method: string; args: unknown[] }> = [];

  const view = new Proxy(
    {},
    {
      get(_target, prop: string) {
        return (...args: unknown[]) => {
          viewCalls.push({ method: prop, args });
          return view;
        };
      },
    },
  );

  const setVisible = vi.fn();
  const builder = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "build") return () => ({ setVisible });
        return () => builder;
      },
    },
  );

  Object.defineProperty(window, "gapi", {
    configurable: true,
    value: {
      load: (_api: string, opts: { callback: () => void }) => opts.callback(),
    },
  });
  Object.defineProperty(window, "google", {
    configurable: true,
    value: {
      picker: {
        PickerBuilder: function PickerBuilder() {
          return builder;
        },
        DocsView: function DocsView() {
          return view;
        },
        ViewId: { DOCS: 1, PHOTOS: 2 },
        Feature: { MULTISELECT_ENABLED: "MULTISELECT_ENABLED", NAV_HIDDEN: "NAV_HIDDEN" },
        Action: { PICKED: "picked", CANCEL: "cancel", LOADED: "loaded" },
      },
    },
  });

  return { viewCalls, setVisible };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY = "test-api-key";
  getIdToken.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: { accessToken: "access-token" } }),
    })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as { gapi?: unknown }).gapi;
  delete (window as { google?: unknown }).google;
});

describe("GoogleDrivePickerLauncher — Picker view configuration", () => {
  it("does NOT call setOwnedByMe so users see their own Drive files", async () => {
    const { viewCalls, setVisible } = installPickerStubs();

    render(
      <GoogleDrivePickerLauncher
        eventId="evt_1"
        connected
        busy={false}
        getIdToken={getIdToken}
        onSelected={() => {}}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /select photos from drive/i }),
    );

    await waitFor(() => expect(setVisible).toHaveBeenCalledWith(true));

    const methods = viewCalls.map((c) => c.method);
    // Regression: setOwnedByMe(false) shipped in PR #120 and restricted the
    // Picker to shared-with-me only. The fix is to omit the call entirely;
    // the Picker then shows everything the user can navigate in Drive
    // (which is the correct UX for the drive.file scope).
    expect(methods).not.toContain("setOwnedByMe");
    // Sanity: we still configure the bits the launcher needs.
    expect(methods).toContain("setMimeTypes");
    expect(methods).toContain("setIncludeFolders");
    expect(methods).toContain("setSelectFolderEnabled");
  });

  it("filters the view to JPEG/PNG/WEBP only", async () => {
    const { viewCalls, setVisible } = installPickerStubs();

    render(
      <GoogleDrivePickerLauncher
        eventId="evt_1"
        connected
        busy={false}
        getIdToken={getIdToken}
        onSelected={() => {}}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /select photos from drive/i }),
    );

    await waitFor(() => expect(setVisible).toHaveBeenCalledWith(true));

    const mimeCall = viewCalls.find((c) => c.method === "setMimeTypes");
    expect(mimeCall?.args[0]).toBe("image/jpeg,image/png,image/webp");
  });
});
