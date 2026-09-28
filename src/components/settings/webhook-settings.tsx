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

export default function WebhookSettings({ initialConfig, onSave }: WebhookSettingsProps) {
  const [config, setConfig] = useState<WebhookConfig>(initialConfig ?? { url: "", secret: "", events: [] });
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
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
    try {
      await navigator.clipboard.writeText(config.secret);
    } catch {
      // The clipboard API is unavailable in non-secure contexts; fall back to
      // the legacy execCommand path so "Copy" still works over plain HTTP.
      const textarea = document.createElement("textarea");
      textarea.value = config.secret;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <button type="button" onClick={() => setShowSecret(!showSecret)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {showSecret ? "Hide" : "Show"}
          </button>
          <button type="button" onClick={copySecret} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {copied ? "Copied!" : "Copy"}
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
