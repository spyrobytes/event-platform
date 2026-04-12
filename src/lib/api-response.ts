import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

/**
 * Standard API error response type
 */
export type APIError = {
  error: string;
  code?: string;
  details?: unknown;
};

/**
 * Creates a success JSON response wrapped in { data: ... }
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ data }, { status });
}

/**
 * Creates an error JSON response
 */
export function errorResponse(
  error: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse<APIError> {
  const body: APIError = { error };
  if (code) body.code = code;
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Parse pagination params from a request URL.
 * Defaults: page=1, limit=50, max limit=200.
 */
export function parsePagination(
  request: NextRequest,
  defaultLimit = 50,
  maxLimit = 200
): { skip: number; take: number; page: number; limit: number } {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const rawLimit = parseInt(url.searchParams.get("limit") || String(defaultLimit), 10) || defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

/**
 * Handles errors and returns appropriate responses
 * Use in catch blocks of API route handlers
 */
export function handleApiError(error: unknown): NextResponse<APIError> {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return errorResponse(
      "Validation failed",
      400,
      "VALIDATION_ERROR",
      error.issues
    );
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode, error.code);
  }

  // Log unexpected errors
  console.error("Unexpected API error:", error);

  // Return generic error for unexpected cases (don't leak details)
  return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
}
