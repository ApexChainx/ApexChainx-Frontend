/** Persisted sliding-window limiter for user-initiated logout requests. */

const STORAGE_KEY = "apex_logout_attempts";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readTimestamps(storage: Storage): number[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) && value.every((item) => typeof item === "number")
      ? value
      : [];
  } catch {
    return [];
  }
}

export function checkLogoutRateLimit(now = Date.now()): boolean {
  const storage = getStorage();
  if (!storage) return true;

  const timestamps = readTimestamps(storage).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (timestamps.length >= MAX_ATTEMPTS) return false;

  timestamps.push(now);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // A blocked sessionStorage should not prevent local logout cleanup.
  }
  return true;
}

export function resetLogoutRateLimit(): void {
  getStorage()?.removeItem(STORAGE_KEY);
}