/** Typed API error. `code` is stable and machine-readable; `message` is safe to show to developers. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: Record<string, unknown>, code = 'invalid_request') =>
  new ApiError(400, code, message, details);
export const unauthorized = (message = 'Authentication required.', code = 'unauthorized') =>
  new ApiError(401, code, message);
export const forbidden = (message = 'You do not have access to this resource.', code = 'forbidden') =>
  new ApiError(403, code, message);
export const notFound = (what = 'Resource') => new ApiError(404, 'not_found', `${what} not found.`);
export const conflict = (code: string, message: string, details?: Record<string, unknown>) =>
  new ApiError(409, code, message, details);
export const unprocessable = (code: string, message: string) => new ApiError(422, code, message);
export const tooMany = (retryAfterSec: number) =>
  new ApiError(429, 'rate_limited', 'Too many requests. Please slow down.', { retry_after_seconds: retryAfterSec });
export const unavailable = (message = 'Service temporarily unavailable. Please retry shortly.', code = 'service_unavailable') =>
  new ApiError(503, code, message);

/**
 * Converts any thrown value into a safe HTTP status + JSON body.
 * Unknown errors never leak their message or stack trace.
 * Firestore gRPC codes: 8 = RESOURCE_EXHAUSTED (quota), 14 = UNAVAILABLE, 4 = DEADLINE_EXCEEDED.
 */
export function toErrorResponse(err: unknown): { status: number; body: { error: { code: string; message: string; details?: Record<string, unknown> } } } {
  if (err instanceof ApiError) {
    return { status: err.status, body: { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } } };
  }
  const code = (err as { code?: unknown } | null)?.code;
  if (code === 8 || code === 'resource-exhausted') {
    return { status: 429, body: { error: { code: 'quota_exceeded', message: 'The free-tier database quota has been reached. Try again later.' } } };
  }
  if (code === 14 || code === 4 || code === 'unavailable' || code === 'deadline-exceeded') {
    return { status: 503, body: { error: { code: 'service_unavailable', message: 'The data service is temporarily unavailable. Please retry.' } } };
  }
  return { status: 500, body: { error: { code: 'internal_error', message: 'An unexpected error occurred.' } } };
}
