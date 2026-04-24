"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { flagDispute, getDisputes, resolveDispute } from "@/services/sla";
import type { DisputeStatus, SLADispute } from "@/types/sla";

const PAGE_SIZE = 5;

const statusVariant: Record<string, "outline" | "secondary" | "destructive" | "default"> = {
  open: "destructive",
  under_review: "secondary",
  resolved: "default",
  rejected: "outline",
};

interface Props {
  outageId: string;
  canResolve?: boolean;
}

export function SLADisputesPanel({ outageId, canResolve = false }: Props) {
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<DisputeStatus | "">("");
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState("");
  // resolution note state: keyed by disputeId
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const queryKey = ["disputes", outageId, statusFilter, page];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () =>
      getDisputes({
        outage_id: outageId,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const disputes: SLADispute[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const flagMutation = useMutation({
    mutationFn: () => flagDispute({ outage_id: outageId, reason: reason.trim() }),
    onSuccess: () => {
      setReason("");
      void qc.invalidateQueries({ queryKey: ["disputes", outageId] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      disputeId,
      action,
      note,
    }: {
      disputeId: string;
      action: "resolve" | "reject";
      note?: string;
    }) => resolveDispute(disputeId, { action, resolution_note: note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["disputes", outageId] });
    },
  });

  function handleAction(dispute: SLADispute, action: "resolve" | "reject") {
    const note = noteInputs[dispute.id]?.trim();
    resolveMutation.mutate({ disputeId: dispute.id, action, note });
    setNoteInputs((prev) => ({ ...prev, [dispute.id]: "" }));
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle>SLA Disputes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Flag new dispute */}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Reason for dispute…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={flagMutation.isPending}
          />
          <Button
            variant="outline"
            disabled={!reason.trim() || flagMutation.isPending}
            onClick={() => flagMutation.mutate()}
          >
            {flagMutation.isPending ? "Flagging…" : "Flag dispute"}
          </Button>
        </div>

        {flagMutation.isError && (
          <p className="text-xs text-red-600">Failed to flag dispute.</p>
        )}
        {resolveMutation.isError && (
          <p className="text-xs text-red-600">Failed to update dispute.</p>
        )}

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Filter:</span>
          {(["", "open", "under_review", "resolved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-full border px-3 py-0.5 text-xs capitalize transition-colors ${
                statusFilter === s
                  ? "border-slate-700 bg-slate-700 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s === "" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {isLoading && <p className="italic text-slate-400">Loading disputes…</p>}
        {isError && <p className="text-xs text-red-600">Failed to load disputes.</p>}

        {!isLoading && disputes.length === 0 && (
          <p className="italic text-slate-400">No disputes found.</p>
        )}

        {disputes.map((dispute, i) => (
          <div key={dispute.id}>
            {i > 0 && <Separator className="my-3" />}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={statusVariant[dispute.status] ?? "outline"} className="capitalize">
                  {dispute.status.replace("_", " ")}
                </Badge>
                <span className="text-xs text-slate-400">
                  {new Date(dispute.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-700">{dispute.reason}</p>
              {dispute.resolution_note && (
                <p className="text-xs italic text-slate-500">Note: {dispute.resolution_note}</p>
              )}
              {canResolve && dispute.status === "open" && (
                <div className="space-y-2 pt-1">
                  <input
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs"
                    placeholder="Resolution note (optional)…"
                    value={noteInputs[dispute.id] ?? ""}
                    onChange={(e) =>
                      setNoteInputs((prev) => ({ ...prev, [dispute.id]: e.target.value }))
                    }
                    disabled={resolveMutation.isPending}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolveMutation.isPending}
                      onClick={() => handleAction(dispute, "resolve")}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolveMutation.isPending}
                      onClick={() => handleAction(dispute, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
