/** ApexChain Network Operations Intelligence Platform */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { DataTable } from "@/components/data-table";

interface Row {
  id: string;
  name: string;
  status: string;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status" },
];

const ALL_ROWS: Row[] = [
  { id: "r1", name: "Alpha", status: "open" },
  { id: "r2", name: "Beta", status: "open" },
  { id: "r3", name: "Gamma", status: "resolved" },
  { id: "r4", name: "Delta", status: "open" },
  { id: "r5", name: "Epsilon", status: "resolved" },
];

const PAGE_SIZE = 2;

/**
 * A controlled harness that slices `ALL_ROWS` by page and feeds the slice to
 * DataTable, exactly like a manual-pagination consumer. Selection is keyed by
 * stable row ids returned from `getRowId`.
 */
function SelectionHarness({
  getRowId = (row: Row) => row.id,
}: {
  getRowId?: (row: Row) => string;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const pageData = ALL_ROWS.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <DataTable
        columns={columns}
        data={pageData}
        enableRowSelection
        getRowId={getRowId}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        pagination={{ pageIndex, pageSize: PAGE_SIZE }}
        onPaginationChange={(next) => setPageIndex(next.pageIndex)}
        pageCount={Math.ceil(ALL_ROWS.length / PAGE_SIZE)}
        rowCount={ALL_ROWS.length}
      />
      <span data-testid="selection">{JSON.stringify(rowSelection)}</span>
    </div>
  );
}

function rowForName(name: string): HTMLElement {
  const cell = screen.getByText(name);
  const row = cell.closest("tr");
  if (!row) throw new Error(`no row for ${name}`);
  return row as HTMLElement;
}

describe("DataTable row selection identity", () => {
  it("requires getRowId when row selection is enabled", () => {
    expect(() =>
      render(<DataTable columns={columns} data={ALL_ROWS} enableRowSelection />),
    ).toThrow(/getRowId is required when enableRowSelection/);
  });

  it("does not require getRowId when row selection is disabled", () => {
    expect(() =>
      render(<DataTable columns={columns} data={ALL_ROWS} />),
    ).not.toThrow();
  });

  it("keeps a row selected across pagination using its stable id", () => {
    render(<SelectionHarness />);

    // Page 1 shows Alpha (r1) and Beta (r2).
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    const alphaRow = rowForName("Alpha");
    fireEvent.click(alphaRow);

    // Selection is keyed by the stable id, not the row index.
    expect(JSON.parse(screen.getByTestId("selection").textContent ?? "{}")).toEqual({
      r1: true,
    });
    expect(alphaRow).toHaveAttribute("data-state", "selected");

    // Navigate to page 2 (Gamma, Delta). With index-based ids the selection
    // would silently transfer to the first row of the new page.
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Gamma")).toBeInTheDocument();

    // The new page's rows are NOT selected, and the map still holds r1.
    expect(rowForName("Gamma")).not.toHaveAttribute("data-state", "selected");
    expect(rowForName("Delta")).not.toHaveAttribute("data-state", "selected");
    expect(JSON.parse(screen.getByTestId("selection").textContent ?? "{}")).toEqual({
      r1: true,
    });

    // Returning to page 1 keeps Alpha selected.
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(rowForName("Alpha")).toHaveAttribute("data-state", "selected");
    expect(rowForName("Beta")).not.toHaveAttribute("data-state", "selected");
  });

  it("selecting an additional row adds its stable id to the map", () => {
    render(<SelectionHarness />);

    fireEvent.click(rowForName("Alpha")); // r1
    fireEvent.click(rowForName("Beta")); // r2

    expect(JSON.parse(screen.getByTestId("selection").textContent ?? "{}")).toEqual({
      r1: true,
      r2: true,
    });
  });
});
