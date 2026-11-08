/**
 * Fixed-window, in-memory rate limiter.
 * LIMITATION: state lives in a single serverless instance, so limits are best-effort and are NOT shared
 * between instances or cold starts. See SECURITY.md. It still blunts bursts and simple abuse.
 */
export interface RateLimitResult { allowed: boolean; remaining: number; retryAfterSec: number }

export class RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly now: () => number = Date.now) {}

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const t = this.now();
    if (this.buckets.size > 5000) for (const [k, v] of this.buckets) if (v.resetAt <= t) this.buckets.delete(k);
    let b = this.buckets.get(key);
    if (!b || b.resetAt <= t) { b = { count: 0, resetAt: t + windowMs }; this.buckets.set(key, b); }
    b.count += 1;
    return { allowed: b.count <= limit, remaining: Math.max(0, limit - b.count), retryAfterSec: Math.ceil((b.resetAt - t) / 1000) };
  }
}
