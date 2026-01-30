import { ColumnDef } from "@tanstack/react-table";
import { Outage } from "@/lib/api/outages";
import { Badge } from "@/components/ui/badge";

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
    { accessorKey: "started_at", header: "Started" },
    { accessorKey: "resolved_at", header: "Resolved" },
];