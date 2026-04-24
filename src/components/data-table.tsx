"use client";

import {
    type ColumnDef,
    type VisibilityState,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export type TableDensity = "default" | "compact";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    columnVisibility?: VisibilityState;
    onColumnVisibilityChange?: (visibility: VisibilityState) => void;
    density?: TableDensity;
    onDensityChange?: (density: TableDensity) => void;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    columnVisibility,
    onColumnVisibilityChange,
    density = "default",
    onDensityChange,
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: { columnVisibility: columnVisibility ?? {} },
        onColumnVisibilityChange: (updater) => {
            if (!onColumnVisibilityChange) return;
            const next =
                typeof updater === "function"
                    ? updater(columnVisibility ?? {})
                    : updater;
            onColumnVisibilityChange(next);
        },
    });

    const cellPadding = density === "compact" ? "py-1 px-2 text-xs" : "py-2 px-4 text-sm";

    return (
        <div className="space-y-2">
            {(onColumnVisibilityChange || onDensityChange) && (
                <div className="flex flex-wrap items-center gap-3 pb-1">
                    {onDensityChange && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                            <span className="font-medium">Density:</span>
                            {(["default", "compact"] as TableDensity[]).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => onDensityChange(d)}
                                    className={`rounded px-2 py-0.5 capitalize border ${
                                        density === d
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "border-slate-200 hover:bg-slate-100"
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    )}
                    {onColumnVisibilityChange && (
                        <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
                            <span className="font-medium">Columns:</span>
                            {table.getAllLeafColumns().map((col) => {
                                const header = col.columnDef.header;
                                const label = typeof header === "string" ? header : col.id;
                                return (
                                    <label key={col.id} className="flex items-center gap-1 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={col.getIsVisible()}
                                            onChange={col.getToggleVisibilityHandler()}
                                            className="accent-slate-800"
                                        />
                                        {label}
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id}>
                            {hg.headers.map((h) => (
                                <TableHead key={h.id} className={cellPadding}>
                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id} className={cellPadding}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
