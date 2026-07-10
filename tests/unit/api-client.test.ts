import { describe, it, expect } from "vitest";

import { parseApiResponse } from "@/lib/api-client";
import { PAGE_CONFIG_LIMITS } from "@/schemas/event-page";

// The regression this helper guards: platform-level rejections (Vercel's
// 4.5MB function-body cap) answer with PLAIN TEXT, and parsing them as JSON
// produced `Unexpected token 'R', "Request En"... is not valid JSON` in the
// upload UIs instead of anything a user could act on.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("parseApiResponse", () => {
  it("returns the parsed body on success", async () => {
    const result = await parseApiResponse<{ data: { id: string } }>(
      json({ data: { id: "abc" } })
    );
    expect(result.data.id).toBe("abc");
  });

  it("throws the route's error message from a JSON error body", async () => {
    await expect(
      parseApiResponse(json({ error: "Maximum 50 assets allowed per event" }, 400))
    ).rejects.toThrow("Maximum 50 assets allowed per event");
  });

  it("maps a plain-text 413 (Vercel body cap) to a readable size message", async () => {
    const platform413 = new Response("Request Entity Too Large", {
      status: 413,
      headers: { "content-type": "text/plain" },
    });
    const mb = PAGE_CONFIG_LIMITS.maxFileSizeBytes / 1024 / 1024;
    await expect(parseApiResponse(platform413)).rejects.toThrow(
      `File is too large to upload. Maximum size is ${mb}MB.`
    );
  });

  it("reports status for other non-JSON failures instead of crashing the parse", async () => {
    const gatewayHtml = new Response("<html>Bad Gateway</html>", {
      status: 502,
      statusText: "Bad Gateway",
      headers: { "content-type": "text/html" },
    });
    await expect(parseApiResponse(gatewayHtml)).rejects.toThrow(
      "Request failed (502 Bad Gateway)"
    );
  });

  it("survives a malformed JSON error body (generic message, no parse crash)", async () => {
    const broken = new Response("{truncated", {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    await expect(parseApiResponse(broken)).rejects.toThrow("Request failed (500)");
  });
});
