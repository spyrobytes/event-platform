import { describe, it, expect, beforeEach } from "vitest";
import {
  SESSION_PREVIEW_KEY,
  readInvitePreview,
  writeInvitePreview,
  clearInvitePreview,
  type InvitePreview,
} from "@/lib/public-rsvp-portal";

beforeEach(() => {
  sessionStorage.clear();
});

describe("public-rsvp-portal sessionStorage helpers", () => {
  it("write + read round-trips a preview object", () => {
    const preview: InvitePreview = {
      name: "Alice",
      hasEmail: true,
      plusOnesAllowed: 2,
    };
    writeInvitePreview(preview);
    expect(readInvitePreview()).toEqual(preview);
  });

  it("read returns null when nothing has been written", () => {
    expect(readInvitePreview()).toBeNull();
  });

  it("read returns null when stored value is unparseable", () => {
    sessionStorage.setItem(SESSION_PREVIEW_KEY, "{not valid json");
    expect(readInvitePreview()).toBeNull();
  });

  it("read returns null when stored value is missing required fields", () => {
    sessionStorage.setItem(
      SESSION_PREVIEW_KEY,
      JSON.stringify({ name: "Alice" }) // missing hasEmail, plusOnesAllowed
    );
    expect(readInvitePreview()).toBeNull();
  });

  it("read returns null when hasEmail isn't a boolean", () => {
    sessionStorage.setItem(
      SESSION_PREVIEW_KEY,
      JSON.stringify({ name: null, hasEmail: "yes", plusOnesAllowed: 0 })
    );
    expect(readInvitePreview()).toBeNull();
  });

  it("read returns null when plusOnesAllowed isn't a number", () => {
    sessionStorage.setItem(
      SESSION_PREVIEW_KEY,
      JSON.stringify({ name: null, hasEmail: true, plusOnesAllowed: "two" })
    );
    expect(readInvitePreview()).toBeNull();
  });

  it("clearInvitePreview removes the stored value", () => {
    writeInvitePreview({ name: "Alice", hasEmail: true, plusOnesAllowed: 0 });
    clearInvitePreview();
    expect(readInvitePreview()).toBeNull();
  });

  it("preserves null name", () => {
    writeInvitePreview({ name: null, hasEmail: false, plusOnesAllowed: 0 });
    expect(readInvitePreview()?.name).toBeNull();
  });

  it("survives the boolean-zero edge case (hasEmail: false, plusOnesAllowed: 0)", () => {
    writeInvitePreview({ name: null, hasEmail: false, plusOnesAllowed: 0 });
    const result = readInvitePreview();
    expect(result).toEqual({ name: null, hasEmail: false, plusOnesAllowed: 0 });
  });
});
