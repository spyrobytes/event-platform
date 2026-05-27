import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { randomBytes } from "node:crypto";

// Mock the DB so we can assert update calls. providerToken.findUnique returns
// a row with an expired access token; update is the revoke / refresh write.
const dbMock = {
  providerToken: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

// Mock the Google refresh call. GoogleTokenError comes from the real module
// so the `instanceof` check inside provider-tokens.ts sees the same class.
const refreshMock = vi.fn();
vi.mock("@/lib/providers/google-drive", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/providers/google-drive")
  >("@/lib/providers/google-drive");
  return {
    ...actual,
    refreshGoogleDriveAccessToken: refreshMock,
  };
});

const {
  getValidAccessToken,
  encryptToken,
  ProviderTokenRevokedError,
} = await import("@/lib/provider-tokens");
const { GoogleTokenError } = await import("@/lib/providers/google-drive");

const ORIGINAL_ENC_KEY = process.env.PROVIDER_TOKEN_ENCRYPTION_KEY;

beforeAll(() => {
  process.env.PROVIDER_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

afterAll(() => {
  process.env.PROVIDER_TOKEN_ENCRYPTION_KEY = ORIGINAL_ENC_KEY;
});

beforeEach(() => {
  vi.clearAllMocks();
});

function buildExpiredTokenRow() {
  return {
    id: "token_1",
    accessTokenEnvelope: encryptToken("stale-access-token"),
    refreshTokenEnvelope: encryptToken("the-refresh-token"),
    expiresAt: new Date(Date.now() - 60_000),
    revokedAt: null,
    scope: "https://www.googleapis.com/auth/drive.readonly",
  };
}

describe("GoogleTokenError", () => {
  it("carries status, errorCode, and errorDescription", () => {
    const err = new GoogleTokenError(400, "invalid_grant", "Token has been expired or revoked.");
    expect(err.status).toBe(400);
    expect(err.errorCode).toBe("invalid_grant");
    expect(err.errorDescription).toBe("Token has been expired or revoked.");
    expect(err.message).toContain("400");
    expect(err.message).toContain("Token has been expired or revoked.");
  });

  it("falls back through description → code → unknown for the message", () => {
    const a = new GoogleTokenError(500, null, null);
    expect(a.message).toContain("unknown");
    const b = new GoogleTokenError(400, "invalid_client", null);
    expect(b.message).toContain("invalid_client");
  });
});

describe("getValidAccessToken — refresh failure handling", () => {
  it("marks the local row revoked and throws ProviderTokenRevokedError on invalid_grant", async () => {
    dbMock.providerToken.findUnique.mockResolvedValueOnce(buildExpiredTokenRow());
    refreshMock.mockRejectedValueOnce(
      new GoogleTokenError(400, "invalid_grant", "Token revoked"),
    );

    await expect(
      getValidAccessToken("user_1", "GOOGLE_DRIVE"),
    ).rejects.toBeInstanceOf(ProviderTokenRevokedError);

    expect(dbMock.providerToken.update).toHaveBeenCalledTimes(1);
    const updateCall = dbMock.providerToken.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "token_1" });
    expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
    // The update is ONLY the revoke — no access-token envelope write.
    expect(updateCall.data.accessTokenEnvelope).toBeUndefined();
  });

  it("re-throws other GoogleTokenError codes without revoking", async () => {
    dbMock.providerToken.findUnique.mockResolvedValueOnce(buildExpiredTokenRow());
    refreshMock.mockRejectedValueOnce(
      new GoogleTokenError(500, "internal_error", "Try again"),
    );

    await expect(
      getValidAccessToken("user_1", "GOOGLE_DRIVE"),
    ).rejects.toBeInstanceOf(GoogleTokenError);

    expect(dbMock.providerToken.update).not.toHaveBeenCalled();
  });

  it("re-throws non-GoogleTokenError refresh failures (e.g. network) without revoking", async () => {
    dbMock.providerToken.findUnique.mockResolvedValueOnce(buildExpiredTokenRow());
    refreshMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(
      getValidAccessToken("user_1", "GOOGLE_DRIVE"),
    ).rejects.toBeInstanceOf(TypeError);

    expect(dbMock.providerToken.update).not.toHaveBeenCalled();
  });

  it("persists the refreshed token on success", async () => {
    dbMock.providerToken.findUnique.mockResolvedValueOnce(buildExpiredTokenRow());
    refreshMock.mockResolvedValueOnce({
      accessToken: "fresh-access-token",
      refreshToken: null,
      expiresInSec: 3600,
      scope: "https://www.googleapis.com/auth/drive.readonly",
    });

    const token = await getValidAccessToken("user_1", "GOOGLE_DRIVE");
    expect(token).toBe("fresh-access-token");

    expect(dbMock.providerToken.update).toHaveBeenCalledTimes(1);
    const updateCall = dbMock.providerToken.update.mock.calls[0][0];
    expect(updateCall.data.accessTokenEnvelope).toBeInstanceOf(Uint8Array);
    expect(updateCall.data.expiresAt).toBeInstanceOf(Date);
    // No new refresh token issued → don't touch the existing envelope.
    expect(updateCall.data.refreshTokenEnvelope).toBeUndefined();
  });

  it("persists a rotated refresh token when Google issues one", async () => {
    dbMock.providerToken.findUnique.mockResolvedValueOnce(buildExpiredTokenRow());
    refreshMock.mockResolvedValueOnce({
      accessToken: "fresh-access-token",
      refreshToken: "rotated-refresh-token",
      expiresInSec: 3600,
      scope: "https://www.googleapis.com/auth/drive.readonly",
    });

    await getValidAccessToken("user_1", "GOOGLE_DRIVE");

    const updateCall = dbMock.providerToken.update.mock.calls[0][0];
    expect(updateCall.data.refreshTokenEnvelope).toBeInstanceOf(Uint8Array);
  });
});
