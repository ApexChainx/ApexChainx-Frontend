"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getOutage, resolveOutage } from "@/services/outages";
import type { Outage } from "@/types/outages";

// Import shadcn UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function OutageDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const [outage, setOutage] = useState<Outage | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        getOutage(id)
            .then(setOutage)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    async function handleResolve() {
        if (!id) return;

        setResolving(true);
        setError(null);

        try {
            const updated = await resolveOutage(id);
            setOutage(updated);
        } catch (err: any) {
            setError(err.message || "Failed to resolve outage");
        } finally {
            setResolving(false);
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-[50vh]">
                <p className="text-muted-foreground animate-pulse">Loading outage details…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 flex justify-center">
                <Card className="border-red-200 bg-red-50 max-w-md w-full">
                    <CardContent className="p-6 text-red-600 text-center">
                        <p className="font-semibold">Error loading outage</p>
                        <p className="text-sm mt-1">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!outage) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>Outage not found</p>
            </div>
        );
    }

    const isResolved = outage.status === "resolved";

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-6 px-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">Outage {outage.id}</h1>
                    <Badge variant={outage.status === "open" ? "destructive" : "default"} className="uppercase">
                        {outage.status}
                    </Badge>
                </div>
                
                {/* Resolve Action */}
                <button
                    onClick={handleResolve}
                    disabled={isResolved || resolving}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                        isResolved
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                >
                    {isResolved
                        ? "Outage Resolved"
                        : resolving
                            ? "Resolving…"
                            : "Resolve Outage"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Metadata Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Site Name</span>
                            <span className="font-medium">{outage.site_name}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Severity</span>
                            <Badge variant={outage.severity === "high" ? "destructive" : "secondary"}>
                                {outage.severity}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Timeline Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Started At</span>
                            {/* Assuming started_at exists on your Outage type based on previous column.tsx context */}
                            <span className="font-medium">
                                {outage.started_at ? new Date(outage.started_at).toLocaleString() : "Unknown"}
                            </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Resolved At</span>
                            <span className="font-medium">
                                {outage.resolved_at ? new Date(outage.resolved_at).toLocaleString() : "Ongoing"}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* SLA Result Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>SLA Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        {outage.sla_status ? (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant="outline">{outage.sla_status.status}</Badge>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Rating</span>
                                    <span className="font-medium">{outage.sla_status.rating}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Amount</span>
                                    <span className={`font-semibold ${outage.sla_status.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                                        {outage.sla_status.amount > 0 ? "+" : ""}
                                        {outage.sla_status.amount}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <span className="text-muted-foreground italic">No SLA computed yet.</span>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Info Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Payment Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        {/* Assuming payment_info might be added to the Outage type. Adjust property name as needed. */}
                        {outage.payment_info ? (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Amount</span>
                                    <span className="font-medium">${outage.payment_info.amount}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant="outline">{outage.payment_info.status}</Badge>
                                </div>
                            </>
                        ) : (
                            <span className="text-muted-foreground italic">No payment info available.</span>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}