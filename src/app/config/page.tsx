"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

type Severity = "critical" | "high" | "medium" | "low";

type SLASeverityConfig = {
  threshold_minutes: number;
  penalty_per_minute: number;
  reward_base: number;
};

type SLAConfigMap = Record<string, SLASeverityConfig>;

type EditableConfig = SLASeverityConfig & {
  severity: Severity;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

function getSeverityVariant(severity: Severity) {
  if (severity === "critical" || severity === "high") {
    return "destructive";
  }
  return "default";
}

export default function SlaConfigPage() {
  const [configs, setConfigs] = useState<EditableConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<EditableConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SLASeverityConfig>({
    threshold_minutes: 0,
    penalty_per_minute: 0,
    reward_base: 0,
  });

  useEffect(() => {
    void fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<SLAConfigMap>("/sla/config");
      const nextConfigs = Object.entries(response.data)
        .map(([severity, config]) => ({
          severity: severity as Severity,
          ...config,
        }))
        .sort((left, right) => {
          const order: Record<Severity, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          return order[left.severity] - order[right.severity];
        });
      setConfigs(nextConfigs);
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick(config: EditableConfig) {
    setEditingConfig(config);
    setFormData({
      threshold_minutes: config.threshold_minutes,
      penalty_per_minute: config.penalty_per_minute,
      reward_base: config.reward_base,
    });
    setSaveError(null);
  }

  function handleCancel() {
    setEditingConfig(null);
    setSaveError(null);
  }

  async function handleSave() {
    if (!editingConfig) {
      return;
    }

    if (
      formData.threshold_minutes < 0 ||
      formData.penalty_per_minute < 0 ||
      formData.reward_base < 0
    ) {
      setSaveError("Values cannot be negative.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await api.put<SLASeverityConfig>(
        `/sla/config/${editingConfig.severity}`,
        formData,
      );

      setConfigs((currentConfigs) =>
        currentConfigs.map((config) =>
          config.severity === editingConfig.severity
            ? { severity: editingConfig.severity, ...response.data }
            : config,
        ),
      );
      setEditingConfig(null);
    } catch (issue) {
      setSaveError(getErrorMessage(issue));
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse p-8 text-muted-foreground">Loading configurations...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">SLA Configuration Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>Severity Service Level Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="border-b p-3 font-medium">Severity</th>
                  <th className="border-b p-3 font-medium">Threshold (mins)</th>
                  <th className="border-b p-3 font-medium">Reward Base</th>
                  <th className="border-b p-3 font-medium">Penalty / Minute</th>
                  <th className="border-b p-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config.severity} className="border-b transition-colors hover:bg-muted/30">
                    <td className="p-3 capitalize">
                      <Badge variant={getSeverityVariant(config.severity)}>{config.severity}</Badge>
                    </td>
                    <td className="p-3">{config.threshold_minutes}</td>
                    <td className="p-3 font-medium text-emerald-600">{config.reward_base}</td>
                    <td className="p-3 font-medium text-red-600">
                      {config.penalty_per_minute}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleEditClick(config)}
                        className="rounded px-2 py-1 font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {configs.length === 0 ? (
              <div className="p-6 text-center italic text-muted-foreground">
                No configurations found.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {editingConfig ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold capitalize">
              Edit {editingConfig.severity} SLA
            </h2>

            {saveError ? (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {saveError}
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="sla-threshold-minutes"
                  className="mb-1 block text-sm font-medium"
                >
                  Threshold (minutes)
                </label>
                <input
                  id="sla-threshold-minutes"
                  type="number"
                  value={formData.threshold_minutes}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      threshold_minutes: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="sla-reward-base" className="mb-1 block text-sm font-medium">
                  Reward Base
                </label>
                <input
                  id="sla-reward-base"
                  type="number"
                  value={formData.reward_base}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      reward_base: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="sla-penalty-per-minute"
                  className="mb-1 block text-sm font-medium"
                >
                  Penalty Per Minute
                </label>
                <input
                  id="sla-penalty-per-minute"
                  type="number"
                  value={formData.penalty_per_minute}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      penalty_per_minute: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
