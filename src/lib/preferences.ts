/** ApexChain - User preferences sync between localStorage and remote server */
import { apiClient } from "@/lib/client";
import { ENDPOINTS } from "@/lib/endpoints";

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

// Initialize current preferences from localStorage (fallback)
function loadFromLocalStorage(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as UserPreferences;
    }
  } catch (e) {
    console.warn("Failed to load preferences from localStorage", e);
  }
  return {};
}

// Save preferences to localStorage
function saveToLocalStorage(preferences: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (e) {
    console.warn("Failed to save preferences to localStorage", e);
  }
}

// Fetch preferences from server (server wins on hydration)
export async function hydratePreferences(): Promise<UserPreferences> {
  if (isHydrated) return currentPreferences;
  
  try {
    // Fetch remote preferences - server wins
    const remotePreferences = await apiClient(ENDPOINTS.preferences.base, {
      method: "GET",
    });
    
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
    
    return currentPreferences;
  } catch (e) {
    console.warn("Failed to hydrate preferences from server, falling back to localStorage", e);
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
    // Sync with server in the background
    await apiClient(ENDPOINTS.preferences.base, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedPreferences),
    });
  } catch (e) {
    console.warn("Failed to sync preferences to server, will retry on next hydration", e);
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
  subscribers.forEach((sub) => sub(currentPreferences));
}