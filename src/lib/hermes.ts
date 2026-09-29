/** ApexChain - Hermes Backoff & Retry Engine */

import type { AxiosError, AxiosRequestConfig } from "axios";

interface RetryableAxiosRequestConfig extends AxiosRequestConfig {
  _retryCount?: number;
}

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  factor?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  factor: 2,
};

/**
 * Parse the Retry-After header.
 * Can be an integer (seconds) or an HTTP-date.
 * Returns millisecond delay or null if unparseable/absent.
 *
 * Never returns a value that is not a finite, non-negative number: a
 * malformed header (or a negative "retry immediately" hint) must not leak a
 * `NaN`/negative delay into the retry scheduling path.
 */
export function parseRetryAfter(headerValue: string | null | undefined): number | null {
  if (headerValue == null) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;

  // Integer seconds — the canonical Retry-After form (optionally signed, so we
  // can explicitly clamp a negative hint to zero instead of sleeping backwards).
  if (/^[+-]?\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds)) return null;
    return Math.max(0, seconds * 1000);
  }

  // Try parsing as HTTP-date. Only strings that actually look like one (they
  // carry a weekday/month abbreviation) are worth parsing: `Date.parse` is
  // lenient enough to coerce values such as "1.5" into a bogus timestamp,
  // which would otherwise leak a silent "retry now" instead of null.
  if (/[A-Za-z]{3}/.test(trimmed)) {
    const dateMs = Date.parse(trimmed);
    if (!Number.isNaN(dateMs)) {
      const delay = dateMs - Date.now();
      return delay > 0 ? delay : 0;
    }
  }

  return null;
}

/** Default ceiling for a single backoff delay (30s). */
export const DEFAULT_MAX_BACKOFF_MS = 30_000;

/**
 * Compute backoff delay with full jitter.
 *
 * The exponential window is capped at `maxDelayMs` *before* jitter is applied,
 * so a sustained failure can never schedule an unbounded sleep. Non-finite or
 * negative attempts are treated as the first attempt to avoid `NaN` sleeps and
 * sub-millisecond retry storms.
 */
export function getBackoffDelay(
  attempt: number,
  initialDelayMs = 1000,
  factor = 2,
  maxDelayMs = DEFAULT_MAX_BACKOFF_MS,
): number {
  const safeAttempt = Number.isFinite(attempt) && attempt > 0 ? attempt : 0;
  const exponential = initialDelayMs * Math.pow(factor, safeAttempt);
  const capped = Math.min(exponential, maxDelayMs);
  // Full Jitter across [0, capped]
  return Math.random() * capped;
}

/**
 * Determine whether a failed request is eligible for retry.
 */
export function shouldRetry(
  error: AxiosError,
  maxRetries = 3
): boolean {
  const config = error.config as RetryableAxiosRequestConfig | undefined;
  if (!config) return false;

  // Only retry GET requests (idempotent reads)
  const method = config.method?.toUpperCase();
  if (method !== "GET") return false;

  // Check current retry count
  const attempt = config._retryCount ?? 0;
  if (attempt >= maxRetries) return false;

  const status = error.response?.status;

  // Retry on 5xx, 429, or network error (no response)
  if (!status || (status >= 500 && status < 600) || status === 429) {
    return true;
  }

  return false;
}
