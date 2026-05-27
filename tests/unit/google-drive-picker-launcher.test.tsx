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
  const builderCalls: Array<{ method: string; args: unknown[] }> = [];

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
        return (...args: unknown[]) => {
          builderCalls.push({ method: prop, args });
          return builder;
        };
      },
    },
  );

  Object.defineProperty(window, "gapi", {
    configurable: true,
    value: {
      load: (_api: string, opts: { callback: () => void }) => opts.callback(),
    },
  });
  const docsViewCtorCalls: unknown[] = [];
  Object.defineProperty(window, "google", {
    configurable: true,
    value: {
      picker: {
        PickerBuilder: function PickerBuilder() {
          return builder;
        },
        DocsView: function DocsView(viewId?: unknown) {
          docsViewCtorCalls.push(viewId);
          return view;
        },
        ViewId: { DOCS: 1, DOCS_IMAGES: 3, PHOTOS: 2 },
        DocsViewMode: { LIST: "LIST", GRID: "GRID" },
        Feature: { MULTISELECT_ENABLED: "MULTISELECT_ENABLED", NAV_HIDDEN: "NAV_HIDDEN" },
        Action: { PICKED: "picked", CANCEL: "cancel", LOADED: "loaded" },
      },
    },
  });

  return { viewCalls, builderCalls, setVisible, docsViewCtorCalls };

}

beforeEach(() => {
  process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY = "test-api-key";
  process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID = "123456789012";
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
  delete process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID;
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
    // the Picker then shows everything the user can navigate in Drive.
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

  it("wires the project number into setAppId so thumbnails + PICKED grant work", async () => {
    const { builderCalls, setVisible } = installPickerStubs();

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

    // Regression: setAppId is required by the Picker whenever Drive scopes
    // are in use. Omitting it caused thumbnails to silently fail and the
    // PICKED-action grant to hang (the Picker chrome couldn't close).
    const appIdCall = builderCalls.find((c) => c.method === "setAppId");
    expect(appIdCall).toBeDefined();
    expect(appIdCall?.args[0]).toBe("123456789012");
  });

  it("opens the Drive image view in grid mode so thumbnails render", async () => {
    const { viewCalls, docsViewCtorCalls, setVisible } = installPickerStubs();

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

    // Regression: the launcher previously used ViewId.DOCS which renders
    // as a generic filename-list with placeholder icons. ViewId.DOCS_IMAGES
    // is the image-specific view and defaults to a thumbnail grid; we
    // also force GRID mode in case a future Picker default flips.
    expect(docsViewCtorCalls).toContain(3); // ViewId.DOCS_IMAGES in our stub
    const modeCall = viewCalls.find((c) => c.method === "setMode");
    expect(modeCall?.args[0]).toBe("GRID");
  });

  it("fails fast with a clear message when NEXT_PUBLIC_GOOGLE_PICKER_APP_ID is missing", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID;
    installPickerStubs();

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

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/NEXT_PUBLIC_GOOGLE_PICKER_APP_ID/);
  });
});
