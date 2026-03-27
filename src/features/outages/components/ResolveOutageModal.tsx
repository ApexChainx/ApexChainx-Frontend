import { useState } from "react";

import { previewSLA } from "@/services/sla";
import type { Severity } from "@/types/outages";
import type { SLAResult } from "@/types/sla";

interface ResolveModalProps {
  outageId: string;
  siteName: string;
  severity: Severity;
  initialMttrMinutes?: number;
  isOpen: boolean;
  isResolving: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirmResolve: (mttrMinutes: number) => Promise<void>;
}

export function ResolveOutageModal({
  outageId,
  siteName,
  severity,
  initialMttrMinutes,
  isOpen,
  isResolving,
  error,
  onClose,
  onConfirmResolve,
}: ResolveModalProps) {
  const [mttrInput, setMttrInput] = useState(
    initialMttrMinutes !== undefined ? initialMttrMinutes.toString() : "",
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<SLAResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  async function handleResolve() {
    const parsed = Number(mttrInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setValidationError("MTTR must be a non-negative number.");
      return;
    }

    setValidationError(null);
    await onConfirmResolve(parsed);
  }

  async function handlePreview() {
    const parsed = Number(mttrInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setValidationError("MTTR must be a non-negative number.");
      return;
    }

    setValidationError(null);
    setPreviewError(null);
    setIsPreviewLoading(true);

    try {
      const result = await previewSLA({
        severity,
        mttr_minutes: parsed,
      });
      setPreviewResult(result);
    } catch (issue) {
      setPreviewError(issue instanceof Error ? issue.message : "Failed to preview SLA.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">Resolve outage</h2>
          <p className="text-sm text-slate-500">
            Confirm the MTTR for <span className="font-medium text-slate-700">{siteName}</span> and
            resolve outage <span className="font-medium text-slate-700">{outageId}</span>.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Mean time to resolve (minutes)
            </label>
            <input
              type="number"
              min={0}
              value={mttrInput}
              onChange={(event) => {
                setMttrInput(event.target.value);
                setPreviewResult(null);
                setPreviewError(null);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter MTTR in minutes"
            />
          </div>

          {validationError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {validationError}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {previewError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {previewError}
            </div>
          ) : null}

          {previewResult ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">SLA outcome preview</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {previewResult.status}
                  </div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Rating</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {previewResult.rating}
                  </div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Threshold</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {previewResult.threshold_minutes} min
                  </div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Payout</div>
                  <div
                    className={`mt-1 text-sm font-medium ${
                      previewResult.amount >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {previewResult.amount >= 0 ? "+" : ""}
                    {previewResult.amount} ({previewResult.payment_type})
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isResolving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handlePreview}
            disabled={isResolving || isPreviewLoading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isPreviewLoading ? "Previewing..." : "Preview SLA"}
          </button>
          <button
            onClick={handleResolve}
            disabled={isResolving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isResolving ? "Resolving..." : "Confirm resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}
