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
