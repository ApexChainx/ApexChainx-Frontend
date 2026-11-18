/** ApexChain Frontend Test Suite */
/** Issue #919 — severity ordering, labels and comparison. */
import { describe, expect, it } from "vitest";

import {
  compareSeverity,
  getSeverityLabel,
  isSeverityAtLeast,
  normalizeSeverity,
  severityRank,
  sortBySeverity,
} from "@/features/sla-operations/utils/severity";

describe("severity utilities (#919)", () => {
  it("normalises aliases case-insensitively", () => {
    expect(normalizeSeverity("HIGH")).toBe("high");
    expect(normalizeSeverity(" urgent ")).toBe("critical");
    expect(normalizeSeverity("moderate")).toBe("medium");
    expect(normalizeSeverity(null)).toBeNull();
    expect(normalizeSeverity("unknown-level")).toBeNull();
  });

  it("provides labels and ranks", () => {
    expect(getSeverityLabel("critical")).toBe("Critical");
    expect(getSeverityLabel("weird")).toBe("Unknown");
    expect(severityRank("low")).toBe(0);
    expect(severityRank("critical")).toBe(3);
    expect(severityRank(null)).toBe(-1);
    expect(compareSeverity("high", "low")).toBeGreaterThan(0);
  });

  it("compares against thresholds", () => {
    expect(isSeverityAtLeast("critical", "high")).toBe(true);
    expect(isSeverityAtLeast("low", "high")).toBe(false);
    expect(isSeverityAtLeast("high", "unknown")).toBe(false);
  });

  it("sorts datasets by severity", () => {
    const items = [{ level: "low" }, { level: "critical" }, { level: "high" }];
    expect(
      sortBySeverity(items, (item) => item.level).map((item) => item.level),
    ).toEqual(["critical", "high", "low"]);
    expect(
      sortBySeverity(items, (item) => item.level, "asc").map(
        (item) => item.level,
      ),
    ).toEqual(["low", "high", "critical"]);
  });
});
