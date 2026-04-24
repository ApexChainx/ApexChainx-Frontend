"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { ResolveOutageModal } from "@/features/outages/components/ResolveOutageModal";
import { useOutage, useResolveOutage } from "@/features/outages/hooks/useOutageMutations";
import { SLADisputesPanel } from "@/components/outages/SLADisputesPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteEmptyState, RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { Separator } from "@/components/ui/separator";
import type { OutageResolutionPayment } from "@/types/outages";

export default function OutageDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const { data: outage, isLoading, isError } = useOutage(id);
  const resolveMutation = useResolveOutage(id);

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionPayment, setResolutionPayment] = useState<OutageResolutionPayment | null>(null);

  async function handleResolve(mttrMinutes: number) {
    const result = await resolveMutation.mutateAsync(mttrMinutes);
    setResolutionPayment(result.payment);
    setIsResolveModalOpen(false);
  }

  if (isLoading) {
    return (
      <RouteLoadingState
        title="Loading outage details"
        description="Pulling the incident timeline, SLA state, and resolution metadata."
      />
    );
  }

  if (isError) {
    return (
      <RouteErrorState
        title="Error loading outage"
        description="Failed to load outage"
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

        <button
          onClick={() => setIsResolveModalOpen(true)}
          disabled={isResolved || resolveMutation.isPending}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isResolved
              ? "cursor-not-allowed bg-gray-100 text-gray-500"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isResolved ? "Outage Resolved" : resolveMutation.isPending ? "Resolving…" : "Resolve Outage"}
        </button>
      </div>

      {resolveMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {resolveMutation.error instanceof Error
            ? resolveMutation.error.message
            : "Failed to resolve outage"}
        </div>
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

        <SLADisputesPanel outageId={outage.id} canResolve={isResolved} />
      </div>

      <ResolveOutageModal
        key={`${outage.id}-${outage.sla_status?.mttr_minutes ?? "empty"}-${isResolveModalOpen ? "open" : "closed"}`}
        outageId={outage.id}
        siteName={outage.site_name}
        severity={outage.severity}
        initialMttrMinutes={outage.sla_status?.mttr_minutes}
        isOpen={isResolveModalOpen}
        isResolving={resolveMutation.isPending}
        error={
          resolveMutation.isError
            ? resolveMutation.error instanceof Error
              ? resolveMutation.error.message
              : "Failed to resolve outage"
            : null
        }
        onClose={() => {
          if (!resolveMutation.isPending) {
            setIsResolveModalOpen(false);
          }
        }}
        onConfirmResolve={(mttr) => handleResolve(mttr)}
      />
    </div>
  );
}
