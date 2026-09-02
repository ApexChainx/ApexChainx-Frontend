/** ApexChain - User preferences sync between localStorage and remote server */
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { logger } from "@/lib/logger";

// Define preference types
export interface UserPreferences {
  // Table preferences
  tableDensity?: "comfortable" | "compact" | "default";
  columnVisibility?: Record<string, boolean>;
  // Dashboard filter presets
  outageFilterPresets?: FilterPreset[];
  // Onboarding: set once the first-time operator tour is finished or skipped
  onboardingTourDone?: boolean;
  // Add other preference types here as needed
}

export interface FilterPreset {
  name: string;
  severity?: string;
  status?: string;
}

// Local storage key prefix
const STORAGE_KEY = "apexchain_user_preferences";
// Track if we've already hydrated from server to prevent infinite loops
let isHydrated = false;

// Singleton to track subscribers so we can notify them of changes
type Subscriber = (preferences: UserPreferences) => void;
const subscribers = new Set<Subscriber>();

// Current in-memory preferences
let currentPreferences: UserPreferences = {};

/**
 * Issue #293 — pending preference writes that failed to reach the server.
 *
 * Preference writes are optimistic (localStorage-first, then server sync), so
 * a transient failure used to drop the write silently. Instead, failed PUTs
 * are queued and replayed (oldest-last, so the newest state wins) when:
 * - `updatePreferences` is called again, or
 * - the session recovers (401 refresh) and the retried write succeeds, or
 * - `hydratePreferences` runs on the next page load.
 *
 * Only non-auth failures are queued: a definitive 401/403 means the session
 * is gone and the queued write belongs to a signed-out user — clearSession()
 * resets the whole preferences store in that case anyway.
 */
const pendingSyncQueue = new Set<string>();

export function hasPendingPreferenceSync(): boolean {
  return pendingSyncQueue.size > 0;
}

function queuePendingSync(preferences: UserPreferences): void {
  pendingSyncQueue.add(JSON.stringify(preferences));
}

async function syncToServer(preferences: UserPreferences): Promise<void> {
  await api.put(ENDPOINTS.preferences.base, preferences);
}

/**
 * Replay queued preference writes that previously failed. Called on
 * hydration and after any successful sync so recovery is automatic once
 * the session/backend is reachable again.
 */
async function flushPendingSyncs(): Promise<void> {
  if (pendingSyncQueue.size === 0) return;

  const queued = [...pendingSyncQueue];
  pendingSyncQueue.clear();
  // Replay oldest-last: the last queued state is the most recent one the
  // user saw, so it must win on the server.
  for (const payload of queued) {
    try {
      await api.put(ENDPOINTS.preferences.base, JSON.parse(payload));
    } catch (e) {
      logger.warn("preferences-sync-retry-failed", {
        message: e instanceof Error ? e.message : String(e),
      });
      pendingSyncQueue.add(payload);
      // Stop at the first failure — the session/backend is still down.
      return;
    }
  }
}

// Initialize current preferences from localStorage (fallback)
function loadFromLocalStorage(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as UserPreferences;
    }
  } catch (e) {
    logger.warn("Failed to load preferences from localStorage", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
  return {};
}

// Save preferences to localStorage
function saveToLocalStorage(preferences: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (e) {
    logger.warn("Failed to save preferences to localStorage", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

// Fetch preferences from server (server wins on hydration)
export async function hydratePreferences(): Promise<UserPreferences> {
  if (isHydrated) return currentPreferences;

  try {
    // Fetch remote preferences - server wins.
    // Issue #293: goes through the axios `api` pipeline, so the request
    // carries X-CSRF-Token, can refresh an expired session on 401, and
    // honours the interceptor timeout instead of hanging forever.
    const response = await api.get<UserPreferences>(ENDPOINTS.preferences.base);
    const remotePreferences = response.data ?? {};

    // Merge server preferences into current, overwriting any local values
    currentPreferences = {
      ...loadFromLocalStorage(),
      ...remotePreferences,
    };

    // Save merged preferences back to localStorage
    saveToLocalStorage(currentPreferences);

    // Notify all subscribers of the updated preferences
    subscribers.forEach((sub) => sub(currentPreferences));
    isHydrated = true;

    // The session is clearly alive if we got here — replay anything that
    // failed to sync earlier.
    await flushPendingSyncs();

    return currentPreferences;
  } catch (e) {
    logger.warn("Failed to hydrate preferences from server, falling back to localStorage", {
      status: (e as { response?: { status?: number } })?.response?.status,
      message: e instanceof Error ? e.message : String(e),
    });
    // If server fetch fails, use localStorage as fallback
    currentPreferences = loadFromLocalStorage();
    return currentPreferences;
  }
}

// Update preferences - sync both local and remote
export async function updatePreferences(
  partialPreferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  // Merge new preferences into current
  const updatedPreferences = {
    ...currentPreferences,
    ...partialPreferences,
  };

  // Update in-memory state
  currentPreferences = updatedPreferences;

  // Save to localStorage immediately
  saveToLocalStorage(currentPreferences);

  // Notify subscribers
  subscribers.forEach((sub) => sub(currentPreferences));

  try {
    // This fresh full-state write supersedes any queued snapshots (a PUT
    // replaces the whole preferences object), so drop them instead of
    // replaying redundant requests. Issue #293: through the axios `api`
    // pipeline so the PUT carries X-CSRF-Token (an authed cookie PUT is
    // rejected as CSRF-invalid otherwise) and is retried through the 401
    // refresh flow when the session expired mid-flight.
    pendingSyncQueue.clear();
    await syncToServer(currentPreferences);
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      // Definitive auth failure: the refresh flow already ran and the
      // session is gone. Do not queue — clearSession() resets preferences.
      logger.warn("preferences-sync-failed-auth", { status });
    } else {
      // Transient failure: queue the payload so it is replayed on the next
      // successful sync or hydration instead of being dropped silently.
      logger.warn("preferences-sync-failed-queued", {
        status,
        message: e instanceof Error ? e.message : String(e),
      });
      queuePendingSync(currentPreferences);
    }
  }

  return currentPreferences;
}

// Get current preferences
export function getPreferences(): UserPreferences {
  if (Object.keys(currentPreferences).length === 0) {
    currentPreferences = loadFromLocalStorage();
  }
  return currentPreferences;
}

// Subscribe to preference changes
export function subscribeToPreferences(callback: Subscriber): () => void {
  subscribers.add(callback);
  // Call callback immediately with current preferences
  callback(currentPreferences);

  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
  };
}

// Reset preferences (for logout/clear)
export function resetPreferences(): void {
  currentPreferences = {};
  localStorage.removeItem(STORAGE_KEY);
  isHydrated = false;
  // A signed-out user's unsynced writes belong to the previous account and
  // must not be replayed into the next user's session.
  pendingSyncQueue.clear();
  subscribers.forEach((sub) => sub(currentPreferences));
}
