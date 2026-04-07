/**
 * In-memory rate limiter.
 *
 * ⚠️  SERVERLESS LIMITATION: On Vercel / serverless environments, this Map
 * resets on every cold start. It is effective against burst attacks within
 * a single function instance, but not across instances.
 *
 * For production-grade rate limiting across all instances, replace this
 * with a Redis-backed solution (e.g. Upstash Redis with @upstash/ratelimit).
 *
 * Until then, this provides meaningful protection against naive brute-force
 * attempts and is better than nothing.
 */

const attempts = new Map<string, { count: number; resetTime: number }>()

/**
 * Check if a key is within the allowed rate limit.
 * @param key        — unique identifier, e.g. `eligibility:${ip}` or `verify:${ip}:${capNumber}`
 * @param maxAttempts — max attempts allowed in the window (default: 5)
 * @param windowMs   — time window in ms (default: 1 hour)
 * @returns true if allowed, false if blocked
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60 * 60 * 1000
): boolean {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now > record.resetTime) {
    attempts.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxAttempts) {
    return false
  }

  record.count++
  return true
}

/**
 * Manually reset a key — call this after a successful action
 * so legitimate users aren't blocked after e.g. account creation.
 */
export function resetRateLimit(key: string): void {
  attempts.delete(key)
}
