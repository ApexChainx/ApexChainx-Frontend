"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { SLADisputesPanel } from "@/components/outages/SLADisputesPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteEmptyState, RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { ResolveOutageModal } from "@/features/outages/components/ResolveOutageModal";
import {
  invalidateOutageListCaches,
  removeOutageFromCache,
  setOutageDetailCache,
} from "@/features/outages/hooks/outage-cache";
import { useDocumentVisibility } from "@/hooks/useDocumentVisibility";
import { getOutage, resolveOutage, updateOutage, deleteOutage } from "@/services/outages";
import { explorerLink } from "@/lib/explorer";
import type { Outage, OutageResolutionPayment, OutageUpdate, Severity, OutageStatus } from "@/types/outages";

/** How often an unresolved outage is re-fetched while the tab is in front. */
const DETAIL_POLL_INTERVAL_MS = 15_000;

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Failed to load outage";
}

function buildTimeline(outage: Outage) {
  const events: { label: string; time: string; note?: string }[] = [
    { label: "Outage detected", time: outage.detected_at },
  ];
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
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const id = params?.id;

  // Issue #570 — the poll loop below suspends itself while this is false.
  const isDocumentVisible = useDocumentVisibility();

  const [outage, setOutage] = useState<Outage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionPayment, setResolutionPayment] = useState<OutageResolutionPayment | null>(null);

  const isResolved = outage?.status === "resolved";

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<OutageUpdate>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    let mounted = true;

    getOutage(id, { signal: controller.signal })
      .then((data) => {
        if (!mounted) return;
        setOutage(data);
        // Issue #571 — seed the shared detail cache from the authoritative
        // fetch so a back-navigation to this route renders immediately and
        // any other consumer of `slaEventKeys.outages.detail(id)` sees the
        // same object.
        setOutageDetailCache(queryClient, data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "CanceledError") return;
        if (!mounted) return;
        // Issue #572 — a 404 is authoritative: make sure no previously cached
        // copy of this outage survives, so the not-found state below is what
        // renders rather than a resurrected incident.
        if (
          (err as { response?: { status?: number } })?.response?.status === 404
        ) {
          removeOutageFromCache(queryClient, id);
        }
        setError(getErrorMessage(err));
        setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [id, queryClient]);

  // Command palette shortcut for "resolve this outage".
  useEffect(() => {
    const handlePaletteResolve = () => {
      if (!outage || outage.status !== "resolved" && !resolving) {
        setIsResolveModalOpen(true);
      }
    };

    window.addEventListener("command-palette:resolve-outage", handlePaletteResolve);
    return () => {
      window.removeEventListener("command-palette:resolve-outage", handlePaletteResolve);
    };
  }, [outage, resolving]);

  // Poll for updates while the outage is open.
  //
  // Issue #570 — a backgrounded tab has no operator reading it, so the
  // 15-second cadence was pure waste: on a device without OS-level
  // background throttling this route, the heartbeat and the health checks
  // stack up into a continuous request stream. The loop is torn down
  // entirely while `document.hidden` is true and rebuilt on
  // `visibilitychange`, so the last response the operator saw is the one
  // they come back to — no burst of catch-up fetches either.
  useEffect(() => {
    if (!id || !outage || outage.status === "resolved") return;
    if (!isDocumentVisible) return;

    let mounted = true;
    const controller = new AbortController();
    const intervalId = setInterval(() => {
      getOutage(id, { signal: controller.signal })
        .then((data) => {
          if (mounted) setOutage(data);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string }).name !== "CanceledError") {
            console.error("Poll error:", err);
          }
        });
    }, DETAIL_POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [id, outage?.status, isDocumentVisible]);

  /**
   * Issue #571 — after any successful mutation the cached list pages are
   * marked stale. Fired without awaiting so the operator sees their own
   * edit/resolve land immediately instead of waiting on a refetch, while
   * the next visit to /outages still reconciles against the server.
   */
  function markOutageListsStale() {
    void invalidateOutageListCaches(queryClient);
  }

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
      root_cause: outage.root_cause,
      resolution_notes: outage.resolution_notes,
    });
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (!id || !outage) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOutage(id, editForm);
      const next = { ...outage, ...updated };
      setOutage(next);
      setOutageDetailCache(queryClient, next);
      markOutageListsStale();
      setEditing(false);
      toast("Outage updated.", "success");
    } catch (err) {
      setError(getErrorMessage(err));
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
      const next: Outage = { ...updated.outage, sla_status: updated.sla };
      setOutage(next);
      setResolutionPayment(updated.payment);
      setOutageDetailCache(queryClient, next);
      markOutageListsStale();
      setIsResolveModalOpen(false);
      toast("Outage resolved successfully.", "success");
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast(msg, "error");
    } finally {
      setResolving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteOutage(id);
      // Issue #572 — drop the detail entry *before* navigating away.
      // Invalidation alone is not enough: with no observer left once the
      // route changes, React Query would happily serve the deleted outage
      // from cache on a back-navigation until gcTime expired, showing an
      // incident that no longer exists.
      removeOutageFromCache(queryClient, id);
      markOutageListsStale();
      router.push("/outages");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed. Please try again.");
      setDeleting(false);
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
        primaryAction={{ label: "Reload page", onClick: () => window.location.reload() }}
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

  const timeline = buildTimeline(outage);

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Outage {outage.id}</h1>
          <Badge variant={outage.status === "open" ? "destructive" : "default"} className="uppercase">
            {outage.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={startEdit}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => setIsResolveModalOpen(true)}
            disabled={isResolved || resolving}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              isResolved
                ? "cursor-not-allowed bg-gray-100 text-gray-500"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isResolved ? "Outage Resolved" : resolving ? "Resolving…" : "Resolve Outage"}
          </button>
          <button
            onClick={() => { setShowDeleteConfirm(true); setDeleteError(null); }}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {editing && (
        <Card>
          <CardHeader className="pb-3"><CardTitle>Edit Outage</CardTitle></CardHeader>
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
                maxLength={2000}
                value={editForm.description ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
              <div className="text-right text-xs text-slate-600 mt-1">
                {(editForm.description ?? "").length} / 2000
              </div>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Root Cause</label>
              <textarea
                className="w-full rounded-md border border-slate-200 px-3 py-2"
                rows={3}
                maxLength={2000}
                value={editForm.root_cause ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, root_cause: e.target.value }))}
              />
              <div className="text-right text-xs text-slate-600 mt-1">
                {(editForm.root_cause ?? "").length} / 2000
              </div>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Resolution Notes</label>
              <textarea
                className="w-full rounded-md border border-slate-200 px-3 py-2"
                rows={3}
                maxLength={2000}
                value={editForm.resolution_notes ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, resolution_notes: e.target.value }))}
              />
              <div className="text-right text-xs text-slate-600 mt-1">
                {(editForm.resolution_notes ?? "").length} / 2000
              </div>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Affected Services (comma-separated)</label>
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
                onClick={() => void handleSaveEdit()}
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
          <CardHeader className="pb-3"><CardTitle>Metadata</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Site Name</span>
              <span className="font-medium">{outage.site_name}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Severity</span>
              <Badge variant={outage.severity === "high" ? "destructive" : "secondary"}>{outage.severity}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Started At</span>
              <span className="font-medium">{new Date(outage.detected_at).toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Resolved At</span>
              <span className="font-medium">{outage.resolved_at ? new Date(outage.resolved_at).toLocaleString() : "Ongoing"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>SLA Result</CardTitle></CardHeader>
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
                  <span className={`font-semibold ${outage.sla_status.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                    {outage.sla_status.amount > 0 ? "+" : ""}{outage.sla_status.amount}
                  </span>
                </div>
              </>
            ) : (
              <span className="italic text-muted-foreground">No SLA computed yet.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Resolution Payment</CardTitle></CardHeader>
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
                  <span className="font-medium text-slate-900">{resolutionPayment.amount} {resolutionPayment.asset_code}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">From</span>
                  <span className="break-all text-right font-mono text-xs text-slate-900">
                    {explorerLink("account", resolutionPayment.from_address) ? (
                      <a href={explorerLink("account", resolutionPayment.from_address)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" title={resolutionPayment.from_address}>
                        {resolutionPayment.from_address.slice(0, 8)}…{resolutionPayment.from_address.slice(-6)}
                      </a>
                    ) : (
                      resolutionPayment.from_address
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">To</span>
                  <span className="break-all text-right font-mono text-xs text-slate-900">
                    {explorerLink("account", resolutionPayment.to_address) ? (
                      <a href={explorerLink("account", resolutionPayment.to_address)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" title={resolutionPayment.to_address}>
                        {resolutionPayment.to_address.slice(0, 8)}…{resolutionPayment.to_address.slice(-6)}
                      </a>
                    ) : (
                      resolutionPayment.to_address
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Transaction</span>
                  <span className="break-all text-right font-mono text-xs text-slate-900">
                    {explorerLink("tx", resolutionPayment.transaction_hash) ? (
                      <a href={explorerLink("tx", resolutionPayment.transaction_hash)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" title={resolutionPayment.transaction_hash}>
                        {resolutionPayment.transaction_hash.slice(0, 8)}…{resolutionPayment.transaction_hash.slice(-6)}
                      </a>
                    ) : (
                      resolutionPayment.transaction_hash
                    )}
                  </span>
                </div>
              </>
            ) : (
              <span className="italic text-muted-foreground">Resolve the outage to view the generated payment record.</span>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3"><CardTitle>Impact</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Affected Services</span>
              <span className="font-medium">
                {outage.affected_services.length > 0 ? outage.affected_services.join(", ") : "Not provided"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subscribers</span>
              <span className="font-medium">{outage.affected_subscribers ?? "Unknown"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3"><CardTitle>Outage History</CardTitle></CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No history events available yet.</p>
            ) : (
              <ol className="relative border-l border-slate-200 pl-6 space-y-4">
                {timeline.map((event, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full border-2 border-blue-500 bg-white" />
                    <p className="text-sm font-medium text-slate-900">{event.label}</p>
                    <p className="text-xs text-slate-600">{new Date(event.time).toLocaleString()}</p>
                    {event.note && <p className="mt-0.5 text-xs text-slate-600">{event.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3"><CardTitle>Location</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {outage.location ? (
              <OutageLocationMap
                latitude={outage.location.latitude}
                longitude={outage.location.longitude}
              />
            ) : (
              <span className="italic text-muted-foreground">No location data available for this outage.</span>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3"><CardTitle>Post-Incident Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-slate-700 mb-1">Root Cause</p>
              {outage.root_cause ? (
                <p className="text-slate-900 whitespace-pre-wrap">{outage.root_cause}</p>
              ) : (
                <p className="italic text-muted-foreground">No root cause recorded.</p>
              )}
            </div>
            <Separator />
            <div>
              <p className="font-medium text-slate-700 mb-1">Resolution Notes</p>
              {outage.resolution_notes ? (
                <p className="text-slate-900 whitespace-pre-wrap">{outage.resolution_notes}</p>
              ) : (
                <p className="italic text-muted-foreground">No resolution notes recorded.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <SLADisputesPanel outageId={outage.id} canResolve={isResolved} />
      </div>

      <ResolveOutageModal
        outageId={outage.id}
        siteName={outage.site_name}
        severity={outage.severity}
        initialMttrMinutes={outage.sla_status?.mttr_minutes}
        isOpen={isResolveModalOpen}
        isResolving={resolving}
        error={error}
        onClose={() => { if (!resolving) setIsResolveModalOpen(false); }}
        onConfirmResolve={(mttr) => handleResolve(mttr)}
      />

      {showDeleteConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-slate-900">Delete outage?</h2>
            <p className="text-sm text-slate-600">
              This will permanently delete outage{" "}
              <span className="font-medium">{outage.id}</span> ({outage.site_name}). This action cannot be undone.
            </p>
            {deleteError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {deleteError}{" "}
                <button className="underline font-medium rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600" onClick={() => void handleDelete()} disabled={deleting}>
                  Retry
                </button>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                disabled={deleting}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Issue #544 — location panel that keeps coordinates usable even when the
 * embedded OpenStreetMap iframe cannot load. The coordinates are always
 * rendered as plain text with a Copy affordance and a deep link, while a
 * text fallback layer sits underneath the iframe so a blocked tile server
 * never leaves the map area blank.
 */
function OutageLocationMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const [copied, setCopied] = useState(false);

  const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  const mapSrc =
    `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.05},${latitude - 0.05},${longitude + 0.05},${latitude + 0.05}&layer=mapnik&marker=${latitude},${longitude}`;
  const openStreetMapLink =
    `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(coordinates);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — the text remains selectable below.
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-6">
          <div>
            <span className="text-muted-foreground">Latitude</span>
            <p className="font-medium font-mono">{latitude.toFixed(6)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Longitude</span>
            <p className="font-medium font-mono">{longitude.toFixed(6)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          {copied ? "Copied" : "Copy coordinates"}
        </button>
        <a
          href={openStreetMapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Open in OpenStreetMap
        </a>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
        style={{ paddingBottom: "40%" }}
      >
        {/* Fallback layer — visible whenever the iframe fails to paint. */}
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-600">
          Map unavailable — coordinates provided below.
        </div>
        <iframe
          title="Outage location map"
          className="absolute inset-0 h-full w-full"
          src={mapSrc}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>

      <p className="text-xs text-slate-600">
        Map data ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
          OpenStreetMap
        </a>{" "}
        contributors
      </p>
    </div>
  );
}
