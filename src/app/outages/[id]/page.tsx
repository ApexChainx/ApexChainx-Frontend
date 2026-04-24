"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ResolveOutageModal } from "@/features/outages/components/ResolveOutageModal";
import { SLADisputesPanel } from "@/components/outages/SLADisputesPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteEmptyState, RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { Separator } from "@/components/ui/separator";
import { getOutage, resolveOutage, deleteOutage } from "@/services/outages";
import type { Outage, OutageResolutionPayment } from "@/types/outages";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load outage";
}

export default function OutageDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [outage, setOutage] = useState<Outage | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionPayment, setResolutionPayment] = useState<OutageResolutionPayment | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isFetching = useRef(false);
  const hasOutageRef = useRef(false);

  useEffect(() => {
    hasOutageRef.current = outage !== null;
  }, [outage]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let isMounted = true;

    const fetchOutage = async () => {
      if (isFetching.current) {
        return;
      }
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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchOutage();

    const intervalId =
      outage?.status === "resolved" ? null : setInterval(() => void fetchOutage(), 15000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [id, outage?.status]);

  async function handleResolve(mttrMinutes: number) {
    if (!id) {
      return;
    }

    setResolving(true);
    setError(null);

    try {
      const updated = await resolveOutage(id, { mttr_minutes: mttrMinutes });
      setOutage({
        ...updated.outage,
        sla_status: updated.sla,
      });
      setResolutionPayment(updated.payment);
      setIsResolveModalOpen(false);
    } catch (issue) {
      setError(getErrorMessage(issue));
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

        <div className="flex items-center gap-2">
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
          <button
            onClick={() => { setShowDeleteConfirm(true); setDeleteError(null); }}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

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

        {/* FE-063: Location visualization */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {outage.location ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <span className="text-muted-foreground">Latitude</span>
                    <p className="font-medium font-mono">{outage.location.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Longitude</span>
                    <p className="font-medium font-mono">{outage.location.longitude.toFixed(6)}</p>
                  </div>
                </div>
                <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50" style={{ paddingBottom: "40%" }}>
                  {/* Static map via OpenStreetMap tile — no API key required */}
                  <iframe
                    title="Outage location map"
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${outage.location.longitude - 0.05},${outage.location.latitude - 0.05},${outage.location.longitude + 0.05},${outage.location.latitude + 0.05}&layer=mapnik&marker=${outage.location.latitude},${outage.location.longitude}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> contributors
                </p>
              </div>
            ) : (
              <span className="italic text-muted-foreground">No location data available for this outage.</span>
            )}
          </CardContent>
        </Card>

        {/* FE-064: Root cause and resolution notes */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Post-Incident Analysis</CardTitle>
          </CardHeader>
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

      {/* FE-062: Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-slate-900">
              Delete outage?
            </h2>
            <p className="text-sm text-slate-600">
              This will permanently delete outage{" "}
              <span className="font-medium">{outage.id}</span> ({outage.site_name}). This action
              cannot be undone.
            </p>
            {deleteError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {deleteError}{" "}
                <button
                  className="underline font-medium"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  Retry
                </button>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                disabled={deleting}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
