"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOutage } from "@/services/outages";
import type { OutageCreate, Severity, OutageStatus } from "@/types/outages";

function generateId() {
  return `OUT-${Date.now()}`;
}

export default function NewOutagePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    site_name: "",
    site_id: "",
    severity: "medium" as Severity,
    status: "open" as OutageStatus,
    detected_at: new Date().toISOString().slice(0, 16),
    description: "",
    affected_services: "",
    affected_subscribers: "",
    assigned_to: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.site_name.trim() || !form.description.trim()) {
      setError("Site name and description are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: OutageCreate = {
      id: generateId(),
      site_name: form.site_name.trim(),
      site_id: form.site_id.trim() || undefined,
      severity: form.severity,
      status: form.status,
      detected_at: new Date(form.detected_at).toISOString(),
      description: form.description.trim(),
      affected_services: form.affected_services
        ? form.affected_services.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      affected_subscribers: form.affected_subscribers
        ? parseInt(form.affected_subscribers, 10)
        : undefined,
      assigned_to: form.assigned_to.trim() || undefined,
    };

    try {
      const outage = await createOutage(payload);
      router.push(`/outages/${outage.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create outage.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push("/outages")}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← Back to outages
        </button>
        <h1 className="text-2xl font-semibold text-slate-900">Create Outage</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Site Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.site_name}
              onChange={(e) => set("site_name", e.target.value)}
              placeholder="e.g. Lagos Node 1"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Site ID</label>
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.site_id}
              onChange={(e) => set("site_id", e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Severity</label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.severity}
              onChange={(e) => set("severity", e.target.value)}
            >
              {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="open">open</option>
              <option value="resolved">resolved</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Detected At</label>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.detected_at}
            onChange={(e) => set("detected_at", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the outage…"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Affected Services
          </label>
          <input
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.affected_services}
            onChange={(e) => set("affected_services", e.target.value)}
            placeholder="Comma-separated, e.g. DNS, VoIP"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Affected Subscribers
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.affected_subscribers}
              onChange={(e) => set("affected_subscribers", e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assigned To</label>
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.assigned_to}
              onChange={(e) => set("assigned_to", e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/outages")}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create Outage"}
          </button>
        </div>
      </form>
    </div>
  );
}
