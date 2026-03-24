import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Outage } from "@/types/outages";

// Dedicated cell component to handle row-level state
const ActionCell = ({ row }: { row: { original: Outage } }) => {
    const [isRecomputing, setIsRecomputing] = useState(false);
    const outage = row.original;

    const handleRecompute = async () => {
        setIsRecomputing(true);
        try {
            await api.post(`/outages/${outage.id}/recompute-sla`);
            
            // To update the UI without a full refresh, you will trigger your state 
            // refresh here. If you use React Query, it would be queryClient.invalidateQueries(). 
            // If using Next.js App Router, it might be router.refresh().
            
        } catch (error) {
            console.error("Failed to recompute SLA:", error);
            // Handle error toast here
        } finally {
            setIsRecomputing(false);
        }
    };

    // Only show the recompute button if the outage is resolved
    if (outage.status !== "resolved") {
        return null;
    }

    return (
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRecompute} 
            disabled={isRecomputing}
        >
            {isRecomputing ? "Recomputing..." : "Recompute SLA"}
        </Button>
    );
};

export const columns: ColumnDef<Outage>[] = [
    { accessorKey: "id", header: "ID" },
    {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => (
            <Badge variant="destructive">{row.original.severity}</Badge>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge
                variant={row.original.status === "open" ? "destructive" : "default"}
            >
                {row.original.status}
            </Badge>
        ),
    },
    { accessorKey: "detected_at", header: "Detected" },
    { accessorKey: "resolved_at", header: "Resolved" },
    {
        id: "actions",
        header: "Actions",
        cell: ActionCell,
    },
];
