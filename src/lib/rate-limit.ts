/** ApexChain - Network Operations Intelligence Platform */

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if an action is rate-limited.
 * Uses a sliding window algorithm.
 *
 * @param key - Unique identifier for the action
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if the action is allowed, false if rate-limited
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key) ?? { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (entry.timestamps.length >= maxAttempts) {
    return false;
  }

  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);
  return true;
}

/**
 * Reset rate limit for a key.
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get remaining attempts before rate limit is hit.
 */
export function getRemainingAttempts(
  key: string,
  maxAttempts: number,
  windowMs: number
): number {
  const now = Date.now();
  const entry = rateLimitStore.get(key) ?? { timestamps: [] };
  const validTimestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
  return Math.max(0, maxAttempts - validTimestamps.length);
}

/* -------------------------------------------------------------------------- */
/* Submit throttling with exponential backoff (issue #528)                    */
/* -------------------------------------------------------------------------- */

interface ThrottleEntry {
  lastAttemptAt: number;
  consecutiveFailures: number;
}

const throttleStore = new Map<string, ThrottleEntry>();

/** Cap for the exponential failure backoff so a wedged client still recovers. */
const MAX_BACKOFF_FAILURES = 8;
const MAX_BACKOFF_DELAY_MS = 60_000;

export interface ThrottleDecision {
  allowed: boolean;
  /** How long the caller must wait before retrying (0 when allowed). */
  retryAfterMs: number;
}

/**
 * Enforces a minimum interval between consecutive attempts for `key`.
 * Records the attempt when allowed so rapid successive submits are spaced
 * at least `minIntervalMs` apart, mirroring the logout rate-limit pattern.
 */
export function checkThrottle(
  key: string,
  minIntervalMs: number
): ThrottleDecision {
  const now = Date.now();
  const entry = throttleStore.get(key);

  if (!entry) {
    throttleStore.set(key, { lastAttemptAt: now, consecutiveFailures: 0 });
    return { allowed: true, retryAfterMs: 0 };
  }

  const elapsed = now - entry.lastAttemptAt;
  if (elapsed < minIntervalMs) {
    return { allowed: false, retryAfterMs: minIntervalMs - elapsed };
  }

  entry.lastAttemptAt = now;
  throttleStore.set(key, entry);
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Registers a failed attempt against `key` and pushes `lastAttemptAt` into
 * the future by an exponential delay (base 2). Returns the delay that the
 * caller should surface before allowing the next attempt.
 */
export function noteThrottleFailure(key: string, baseDelayMs: number): number {
  const entry = throttleStore.get(key) ?? { lastAttemptAt: 0, consecutiveFailures: 0 };

  entry.consecutiveFailures = Math.min(
    entry.consecutiveFailures + 1,
    MAX_BACKOFF_FAILURES
  );

  const delayMs = Math.min(
    baseDelayMs * 2 ** (entry.consecutiveFailures - 1),
    MAX_BACKOFF_DELAY_MS
  );

  entry.lastAttemptAt = Date.now() + delayMs;
  throttleStore.set(key, entry);
  return delayMs;
}

/**
 * Clears throttle state for `key` after a successful attempt so the client
 * does not carry penalty backoff into a healthy streak.
 */
export function resetThrottle(key: string): void {
  throttleStore.delete(key);
}