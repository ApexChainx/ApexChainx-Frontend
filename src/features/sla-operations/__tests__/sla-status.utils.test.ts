/** ApexChain Frontend Test Suite */
/** Issue #1020 — SLA status normalisation and presentation mappings. */
import { describe, expect, it } from "vitest";

import {
  getSlaStatusLabel,
  getSlaStatusPresentation,
  isSlaMet,
  isSlaViolation,
  normalizeSlaOutcome,
  type SlaOutcome,
} from "@/features/sla-operations/utils/sla-status";

describe("SLA status utilities (#1020)", () => {
  it.each([
    ["met", "met"],
    ["OK", "met"],
    [" pass ", "met"],
    ["passed", "met"],
    ["compliant", "met"],
    ["achieved", "met"],
    ["violated", "violated"],
    ["breach", "violated"],
    ["breached", "violated"],
    ["failed", "violated"],
    ["fail", "violated"],
    ["missed", "violated"],
    ["noncompliant", "violated"],
    ["pending", "pending"],
    ["in progress", "pending"],
    ["calculating", "pending"],
    ["scheduled", "pending"],
    ["disputed", "disputed"],
    ["under-review", "disputed"],
    ["contested", "disputed"],
    ["unknown", "unknown"],
  ] as const)("normalizes %s to %s", (raw, expected) => {
    expect(normalizeSlaOutcome(raw)).toBe(expected);
  });

  it.each([null, undefined, "", "   ", "not-a-status"])(
    "maps unsupported input %s to unknown",
    (raw) => {
      expect(normalizeSlaOutcome(raw)).toBe("unknown");
    },
  );

  it.each([
    ["met", { outcome: "met", label: "Met", state: "success", tone: "positive" }],
    ["violated", { outcome: "violated", label: "Violated", state: "danger", tone: "negative" }],
    ["pending", { outcome: "pending", label: "Pending", state: "info", tone: "neutral" }],
    ["disputed", { outcome: "disputed", label: "Disputed", state: "warning", tone: "caution" }],
    ["unexpected", { outcome: "unknown", label: "Unknown", state: "neutral", tone: "neutral" }],
  ] as const)(
    "returns a stable presentation for %s",
    (raw, expected) => {
      expect(getSlaStatusPresentation(raw)).toEqual(expected);
    },
  );

  it.each([
    ["met", "Met"],
    ["breach", "Violated"],
    ["in-progress", "Pending"],
    ["under review", "Disputed"],
    [null, "Unknown"],
  ] as const)("returns the display label for %s", (raw, expected) => {
    expect(getSlaStatusLabel(raw)).toBe(expected);
  });

  it.each([
    ["passed", true, false],
    ["breached", false, true],
    ["pending", false, false],
    ["unexpected", false, false],
    [null, false, false],
  ] as const)(
    "identifies met and violated outcomes for %s",
    (raw, expectedMet, expectedViolation) => {
      expect(isSlaMet(raw)).toBe(expectedMet);
      expect(isSlaViolation(raw)).toBe(expectedViolation);
    },
  );
});
