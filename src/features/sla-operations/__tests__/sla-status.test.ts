/** ApexChain Frontend Test Suite */
/** Issue #916 — SLA status normalisation and presentation mapping. */
import { describe, expect, it } from "vitest";

import {
  getSlaStatusLabel,
  getSlaStatusPresentation,
  isSlaMet,
  isSlaViolation,
  normalizeSlaOutcome,
} from "@/features/sla-operations/utils/sla-status";

describe("SLA status utilities (#916)", () => {
  it("normalises aliases case-insensitively", () => {
    expect(normalizeSlaOutcome("MET")).toBe("met");
    expect(normalizeSlaOutcome(" passed ")).toBe("met");
    expect(normalizeSlaOutcome("breached")).toBe("violated");
    expect(normalizeSlaOutcome("under review")).toBe("disputed");
    expect(normalizeSlaOutcome("in-progress")).toBe("pending");
  });

  it("maps unknown and nullish values to the unknown outcome", () => {
    expect(normalizeSlaOutcome("something-else")).toBe("unknown");
    expect(normalizeSlaOutcome(null)).toBe("unknown");
    expect(normalizeSlaOutcome(undefined)).toBe("unknown");
  });

  it("returns a full presentation model", () => {
    expect(getSlaStatusPresentation("violated")).toEqual({
      outcome: "violated",
      label: "Violated",
      state: "danger",
      tone: "negative",
    });
    expect(getSlaStatusPresentation("disputed").tone).toBe("caution");
  });

  it("provides labels and predicates", () => {
    expect(getSlaStatusLabel("ok")).toBe("Met");
    expect(isSlaViolation("breach")).toBe(true);
    expect(isSlaViolation("met")).toBe(false);
    expect(isSlaMet("passed")).toBe(true);
    expect(isSlaMet(null)).toBe(false);
  });
});
