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
 */
export function parseRetryAfter(headerValue: string | null | undefined): number | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();

  // Try parsing as integer seconds
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && seconds.toString() === trimmed) {
    return seconds * 1000;
  }

  // Try parsing as HTTP-date
  const dateMs = Date.parse(trimmed);
  if (!isNaN(dateMs)) {
    const delay = dateMs - Date.now();
    return delay > 0 ? delay : 0;
  }

  return null;
}

/**
 * Compute backoff delay with full jitter.
 */
export function getBackoffDelay(attempt: number, initialDelayMs = 1000, factor = 2): number {
  const temp = initialDelayMs * Math.pow(factor, attempt);
  // Full Jitter
  return Math.random() * temp;
}

/**
 * Determine whether a failed request is eligible for retry.
 *
 * Requests that override the default timeout with a longer one (e.g. exports
 * and file downloads) are excluded: their failure mode is a slow operation,
 * not transient unavailability, and retrying multiplies the wait — for blob
 * downloads each aborted attempt leaves a partial response.
 */
export function shouldRetry(
  error: AxiosError,
  maxRetries = 3,
  defaultTimeout = 15_000
): boolean {
  const config = error.config as RetryableAxiosRequestConfig | undefined;
  if (!config) return false;

  // Skip long-running requests that opted out of the interactive default
  // timeout. An explicit timeout above the default marks a slow operation
  // that must not be retried.
  if (config.timeout !== undefined && config.timeout > defaultTimeout) {
    return false;
  }

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
