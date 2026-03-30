"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { flagDispute, getDisputes, resolveDispute } from "@/services/sla";
import type { SLADispute } from "@/types/sla";

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
  const [disputes, setDisputes] = useState<SLADispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getDisputes(outageId)
      .then((data) => { if (isMounted) setDisputes(data); })
      .catch(() => { if (isMounted) setError("Failed to load disputes."); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [outageId]);

  async function handleFlag() {
    if (!reason.trim()) return;
    setFlagging(true);
    setError(null);
    try {
      const dispute = await flagDispute(outageId, reason.trim());
      setDisputes((prev) => [dispute, ...prev]);
      setReason("");
    } catch {
      setError("Failed to flag dispute.");
    } finally {
      setFlagging(false);
    }
  }

  async function handleAction(disputeId: string, action: "resolve" | "reject") {
    setResolvingId(disputeId);
    setError(null);
    try {
      const updated = await resolveDispute(disputeId, action);
      setDisputes((prev) => prev.map((d) => (d.id === disputeId ? updated : d)));
    } catch {
      setError(`Failed to ${action} dispute.`);
    } finally {
      setResolvingId(null);
    }
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
            disabled={flagging}
          />
          <Button
            variant="outline"
            disabled={!reason.trim() || flagging}
            onClick={() => void handleFlag()}
          >
            {flagging ? "Flagging…" : "Flag dispute"}
          </Button>
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        {loading && <p className="text-slate-400 italic">Loading disputes…</p>}

        {!loading && disputes.length === 0 && (
          <p className="italic text-slate-400">No disputes filed for this outage.</p>
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
                <p className="text-xs text-slate-500 italic">Note: {dispute.resolution_note}</p>
              )}
              {canResolve && dispute.status === "open" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolvingId === dispute.id}
                    onClick={() => void handleAction(dispute.id, "resolve")}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolvingId === dispute.id}
                    onClick={() => void handleAction(dispute.id, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
