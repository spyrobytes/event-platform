import { PAGE_CONFIG_LIMITS } from "@/schemas/event-page";

const MAX_UPLOAD_MB = PAGE_CONFIG_LIMITS.maxFileSizeBytes / 1024 / 1024;

/**
 * Parse a fetch Response from our API routes, throwing a readable Error on
 * failure instead of letting `response.json()` crash on a non-JSON body.
 *
 * Our routes always answer JSON (`successResponse`/`errorResponse`), but
 * responses that never reach a route don't: Vercel rejects request bodies
 * over its 4.5MB serverless cap at the platform layer with a PLAIN TEXT
 * 413 ("Request Entity Too Large"), and proxies/gateways can answer with
 * HTML. Parsing those as JSON produced errors like
 * `Unexpected token 'R', "Request En"... is not valid JSON` — this helper
 * turns them into messages a user can act on.
 *
 * Success bodies are returned parsed; error bodies throw `Error` with the
 * route's `{ error }` message when present, a status-specific message
 * otherwise.
 */
export async function parseApiResponse<T = unknown>(response: Response): Promise<T> {
  const isJson = (response.headers.get("content-type") ?? "").includes("application/json");

  if (!response.ok) {
    if (isJson) {
      // .catch: a truncated/malformed JSON error body shouldn't crash the
      // error path it was meant to explain.
      const body = await response.json().catch(() => null);
      const message =
        body && typeof body.error === "string"
          ? body.error
          : `Request failed (${response.status})`;
      throw new Error(message);
    }
    if (response.status === 413) {
      // The platform bounced the body before our route (and its own size
      // validation) ever ran.
      throw new Error(
        `File is too large to upload. Maximum size is ${MAX_UPLOAD_MB}MB.`,
      );
    }
    throw new Error(`Request failed (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as T;
}
