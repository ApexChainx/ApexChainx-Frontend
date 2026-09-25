"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Site name to display title mapping
 *
 * Issue #579 — Extract a single mapping utility with an explicit key type
 * and reserved defaults, import it in both surfaces, and unit test the
 * mapping table.
 *
 * The backend returns `site_name` values (e.g., "site-001", "lagos-core-pop")
 * that need to be displayed as human-readable titles (e.g., "Lagos Core POP").
 * This module centralizes that mapping so the list and dashboard stay in sync.
 */

export type SiteNameKey = string & { readonly __brand: unique symbol };

export interface SiteDisplayConfig {
  /** The raw site_name from the API */
  siteName: string;
  /** Human-readable display title */
  displayTitle: string;
  /** Optional short code for compact display */
  shortCode?: string;
}

/** Central mapping table — update this when sites are added/renamed */
const SITE_DISPLAY_MAP: Record<string, SiteDisplayConfig> = {
  "site-001": { siteName: "site-001", displayTitle: "Lagos Core POP", shortCode: "LCP" },
  "site-002": { siteName: "site-002", displayTitle: "Abuja Edge 3", shortCode: "AE3" },
  "site-003": { siteName: "site-003", displayTitle: "Kano Hub", shortCode: "KNH" },
  "lagos-node-1": { siteName: "lagos-node-1", displayTitle: "Lagos Node 1", shortCode: "LN1" },
  "nairobi-edge-7": { siteName: "nairobi-edge-7", displayTitle: "Nairobi Edge 7", shortCode: "NE7" },
  // Default fallback entries
  "default": { siteName: "default", displayTitle: "Unknown Site", shortCode: "UNK" },
};

/**
 * Get display configuration for a site name
 * @param siteName - The raw site_name from the API
 * @returns SiteDisplayConfig with displayTitle and optional shortCode
 */
export function getSiteDisplay(siteName: string): SiteDisplayConfig {
  const normalized = siteName.toLowerCase().trim();
  return SITE_DISPLAY_MAP[normalized] ?? {
    siteName,
    displayTitle: siteName.charAt(0).toUpperCase() + siteName.slice(1).replace(/-/g, " "),
    shortCode: siteName.slice(0, 3).toUpperCase(),
  };
}

/**
 * Get just the display title for a site name
 * @param siteName - The raw site_name from the API
 * @returns Human-readable display title
 */
export function getSiteDisplayTitle(siteName: string): string {
  return getSiteDisplay(siteName).displayTitle;
}

/**
 * Get just the short code for a site name
 * @param siteName - The raw site_name from the API
 * @returns Short code (3 chars) for compact display
 */
export function getSiteShortCode(siteName: string): string {
  return getSiteDisplay(siteName).shortCode ?? siteName.slice(0, 3).toUpperCase();
}

/**
 * Get all known site display configs (for dropdowns, etc.)
 */
export function getAllSiteDisplays(): SiteDisplayConfig[] {
  return Object.values(SITE_DISPLAY_MAP).filter((s) => s.siteName !== "default");
}

/**
 * Register a new site mapping (for dynamic/runtime registration)
 */
export function registerSiteDisplay(config: SiteDisplayConfig): void {
  SITE_DISPLAY_MAP[config.siteName.toLowerCase().trim()] = config;
}