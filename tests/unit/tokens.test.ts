import { describe, it, expect } from "vitest";
import {
  generateToken,
  hashToken,
  verifyToken,
  generateTokenPair,
} from "@/lib/tokens";

describe("generateToken", () => {
  it("generates a token", () => {
    const token = generateToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
  });

  it("generates unique tokens", () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
  });

  it("generates base64url-safe tokens", () => {
    const token = generateToken();
    // base64url should not contain +, /, or =
    expect(token).not.toMatch(/[+/=]/);
  });

  it("generates tokens of consistent length", () => {
    // 32 bytes in base64url is ~43 characters
    const token = generateToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token.length).toBeLessThanOrEqual(50);
  });
});

describe("hashToken", () => {
  it("hashes a token", () => {
    const token = "test-token";
    const hash = hashToken(token);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  it("produces consistent hashes", () => {
    const token = "test-token";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different tokens", () => {
    const hash1 = hashToken("token1");
    const hash2 = hashToken("token2");
    expect(hash1).not.toBe(hash2);
  });

  it("produces 64-character hex hashes (SHA-256)", () => {
    const hash = hashToken("test");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

describe("verifyToken", () => {
  it("verifies a valid token", () => {
    const token = "test-token";
    const hash = hashToken(token);
    expect(verifyToken(token, hash)).toBe(true);
  });

  it("rejects an invalid token", () => {
    const hash = hashToken("correct-token");
    expect(verifyToken("wrong-token", hash)).toBe(false);
  });

  it("rejects when hash is tampered", () => {
    const token = "test-token";
    const hash = hashToken(token);
    const tamperedHash = hash.replace(/^./, "0");
    expect(verifyToken(token, tamperedHash)).toBe(false);
  });

  it("handles empty strings", () => {
    expect(verifyToken("", hashToken(""))).toBe(true);
  });

  it("handles mismatched hash lengths", () => {
    const token = "test";
    expect(verifyToken(token, "short")).toBe(false);
  });
});

describe("generateTokenPair", () => {
  it("returns both token and hash", () => {
    const pair = generateTokenPair();
    expect(pair).toHaveProperty("token");
    expect(pair).toHaveProperty("hash");
  });

  it("hash matches the token", () => {
    const { token, hash } = generateTokenPair();
    expect(verifyToken(token, hash)).toBe(true);
  });

  it("generates unique pairs", () => {
    const pair1 = generateTokenPair();
    const pair2 = generateTokenPair();
    expect(pair1.token).not.toBe(pair2.token);
    expect(pair1.hash).not.toBe(pair2.hash);
  });
});
