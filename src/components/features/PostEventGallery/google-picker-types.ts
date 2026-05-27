/**
 * Minimal type declarations for the Google Picker / gapi loader used by
 * the Picker launcher. The official @types packages don't reliably cover
 * the picker namespace; we only need the surface we actually call.
 */

export type GooglePickerDocument = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  thumbnailUrl?: string;
};

export type GooglePickerCallback = (data: {
  action: "picked" | "cancel" | "loaded";
  docs?: GooglePickerDocument[];
}) => void;

type PickerDocsView = {
  setIncludeFolders(v: boolean): PickerDocsView;
  setSelectFolderEnabled(v: boolean): PickerDocsView;
  setMimeTypes(types: string): PickerDocsView;
  setOwnedByMe(v: boolean): PickerDocsView;
};

type PickerBuilder = {
  addView(view: PickerDocsView): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  /** Google Cloud project number. Required whenever a Drive scope is in
   *  use — without it, thumbnails fail and the PICKED-action grant
   *  doesn't complete (the Picker hangs after Select). */
  setAppId(appId: string): PickerBuilder;
  setCallback(cb: GooglePickerCallback): PickerBuilder;
  setTitle(title: string): PickerBuilder;
  enableFeature(feature: string): PickerBuilder;
  build(): { setVisible(v: boolean): void };
};

declare global {
  interface Window {
    gapi?: {
      load(api: string, options: { callback: () => void; onerror?: () => void }): void;
    };
    google?: {
      picker: {
        PickerBuilder: new () => PickerBuilder;
        DocsView: new (viewId?: unknown) => PickerDocsView;
        ViewId: { DOCS: unknown; PHOTOS: unknown };
        Feature: { MULTISELECT_ENABLED: string; NAV_HIDDEN: string };
        Action: { PICKED: "picked"; CANCEL: "cancel"; LOADED: "loaded" };
      };
    };
  }
}

export {};
