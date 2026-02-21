"use client";

import Link from "next/link";
import { useOutages } from "@/features/outages/hooks/useOutages";
import { useOutagesTableState } from "@/hooks/useOutagesTableState";
import type { Outage } from "@/types/outages";

export function OutagesPageClient() {
    const { state } = useOutagesTableState();
    const { data, isLoading, isError } = useOutages(state);

    if (isLoading) {
        return <div>Loading outages...</div>;
    }

    if (isError) {
        return <div>Error loading outages</div>;
    }

    const outages = (data ?? []) as Outage[];

    if (outages.length === 0) {
        return <div>No outages found.</div>;
    }

    return (
        <div style={{ padding: 24 }}>
            <h1>Outages</h1>

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: 16,
                }}
            >
                <thead>
                    <tr>
                        <th style={th}>ID</th>
                        <th style={th}>Site</th>
                        <th style={th}>Severity</th>
                        <th style={th}>Status</th>
                        <th style={th}>Detected At</th>
                    </tr>
                </thead>
                <tbody>
                    {outages.map((o) => (
                        <tr key={o.id}>
                            <td style={td}>
                                <Link href={`/outages/${o.id}`}>
                                    {o.id}
                                </Link>
                            </td>
                            <td style={td}>{o.site_name}</td>
                            <td style={td}>{o.severity}</td>
                            <td style={td}>{o.status}</td>
                            <td style={td}>
                                {new Date(o.detected_at).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const th: React.CSSProperties = {
    borderBottom: "1px solid #ddd",
    textAlign: "left",
    padding: "8px",
};

const td: React.CSSProperties = {
    borderBottom: "1px solid #eee",
    padding: "8px",
};
