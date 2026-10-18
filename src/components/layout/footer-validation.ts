/** ApexChain Network Operations Intelligence Platform */
/**
 * Email validation for the footer's status-updates form (Issue #822).
 *
 * The form had no validation at all: an empty or malformed address was posted
 * straight to the API, the operator saw a generic failure toast, and the reason
 * was never surfaced inline. They had no way to tell a typo in their address
 * from a genuinely broken subscription service.
 *
 * `validateEmail` is a pure function returning a **discriminated union**, so the
 * caller cannot forget to handle the failure case: TypeScript will not let the
 * `error` branch be read without narrowing first. On success it returns a
 * {@link ValidatedEmail}, a branded type that cannot be produced any other way —
 * so the submit handler physically cannot receive an address that was never
 * checked.
 */

import type { ValidatedEmail } from "@/components/layout/footer-types";

/** Longest address the API accepts. */
export const MAX_EMAIL_LENGTH = 254;

/**
 * Single `@`, a non-empty local part with no whitespace, and a dotted domain
 * whose TLD is at least two letters.
 *
 * Deliberately not an attempt to implement RFC 5322 — the address is verified by
 * the confirmation email it triggers. This rejects the mistakes people actually
 * make (missing `@`, trailing dot, missing TLD, spaces) and nothing stricter,
 * so it never rejects an address that would actually have worked.
 */
const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

/** Which validation rule failed, so the message can be localized per rule. */
export type EmailErrorCode = "required" | "invalid";

/** The outcome of validating a raw form value. */
export type EmailValidationResult =
  | { readonly ok: true; readonly value: ValidatedEmail; readonly code?: never }
  | { readonly ok: false; readonly code: EmailErrorCode; readonly value?: never };

/** Trim surrounding whitespace; form input frequently arrives padded. */
export function normaliseEmail(raw: string): string {
  return raw.trim();
}

/**
 * Validate a raw address.
 *
 * Order matters: an empty value is `required`, not `invalid`, so the operator is
 * told what is missing rather than that what they typed is malformed.
 */
export function validateEmail(raw: string): EmailValidationResult {
  const value = normaliseEmail(raw);

  if (value.length === 0) {
    return { ok: false, code: "required" };
  }

  if (value.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(value)) {
    return { ok: false, code: "invalid" };
  }

  // The brand is a compile-time fiction; this cast is where the guarantee is
  // actually earned.
  return { ok: true, value: value as ValidatedEmail };
}

/** True when the address has already been validated. Used by the type system. */
export function isValidatedEmail(value: unknown): value is ValidatedEmail {
  return typeof value === "string" && validateEmail(value).ok;
}