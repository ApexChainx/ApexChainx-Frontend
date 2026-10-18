"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Status-updates subscription form for the footer (Issue #822).
 *
 * Validation is client-side and inline rather than a round-trip that ends in a
 * generic failure toast: the operator learns immediately, next to the field,
 * whether their address is missing or malformed. `validateEmail` returns a
 * discriminated union, so the error branch cannot be forgotten, and on success
 * it hands back a `ValidatedEmail` — a branded type the submit handler accepts
 * but nothing else can produce.
 */

import { useCallback, useId, useState } from "react";

import { useI18n } from "@/i18n/i18n";
import { useToast } from "@/components/ui/toast";
import { validateEmail, type EmailErrorCode } from "@/components/layout/footer-validation";
import type { ValidatedEmail } from "@/components/layout/footer-types";

export interface FooterSubscribeFormProps {
  /** Persists the subscription. Receives an address that is already validated. */
  onSubscribe: (email: ValidatedEmail) => Promise<void>;
}

type Status = "idle" | "submitting" | "done";

export function FooterSubscribeForm({ onSubscribe }: FooterSubscribeFormProps) {
  const { t } = useI18n();
  const toast = useToast();
  const fieldId = useId();

  const [value, setValue] = useState("");
  const [errorCode, setErrorCode] = useState<EmailErrorCode | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const errorId = `${fieldId}-error`;
  const errorMessage = errorCode ? t(`footer.subscribe.${errorCode}`) : null;

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === "submitting") return;

      const result = validateEmail(value);

      // TypeScript narrows the union here: there is no way to reach `value`
      // without having handled the failure branch.
      if (!result.ok) {
        setErrorCode(result.code);
        return;
      }

      setErrorCode(null);
      setStatus("submitting");

      try {
        await onSubscribe(result.value);
        setStatus("done");
        setValue("");
        toast(t("footer.subscribe.success"), "success");
      } catch {
        // A service failure is not a validation failure: keep what the operator
        // typed so they can retry, and leave the field untouched.
        toast(t("common.loadFailed"), "error");
        setStatus("idle");
      }
    },
    [onSubscribe, status, t, toast, value],
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      data-testid="footer-subscribe-form"
      aria-labelledby={`${fieldId}-title`}
      className="flex min-w-0 flex-col gap-2"
    >
      <p
        id={`${fieldId}-title`}
        className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100"
      >
        {t("footer.subscribe.title")}
      </p>

      <label htmlFor={fieldId} className="sr-only">
        {t("footer.subscribe.label")}
      </label>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
        <input
          id={fieldId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={value}
          placeholder={t("footer.subscribe.placeholder")}
          onChange={(event) => {
            setValue(event.target.value);
            // Clear the error as soon as the operator starts correcting it,
            // rather than making them submit again to find out they fixed it.
            if (errorCode) setErrorCode(null);
          }}
          aria-invalid={errorCode !== null}
          aria-describedby={errorMessage ? errorId : `${fieldId}-hint`}
          className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:outline-blue-400"
        />

        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:focus-visible:outline-blue-400"
        >
          {status === "submitting"
            ? t("footer.subscribe.submitting")
            : t("footer.subscribe.submit")}
        </button>
      </div>

      {errorMessage ? (
        <p id={errorId} role="alert" className="text-xs text-red-700 dark:text-red-300">
          {errorMessage}
        </p>
      ) : (
        <p id={`${fieldId}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {t("footer.subscribe.hint")}
        </p>
      )}
    </form>
  );
}

export default FooterSubscribeForm;