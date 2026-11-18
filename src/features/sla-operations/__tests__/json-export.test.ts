/** ApexChain Frontend Test Suite */
/** Issue #922 — deterministic JSON export payloads. */
import { describe, expect, it } from "vitest";

import {
  buildJsonExport,
  createJsonFileName,
  serializeJsonExport,
  stableSerialize,
} from "@/features/sla-operations/utils/json-export";

describe("JSON export utilities (#922)", () => {
  it("sorts object keys recursively for stable output", () => {
    expect(stableSerialize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(stableSerialize({ z: { d: 1, c: 2 }, a: 3 })).toBe(
      '{"a":3,"z":{"c":2,"d":1}}',
    );
    expect(stableSerialize({ b: 1, a: 2 })).toBe(
      stableSerialize({ a: 2, b: 1 }),
    );
  });

  it("handles arrays, dates and non-finite numbers", () => {
    expect(stableSerialize([1, 2])).toBe("[1,2]");
    expect(stableSerialize({ at: new Date("2026-01-01T00:00:00.000Z") })).toBe(
      '{"at":"2026-01-01T00:00:00.000Z"}',
    );
    expect(stableSerialize({ value: Number.NaN })).toBe('{"value":null}');
  });

  it("rejects circular structures", () => {
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    expect(() => stableSerialize(circular)).toThrow(TypeError);
  });

  it("builds a versioned envelope and deterministic payload", () => {
    const data = { rows: [{ id: "out-1" }] };
    expect(buildJsonExport(data, { source: "outages", generatedAt: "2026-01-01T00:00:00Z" })).toEqual({
      schemaVersion: 1,
      source: "outages",
      generatedAt: "2026-01-01T00:00:00Z",
      data,
    });
    expect(
      serializeJsonExport(data, {
        source: "outages",
        generatedAt: "2026-01-01T00:00:00Z",
      }),
    ).toContain('"schemaVersion":1');
  });

  it("derives safe download file names", () => {
    expect(createJsonFileName("SLA Ops!", "2026-01-15T00:00:00Z")).toBe(
      "sla-ops-2026-01-15.json",
    );
  });
});
