import { describe, expect, it } from "vitest";

import { MTTR_VALIDATION_ERROR, parseMttrInput } from "@/lib/mttr";

describe("parseMttrInput", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    ["0", 0],
    ["0.5", 0.5],
    [" 60 ", 60],
    ["120", 120],
  ])("accepts an explicitly typed value %p as %p", (input, expected) => {
    expect(parseMttrInput(input)).toBe(expected);
  });

  it("accepts a literal zero when it is intended", () => {
    expect(parseMttrInput("0")).toBe(0);
  });

  it.each([[""], ["   "], ["\t"], ["\n"]])(
    "rejects an empty or whitespace input %p",
    (input) => {
      expect(parseMttrInput(input)).toBeNull();
    },
  );

  it.each([["-1"], ["-0.5"], ["abc"], ["12abc"], ["1e"], ["NaN"], ["Infinity"]])(
    "rejects a non-numeric or negative input %p",
    (input) => {
      expect(parseMttrInput(input)).toBeNull();
    },
  );

  it("exposes the shared validation message", () => {
    expect(MTTR_VALIDATION_ERROR).toBe("MTTR must be a non-negative number.");
  });
});
