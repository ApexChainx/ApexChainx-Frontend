/** ApexChain - Network Operations Intelligence Platform */
"use client";

import { useState, useCallback } from "react";
import { ConfirmDialog } from "@/components/payments/ConfirmDialog";
import { generateWebhookSecret, maskSecret } from "@/lib/webhook-secret";

interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
}

interface WebhookSettingsProps {
  initialConfig?: WebhookConfig;
  onSave?: (config: WebhookConfig) => void;
}

/**
 * Phrase an operator must type before an existing secret is rotated
 * (issue #602). Rotating is irreversible for consumers: every service still
 * verifying signatures with the old key starts failing immediately, so the
 * action needs the same explicit gate as other destructive payments flows.
 */
export const REGENERATE_SECRET_PHRASE = "regenerate secret";

/**
 * Outcome of the last clipboard write. The copy button and the polite live
 * region both read this so the operator gets an explicit confirmation instead
 * of having to guess whether the secret reached the clipboard (issue #600).
 */
type CopyState = "idle" | "copied" | "failed";

const COPY_FEEDBACK_MS = 2000;

export default function WebhookSettings({ initialConfig, onSave }: WebhookSettingsProps) {
  const [config, setConfig] = useState<WebhookConfig>(initialConfig ?? { url: "", secret: "", events: [] });
  const [showSecret, setShowSecret] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const rotateSecret = useCallback(() => {
    setConfig((prev) => ({ ...prev, secret: generateWebhookSecret() }));
  }, []);

  // Generating the first secret is safe. Rotating one that is already in use
  // invalidates every consumer still verifying with it, so route that through
  // an explicit confirmation instead of overwriting silently.
  const handleGenerateClick = useCallback(() => {
    if (config.secret) {
      setShowRegenerateConfirm(true);
      return;
    }
    rotateSecret();
  }, [config.secret, rotateSecret]);

  const confirmRegenerate = useCallback(() => {
    rotateSecret();
    setShowRegenerateConfirm(false);
  }, [rotateSecret]);

  const copySecret = useCallback(async () => {
    const secret = config.secret;
    let ok = false;

    try {
      await navigator.clipboard.writeText(secret);
      ok = true;
    } catch {
      // The async clipboard API is unavailable outside secure contexts (plain
      // HTTP) and can be blocked by permissions policy. Fall back to the
      // legacy selection copy so the operator still gets the secret instead of
      // a silent no-op, and report honestly if that fails too.
      try {
        const textarea = document.createElement("textarea");
        textarea.value = secret;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        ok = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        ok = false;
      }
    }

    setCopyState(ok ? "copied" : "failed");
    setTimeout(() => setCopyState("idle"), COPY_FEEDBACK_MS);
  }, [config.secret]);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold">Webhook Configuration</h3>

      <div>
        <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700">
          Webhook URL
        </label>
        <input
          id="webhook-url"
          type="url"
          value={config.url}
          onChange={(e) => setConfig((prev) => ({ ...prev, url: e.target.value }))}
          placeholder="https://your-server.com/webhook"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="webhook-secret" className="block text-sm font-medium text-gray-700">
          Signing Secret
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="webhook-secret"
            type={showSecret ? "text" : "password"}
            value={showSecret ? config.secret : maskSecret(config.secret || "")}
            readOnly
            autoComplete="new-password"
            className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            aria-pressed={showSecret}
            aria-label={showSecret ? "Hide signing secret" : "Show signing secret"}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {showSecret ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={copySecret}
            aria-label="Copy signing secret to clipboard"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {copyState === "copied" ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleGenerateClick}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
          >
            {config.secret ? "Regenerate" : "Generate"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Used to verify incoming webhook payloads via HMAC-SHA256 signature.
        </p>
        {/* Polite live region so the clipboard outcome is announced rather
            than only implied by the button label flipping. */}
        <span role="status" aria-live="polite" className="sr-only">
          {copyState === "copied"
            ? "Signing secret copied to clipboard."
            : copyState === "failed"
            ? "Could not copy the signing secret automatically. Reveal it and copy manually."
            : ""}
        </span>
      </div>

      {onSave && (
        <button
          onClick={() => onSave(config)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save Configuration
        </button>
      )}

      <ConfirmDialog
        isOpen={showRegenerateConfirm}
        title="Regenerate signing secret?"
        message={
          "Rotating the secret immediately invalidates the current one. Every downstream " +
          "service that verifies webhook signatures with the old key will start rejecting " +
          "deliveries until it is updated, so plan a grace window for those consumers before " +
          "you rotate."
        }
        confirmPhrase={REGENERATE_SECRET_PHRASE}
        confirmLabel="Regenerate secret"
        variant="danger"
        onConfirm={confirmRegenerate}
        onCancel={() => setShowRegenerateConfirm(false)}
      />
    </div>
  );
}
