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
  });
});
