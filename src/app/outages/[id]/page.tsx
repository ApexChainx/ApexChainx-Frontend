"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    getOutage,
    resolveOutage,
} from "@/services/outages";
import type { Outage } from "@/types/outages";

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
        } catch (err: unknown) {
            setError(err.message || "Failed to resolve outage");
        } finally {
            setResolving(false);
        }
    }

    if (loading) {
        return <div style={{ padding: 24 }}>Loading outage…</div>;
    }

    if (error) {
        return (
            <div style={{ padding: 24, color: "red" }}>
                {error}
            </div>
        );
    }

    if (!outage) {
        return <div style={{ padding: 24 }}>Outage not found</div>;
    }

    const isResolved = outage.status === "resolved";

    return (
        <div style={{ padding: 24 }}>
            <h1>Outage {outage.id}</h1>

            <p><strong>Site:</strong> {outage.site_name}</p>
            <p><strong>Severity:</strong> {outage.severity}</p>
            <p><strong>Status:</strong> {outage.status}</p>

            {outage.sla_status && (
                <div style={{ marginTop: 16 }}>
                    <h3>SLA Result</h3>
                    <p>Status: {outage.sla_status.status}</p>
                    <p>
                        Amount:{" "}
                        {outage.sla_status.amount > 0 ? "+" : ""}
                        {outage.sla_status.amount}
                    </p>
                    <p>Rating: {outage.sla_status.rating}</p>
                </div>
            )}


            <hr style={{ margin: "24px 0" }} />

            <button
                onClick={handleResolve}
                disabled={isResolved || resolving}
                style={{
                    padding: "10px 16px",
                    cursor: isResolved ? "not-allowed" : "pointer",
                }}
            >
                {isResolved
                    ? "Outage Resolved"
                    : resolving
                        ? "Resolving…"
                        : "Resolve Outage"}
            </button>
        </div>
    );
}
