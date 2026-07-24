/** ApexChain - Network Operations Intelligence Platform */
"use client";

import { useState, useCallback } from "react";
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

export default function WebhookSettings({ initialConfig, onSave }: WebhookSettingsProps) {
  const [config, setConfig] = useState<WebhookConfig>(initialConfig ?? { url: "", secret: "", events: [] });
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSecret = useCallback(() => {
    setConfig((prev) => ({ ...prev, secret: generateWebhookSecret() }));
  }, []);

  const copySecret = useCallback(async () => {
    await navigator.clipboard.writeText(config.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [config.secret]);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold">Webhook Configuration</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
        <input
          type="url"
          value={config.url}
          onChange={(e) => setConfig((prev) => ({ ...prev, url: e.target.value }))}
          placeholder="https://your-server.com/webhook"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Signing Secret</label>
        <div className="mt-1 flex gap-2">
          <input
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
          <button type="button" onClick={generateSecret} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white">
            Generate
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
    </div>
  );
}
