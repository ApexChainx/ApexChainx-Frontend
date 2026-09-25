/** ApexChain Network Operations Intelligence Platform */
import { describe, expect, it } from "vitest";

import { getSiteDisplay, getSiteDisplayTitle, getSiteShortCode, getAllSiteDisplays } from "@/lib/site-display";

describe("site-display", () => {
  it("returns known site display config", () => {
    const config = getSiteDisplay("site-001");
    expect(config.siteName).toBe("site-001");
    expect(config.displayTitle).toBe("Lagos Core POP");
    expect(config.shortCode).toBe("LCP");
  });

  it("returns known site display for lagos-node-1", () => {
    const config = getSiteDisplay("lagos-node-1");
    expect(config.displayTitle).toBe("Lagos Node 1");
    expect(config.shortCode).toBe("LN1");
  });

  it("returns fallback for unknown site", () => {
    const config = getSiteDisplay("unknown-site-123");
    expect(config.siteName).toBe("unknown-site-123");
    expect(config.displayTitle).toBe("Unknown-site-123");
    expect(config.shortCode).toBe("UNK");
  });

  it("getSiteDisplayTitle returns display title", () => {
    expect(getSiteDisplayTitle("site-001")).toBe("Lagos Core POP");
    expect(getSiteDisplayTitle("unknown")).toBe("Unknown");
  });

  it("getSiteShortCode returns short code", () => {
    expect(getSiteShortCode("site-001")).toBe("LCP");
    expect(getSiteShortCode("unknown")).toBe("UNK");
  });

  it("getAllSiteDisplays returns all known sites", () => {
    const all = getAllSiteDisplays();
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((s) => s.siteName !== "default")).toBe(true);
  });

  it("handles case-insensitive lookup", () => {
    const config = getSiteDisplay("SITE-001");
    expect(config.displayTitle).toBe("Lagos Core POP");
  });

  it("handles whitespace", () => {
    const config = getSiteDisplay("  site-001  ");
    expect(config.displayTitle).toBe("Lagos Core POP");
  });
});