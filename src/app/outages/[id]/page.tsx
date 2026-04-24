"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { ResolveOutageModal } from "@/features/outages/components/ResolveOutageModal";
import { SLADisputesPanel } from "@/components/outages/SLADisputesPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteEmptyState, RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { Separator } from "@/components/ui/separator";
import { getOutage, resolveOutage, updateOutage } from "@/services/outages";
import type { Outage, OutageResolutionPayment, OutageUpdate, Severity, OutageStatus } from "@/types/outages";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load outage";
}

// FE-020: derive timeline events from outage data
function buildTimeline(outage: Outage) {
  const events: { label: string; time: string; note?: string }[] = [];
  events.push({ label: "Outage detected", time: outage.detected_at });
  if (outage.sla_status) {
    events.push({
      label: "SLA computed",
      time: outage.resolved_at ?? outage.detected_at,
      note: `${outage.sla_status.status} · ${outage.sla_status.rating}`,
    });
  }
  if (outage.resolved_at) {
    events.push({ label: "Outage resolved", time: outage.resolved_at });
  }
  return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export default function OutageDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [outage, setOutage] = useState<Outage | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionPayment, setResolutionPayment] = useState<OutageResolutionPayment | null>(null);

  // FE-018: edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<OutageUpdate>({});

  const isFetching = useRef(false);
  const hasOutageRef = useRef(false);

  useEffect(() => {
    hasOutageRef.current = outage !== null;
  }, [outage]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchOutage = async () => {
      if (isFetching.current) return;
      isFetching.current = true;
      try {
        const data = await getOutage(id);
        if (isMounted) {
          setOutage(data);
          setError(null);
        }
      } catch (issue) {
        if (isMounted && !hasOutageRef.current) {
          setError(getErrorMessage(issue));
        }
      } finally {
        isFetching.current = false;
        if (isMounted) setLoading(false);
      }
    };

    void fetchOutage();
    const intervalId =
      outage?.status === "resolved" ? null : setInterval(() => void fetchOutage(), 15000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, outage?.status]);

  function startEdit() {
    if (!outage) return;
    setEditForm({
      site_name: outage.site_name,
      severity: outage.severity,
      status: outage.status,
      description: outage.description,
      affected_services: outage.affected_services,
      affected_subscribers: outage.affected_subscribers,
      assigned_to: outage.assigned_to,
    });
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (!id || !outage) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOutage(id, editForm);
      setOutage({ ...outage, ...updated });
      setEditing(false);
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setSaving(false);
    }
  }

  async function handleResolve(mttrMinutes: number) {
    if (!id) return;
    setResolving(true);
    setError(null);
    try {
      const updated = await resolveOutage(id, { mttr_minutes: mttrMinutes });
      setOutage({ ...updated.outage, sla_status: updated.sla });
      setResolutionPayment(updated.payment);
      setIsResolveModalOpen(false);
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setResolving(false);
    }
  }

  if (loading) {
    return (
      <RouteLoadingState
        title="Loading outage details"
        description="Pulling the incident timeline, SLA state, and resolution metadata."
      />
    );
  }

  if (error && !outage) {
    return (
      <RouteErrorState
        title="Error loading outage"
        description={error}
        actionLabel="Reload page"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (!outage) {
    return (
      <RouteEmptyState
        title="Outage not found"
        description="The outage may have been removed or the link may be outdated."
      />
    );
  }

  const isResolved = outage.status === "resolved";
  const timeline = buildTimeline(outage);

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Outage {outage.id}</h1>
          <Badge
            variant={outage.status === "open" ? "destructive" : "default"}
            className="uppercase"
          >
            {outage.status}
          </Badge>
        </div>

        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={startEdit}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => setIsResolveModalOpen(true)}
            disabled={isResolved || resolving}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              isResolved
                ? "cursor-not-allowed bg-gray-100 text-gray-500"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isResolved ? "Outage Resolved" : resolving ? "Resolving…" : "Resolve Outage"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {/* FE-018: Inline edit panel */}
      {editing && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Edit Outage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-slate-700">Site Name</label>
                <input
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                  value={editForm.site_name ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, site_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Severity</label>
                <select
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                  value={editForm.severity ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, severity: e.target.value as Severity }))}
                >
                  {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Status</label>
                <select
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                  value={editForm.status ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as OutageStatus }))}
                >
                  <option value="open">open</option>
                  <option value="resolved">resolved</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Assigned To</label>
                <input
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                  value={editForm.assigned_to ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, assigned_to: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Description</label>
              <textarea
                className="w-full rounded-md border border-slate-200 px-3 py-2"
                rows={3}
                value={editForm.description ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                Affected Services (comma-separated)
              </label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2"
                value={(editForm.affected_services ?? []).join(", ")}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    affected_services: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Site Name</span>
              <span className="font-medium">{outage.site_name}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Severity</span>
              <Badge variant={outage.severity === "high" ? "destructive" : "secondary"}>
                {outage.severity}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Started At</span>
              <span className="font-medium">{new Date(outage.detected_at).toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Resolved At</span>
              <span className="font-medium">
                {outage.resolved_at ? new Date(outage.resolved_at).toLocaleString() : "Ongoing"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>SLA Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {outage.sla_status ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{outage.sla_status.status}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-medium">{outage.sla_status.rating}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span
                    className={`font-semibold ${
                      outage.sla_status.amount > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {outage.sla_status.amount > 0 ? "+" : ""}
                    {outage.sla_status.amount}
                  </span>
                </div>
              </>
            ) : (
              <span className="italic text-muted-foreground">No SLA computed yet.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Resolution Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {resolutionPayment ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{resolutionPayment.status}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-slate-900">
                    {resolutionPayment.amount} {resolutionPayment.asset_code}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Transaction</span>
                  <span className="break-all text-right font-medium text-slate-900">
                    {resolutionPayment.transaction_hash}
                  </span>
                </div>
              </>
            ) : (
              <span className="italic text-muted-foreground">
                Resolve the outage to view the generated payment record.
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Affected Services</span>
              <span className="font-medium">
                {outage.affected_services.length > 0
                  ? outage.affected_services.join(", ")
                  : "Not provided"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subscribers</span>
              <span className="font-medium">{outage.affected_subscribers ?? "Unknown"}</span>
            </div>
          </CardContent>
        </Card>

        {/* FE-020: Outage history / timeline panel */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Outage History</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No history events available yet.</p>
            ) : (
              <ol className="relative border-l border-slate-200 pl-6 space-y-4">
                {timeline.map((event, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full border-2 border-blue-500 bg-white" />
                    <p className="text-sm font-medium text-slate-900">{event.label}</p>
                    <p className="text-xs text-slate-500">{new Date(event.time).toLocaleString()}</p>
                    {event.note && (
                      <p className="mt-0.5 text-xs text-slate-400">{event.note}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <SLADisputesPanel outageId={outage.id} canResolve={isResolved} />
      </div>

      <ResolveOutageModal
        key={`${outage.id}-${outage.sla_status?.mttr_minutes ?? "empty"}-${isResolveModalOpen ? "open" : "closed"}`}
        outageId={outage.id}
        siteName={outage.site_name}
        severity={outage.severity}
        initialMttrMinutes={outage.sla_status?.mttr_minutes}
        isOpen={isResolveModalOpen}
        isResolving={resolving}
        error={error}
        onClose={() => {
          if (!resolving) {
            setIsResolveModalOpen(false);
            setError(null);
          }
        }}
        onConfirmResolve={handleResolve}
      />
    </div>
  );
}
