"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getOutage, resolveOutage } from "@/services/outages";
import type { Outage } from "@/types/outages";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Failed to load outage";
}

export default function OutageDetailsPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const [outage, setOutage] = useState<Outage | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Prevent duplicate network requests if the interval fires while a fetch is ongoing
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
                    setError(null); // Clear any previous errors on success
                }
            } catch (error: unknown) {
                // Only show error UI if we don't already have stale data to display
                if (isMounted && !hasOutageRef.current) {
                    setError(getErrorMessage(error));
                }
            } finally {
                isFetching.current = false;
                if (isMounted) setLoading(false);
            }
        };

        // Initial fetch
        fetchOutage();

        // Start 15-second polling
        const intervalId =
            outage?.status === "resolved" ? null : setInterval(fetchOutage, 15000);

        return () => {
            isMounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [id, outage?.status]);

    async function handleResolve() {
        if (!id) return;

        const initialValue = outage?.sla_status?.mttr_minutes?.toString() ?? "";
        const input = window.prompt("Enter MTTR in minutes", initialValue);
        if (input === null) return;

        const mttrMinutes = Number(input);
        if (!Number.isFinite(mttrMinutes) || mttrMinutes < 0) {
            setError("MTTR must be a non-negative number.");
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
        } catch (error: unknown) {
            setError(getErrorMessage(error));
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
                            <span className="font-medium">{new Date(outage.detected_at).toLocaleString()}</span>
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

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Impact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Affected Services</span>
                            <span className="font-medium">
                                {outage.affected_services.length > 0
                                    ? outage.affected_services.join(", ")
                                    : "Not provided"}
                            </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Subscribers</span>
                            <span className="font-medium">
                                {outage.affected_subscribers ?? "Unknown"}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
