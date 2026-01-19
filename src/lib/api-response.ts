import { NextResponse } from "next/server";
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
