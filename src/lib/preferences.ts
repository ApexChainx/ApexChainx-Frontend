/** ApexChain - User preferences sync between localStorage and remote server */
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { logger } from "@/lib/logger";
import { mutationQueue, registerMutationExecutor } from "@/lib/mutation-queue";

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

// Register preference sync executor with mutation queue
registerMutationExecutor("syncPreferences", async (preferences: UserPreferences) => {
  await api.put(ENDPOINTS.preferences.base, preferences);
});

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

    // Replay any queued preference syncs
    await mutationQueue.replay();

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
    await api.put(ENDPOINTS.preferences.base, currentPreferences);
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      // Definitive auth failure: the refresh flow already ran and the
      // session is gone. Do not queue — clearSession() resets preferences.
      logger.warn("preferences-sync-failed-auth", { status });
      await mutationQueue.remove("sync-preferences");
    } else {
      // Transient failure: queue the payload so it is replayed on the next
      // successful sync or hydration instead of being dropped silently.
      logger.warn("preferences-sync-failed-queued", {
        status,
        message: e instanceof Error ? e.message : String(e),
      });
      await mutationQueue.enqueue({
        idempotencyKey: "sync-preferences",
        type: "syncPreferences",
        payload: currentPreferences,
      });
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
  void mutationQueue.remove("sync-preferences");
  subscribers.forEach((sub) => sub(currentPreferences));
}

export function hasPendingPreferenceSync(): boolean {
  return mutationQueue.hasPending();
}
