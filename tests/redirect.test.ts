/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect } from "vitest";
import {
  isSafeRedirect,
  sanitizeRedirect,
  getSafeDefault,
} from "@/lib/auth/redirect";

describe("isSafeRedirect", () => {
  describe("rejects attack payloads", () => {
    it.each<[string, boolean]>([
      // Protocol-relative URLs
      ["//evil.example/phish", false],
      ["//evil.com", false],
      ["///evil.com", false],
      // Backslash variants that URL parsers normalize to "//"
      ["/\\evil.example", false],
      ["\\evil.example", false],
      // Scheme-based payloads
      ["javascript:alert(1)", false],
      ["data:text/html,<script>alert(1)</script>", false],
      ["vbscript:msgbox(1)", false],
      ["https://evil.example/", false],
      ["http://evil.example/phish", false],
      // Control characters (literal and percent-encoded)
      ["/%0d%0aLocation:%20//evil.example", false],
      ["/login%0d%0aLocation:%20//evil", false],
      ["/\u0000evil", false],
      // Auth-loop targets
      ["/login", false],
      ["/register", false],
      ["/login.evil.example", false],
      // Not a relative path at all
      ["", false],
      ["  /payments", false],
    ])("rejects %j", (value, expected) => {
      expect(isSafeRedirect(value)).toBe(expected);
    });
  });

  describe("accepts legitimate in-app paths", () => {
    it.each<[string, boolean]>([
      ["/dashboard", true],
      ["/payments", true],
      ["/payments?page=2", true],
      ["/outages/123", true],
      ["/outages/123?tab=history", true],
      ["/settings#security", true],
      ["/sla/config", true],
    ])("accepts %j", (value, expected) => {
      expect(isSafeRedirect(value)).toBe(expected);
    });
  });
});

describe("sanitizeRedirect", () => {
  it("falls back to the safe default for missing values", () => {
    expect(sanitizeRedirect()).toBe(getSafeDefault());
    expect(sanitizeRedirect(null)).toBe(getSafeDefault());
    expect(sanitizeRedirect(undefined)).toBe(getSafeDefault());
  });

  it("falls back to the safe default for unsafe values", () => {
    expect(sanitizeRedirect("//evil.example/phish")).toBe(getSafeDefault());
    expect(sanitizeRedirect("/\\evil.example")).toBe(getSafeDefault());
    expect(sanitizeRedirect("javascript:alert(1)")).toBe(getSafeDefault());
    expect(sanitizeRedirect("/login")).toBe(getSafeDefault());
  });

  it("keeps safe in-app paths unchanged", () => {
    expect(sanitizeRedirect("/payments")).toBe("/payments");
    expect(sanitizeRedirect("/outages/123")).toBe("/outages/123");
  getSafeDefault,
  isSafeRedirect,
  sanitizeRedirect,
} from "@/lib/auth/redirect";

/**
 * Known-good routes, mirroring the Next.js app router tree in `src/app/`
 * plus the nested link used by the Navigation component.
 * If a route is renamed or removed, update it here — this table is what
 * keeps the redirect fallback honest (issue #312).
 */
const KNOWN_ROUTES = [
  "/", // dashboard (src/app/page.tsx)
  "/login",
  "/register",
  "/outages",
  "/payments",
  "/payments/retry-queue", // linked from Navigation
  "/webhooks",
  "/config",
  "/setting",
  "/bulk-import",
];

describe("auth/redirect — safe default", () => {
  it("falls back to `/` for absent redirects", () => {
    expect(sanitizeRedirect(undefined)).toBe("/");
    expect(sanitizeRedirect(null)).toBe("/");
    expect(sanitizeRedirect()).toBe(getSafeDefault());
  });

  it("falls back to `/` for unsafe redirects", () => {
    expect(sanitizeRedirect("https://evil.example.com")).toBe("/");
    expect(sanitizeRedirect("//evil.example.com")).toBe("/");
    expect(sanitizeRedirect("javascript:alert(1)")).toBe("/");
  });

  it("keeps safe redirects untouched", () => {
    expect(sanitizeRedirect("/outages")).toBe("/outages");
    expect(sanitizeRedirect("/payments/retry-queue")).toBe(
      "/payments/retry-queue"
    );
  });

  it("never sends users to /login or /register (auth loops)", () => {
    expect(isSafeRedirect("/login")).toBe(false);
    expect(isSafeRedirect("/register")).toBe(false);
    expect(sanitizeRedirect("/login?next=/outages")).toBe("/");
  });
});

describe("auth/redirect — fallback is a real route (issue #312)", () => {
  it("default matches a known-good route in the app", () => {
    expect(KNOWN_ROUTES).toContain(getSafeDefault());
  });

  it("default agrees with Navigation: the dashboard is rendered at `/`", () => {
    // src/components/Navigation.tsx links the dashboard via href="/"
    expect(getSafeDefault()).toBe("/");
    expect(getSafeDefault()).not.toBe("/dashboard");
  });
});
