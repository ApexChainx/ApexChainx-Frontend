/** ApexChain Network Operations Intelligence Platform */
import { describe, expect, it } from "vitest";
import { locToField, normalizeApiError } from "@/lib/errors";

describe("locToField", () => {
  it("maps a body loc to its form-field key", () => {
    expect(locToField(["body", "site_name"])).toBe("site_name");
  });

  it("maps a query loc to its parameter key", () => {
    expect(locToField(["query", "date_from"])).toBe("date_from");
  });

  it("joins nested body segments with a dot", () => {
    expect(locToField(["body", "affected", "site_name"])).toBe("affected.site_name");
  });

  it("returns null for a source-only or empty loc", () => {
    expect(locToField(["body"])).toBeNull();
    expect(locToField(undefined)).toBeNull();
  });
});

describe("normalizeApiError — 422 field errors", () => {
  const bodyDetail = [
    { loc: ["body", "site_name"], msg: "String should have at least 1 character", type: "string_too_short" },
    { loc: ["body", "description"], msg: "String should have at least 1 character", type: "string_too_short" },
  ];

  it("derives a field-keyed error map from a FastAPI 422 detail array", () => {
    const err = normalizeApiError({
      response: {
        status: 422,
        data: { detail: bodyDetail },
      },
    });

    expect(err.kind).toBe("validation");
    expect(err.fieldErrors).toEqual({
      site_name: ["String should have at least 1 character"],
      description: ["String should have at least 1 character"],
    });
  });

  it("still produces the flattened message alongside the field map", () => {
    const err = normalizeApiError({
      response: {
        status: 422,
        data: { detail: bodyDetail },
      },
    });

    expect(err.message).toBe(
      "String should have at least 1 character; String should have at least 1 character"
    );
  });

  it("maps query segments to their parameter keys", () => {
    const err = normalizeApiError({
      response: {
        status: 422,
        data: {
          detail: [{ loc: ["query", "date_from"], msg: "Input should be a valid date", type: "date_parsing" }],
        },
      },
    });

    expect(err.fieldErrors).toEqual({ date_from: ["Input should be a valid date"] });
  });

  it("groups multiple messages for the same field", () => {
    const err = normalizeApiError({
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ["body", "site_id"], msg: "String should have at most 64 characters", type: "string_too_long" },
            { loc: ["body", "site_id"], msg: "Input should match pattern", type: "string_pattern_mismatch" },
          ],
        },
      },
    });

    expect(err.fieldErrors).toEqual({
      site_id: [
        "String should have at most 64 characters",
        "Input should match pattern",
      ],
    });
  });
});

describe("normalizeApiError — message fallback", () => {
  it("uses the string detail and leaves fieldErrors undefined for non-array details", () => {
    const err = normalizeApiError({
      response: {
        status: 400,
        data: { detail: "Site name is required" },
      },
    });

    expect(err.message).toBe("Site name is required");
    expect(err.fieldErrors).toBeUndefined();
  });

  it("falls back to the response message when there is no detail", () => {
    const err = normalizeApiError({
      response: {
        status: 500,
        data: { message: "Internal server error" },
      },
    });

    expect(err.message).toBe("Internal server error");
    expect(err.fieldErrors).toBeUndefined();
  });

  it("falls back to a generic message for a bare error", () => {
    const err = normalizeApiError(new Error("Network failure"));
    expect(err.message).toBe("Network failure");
    expect(err.fieldErrors).toBeUndefined();
    expect(err.kind).toBe("unknown");
  });
});
