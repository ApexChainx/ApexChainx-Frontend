/** ApexChain Network Operations Intelligence Platform */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateCsrfToken, getCookie } from "@/lib/csrf";

/**
 * `getCookie` reads `document.cookie`, which browsers serialize as one
 * `"; "`-joined header. jsdom's own cookie setter normalizes and validates
 * whatever is assigned to it, so these tests stub the `cookie` getter and
 * replay the exact header strings a server, an attribute-laden `Set-Cookie`,
 * or a malformed proxy response can hand us.
 */
let originalCookie: PropertyDescriptor | undefined;

function setCookieHeader(header: string): void {
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => header,
  });
}

beforeEach(() => {
  originalCookie = Object.getOwnPropertyDescriptor(document, "cookie");
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalCookie) {
    Object.defineProperty(document, "cookie", originalCookie);
  } else {
    Reflect.deleteProperty(document, "cookie");
  }
});

describe("getCookie", () => {
  describe("extracts the token from", () => {
    const cases: Array<{ name: string; header: string; expected: string }> = [
      {
        name: "a single-cookie header",
        header: "apex_csrf=token-123",
        expected: "token-123",
      },
      {
        name: "the first entry of a multi-cookie header",
        header: "apex_csrf=t1; session=abc; theme=dark",
        expected: "t1",
      },
      {
        name: "the last entry of a multi-cookie header",
        header: "session=abc; theme=dark; apex_csrf=t2",
        expected: "t2",
      },
      {
        name: "a middle entry of a multi-cookie header",
        header: "session=abc; apex_csrf=t3; theme=dark",
        expected: "t3",
      },
      {
        name: "a value that itself contains '='",
        header: "apex_csrf=a=b=c",
        expected: "a=b=c",
      },
      {
        name: "a base64-style value containing padding '='",
        header: `apex_csrf=${encodeURIComponent("YWJjZA==")}`,
        expected: "YWJjZA==",
      },
      {
        name: "a percent-encoded value",
        header: "apex_csrf=abc%20def",
        expected: "abc def",
      },
      {
        name: "a value holding an encoded cookie separator",
        header: `apex_csrf=${encodeURIComponent("a;b")}`,
        expected: "a;b",
      },
      {
        name: "an empty value",
        header: "apex_csrf=",
        expected: "",
      },
      {
        name: "a header carrying trailing cookie attributes",
        header: "apex_csrf=tok; Path=/; HttpOnly; Secure; SameSite=Lax",
        expected: "tok",
      },
      {
        name: "a header where a longer name merely starts with the target",
        header: "xapex_csrf=nope; apex_csrf=yes",
        expected: "yes",
      },
    ];

    it.each(cases)("$name", ({ header, expected }) => {
      setCookieHeader(header);
      expect(getCookie("apex_csrf")).toBe(expected);
    });

    it("returns the first value when the name is duplicated", () => {
      setCookieHeader("apex_csrf=first; apex_csrf=second");
      expect(getCookie("apex_csrf")).toBe("first");
    });
  });

  describe("returns null when the cookie is absent", () => {
    const cases: Array<{ name: string; header: string }> = [
      { name: "the header is empty", header: "" },
      { name: "only other cookies are present", header: "session=abc; theme=dark" },
      { name: "a longer name has the target as a prefix", header: "apex_csrf_extra=abc" },
      { name: "the name only appears inside a value", header: "other=apex_csrf" },
      { name: "the entry has no '=' separator", header: "apex_csrf" },
    ];

    it.each(cases)("$name", ({ header }) => {
      setCookieHeader(header);
      expect(getCookie("apex_csrf")).toBeNull();
    });
  });

  describe("malformed percent-encoding", () => {
    it.each([
      { name: "a bare trailing '%'", header: "apex_csrf=abc%", expected: "abc%" },
      { name: "an invalid escape sequence", header: "apex_csrf=%zz", expected: "%zz" },
      { name: "an incomplete multi-byte sequence", header: "apex_csrf=%E0%A4%A", expected: "%E0%A4%A" },
      {
        name: "a well-formed escape still decodes",
        header: "apex_csrf=100%25",
        expected: "100%",
      },
    ])("$name", ({ header, expected }) => {
      // A URIError here would propagate out of the request interceptor and
      // break every subsequent request, so parsing must never throw.
      setCookieHeader(header);
      expect(() => getCookie("apex_csrf")).not.toThrow();
      expect(getCookie("apex_csrf")).toBe(expected);
    });
  });

  it("returns null when there is no document (SSR)", () => {
    vi.stubGlobal("document", undefined);
    expect(getCookie("apex_csrf")).toBeNull();
  });
});

describe("generateCsrfToken", () => {
  it("mints a 64-character lowercase-hex token (backend contract)", () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates a fresh token on every call", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateCsrfToken()));
    expect(tokens.size).toBe(50);
  });
});
