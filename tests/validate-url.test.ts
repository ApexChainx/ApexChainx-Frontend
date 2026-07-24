/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect } from "vitest";
import { validateUrl } from "@/lib/validate-url";

describe("validate-url", () => {
  it("allows valid HTTPS URLs", () => {
    expect(validateUrl("https://example.com")).toEqual({ valid: true });
    expect(validateUrl("https://api.example.com/webhook")).toEqual({ valid: true });
  });

  it("allows valid HTTP URLs", () => {
    expect(validateUrl("http://example.com")).toEqual({ valid: true });
  });

  it("rejects invalid URL format", () => {
    expect(validateUrl("not-a-url")).toEqual({ valid: false, reason: "Invalid URL format" });
    expect(validateUrl("")).toEqual({ valid: false, reason: "Invalid URL format" });
  });

  it("rejects non-HTTP protocols", () => {
    expect(validateUrl("ftp://example.com")).toEqual({ valid: false, reason: "Only HTTP(S) URLs are allowed" });
    expect(validateUrl("javascript:alert(1)")).toEqual({ valid: false, reason: "Only HTTP(S) URLs are allowed" });
  });

  it("rejects localhost", () => {
    expect(validateUrl("http://localhost")).toEqual({ valid: false, reason: "Requests to localhost/internal addresses are not allowed" });
    expect(validateUrl("http://127.0.0.1")).toEqual({ valid: false, reason: "Requests to localhost/internal addresses are not allowed" });
  });

  it("rejects private IPs", () => {
    expect(validateUrl("http://10.0.0.1")).toEqual({ valid: false, reason: "Requests to private/internal networks are not allowed" });
    expect(validateUrl("http://192.168.1.1")).toEqual({ valid: false, reason: "Requests to private/internal networks are not allowed" });
    expect(validateUrl("http://172.16.0.1")).toEqual({ valid: false, reason: "Requests to private/internal networks are not allowed" });
  });

  it("rejects metadata endpoints", () => {
    expect(validateUrl("http://169.254.169.254")).toEqual({ valid: false, reason: "Requests to private/internal networks are not allowed" });
  });
});
