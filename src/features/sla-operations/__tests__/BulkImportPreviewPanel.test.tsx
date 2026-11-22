/** ApexChain Frontend Test Suite */
/** Issue #1027 — bulk import preview panel rows and validation summaries. */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BulkImportPreviewPanel } from "@/features/sla-operations/components/BulkImportPreviewPanel";
import type { BulkImportPreview } from "@/features/sla-operations/types/bulk-import-preview";

const preview: BulkImportPreview = {
  importId: "import-1",
  fileName: "outages-preview.csv",
  headers: ["Site", "Severity"],
  rows: [
    {
      rowNumber: 1,
      status: "valid",
      values: { Site: "Lagos", Severity: "high" },
      issues: [],
    },
    {
      rowNumber: 2,
      status: "invalid",
      values: { Site: "Abuja", Severity: "urgent" },
      issues: [
        { field: "Severity", severity: "error", message: "Unknown severity." },
        { field: "Site", severity: "warning", message: "Site not recognised." },
      ],
    },
  ],
  summary: {
    totalRows: 2,
    validRows: 1,
    invalidRows: 1,
    warningRows: 0,
    ignoredRows: 0,
    errorCount: 1,
    warningCount: 1,
    infoCount: 0,
  },
  generatedAt: "2026-05-10T09:00:00Z",
};

/** Body rows of the preview table, header row excluded. */
function bodyRows(): HTMLElement[] {
  return screen.getAllByRole("row").slice(1);
}

function cells(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");
}

describe("BulkImportPreviewPanel states (#1027)", () => {
  it("renders a labelled region with the panel heading", () => {
    render(<BulkImportPreviewPanel preview={preview} />);

    const region = screen.getByRole("region", { name: "Bulk import preview" });
    expect(region).toHaveAttribute("aria-busy", "false");
    expect(within(region).getByRole("heading", { name: "Bulk import preview" })).toBeInTheDocument();
  });

  it("announces loading and hides the table", () => {
    render(<BulkImportPreviewPanel preview={preview} isLoading />);

    expect(screen.getByRole("region", { name: "Bulk import preview" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading import preview...");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the error as an alert and hides the table", () => {
    render(<BulkImportPreviewPanel preview={preview} error="Preview failed." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Preview failed.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the empty message without a preview", () => {
    render(<BulkImportPreviewPanel preview={null} />);

    expect(screen.getByText("No import rows to preview.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the empty message when the preview has no rows", () => {
    render(<BulkImportPreviewPanel preview={{ ...preview, rows: [] }} />);

    expect(screen.getByText("No import rows to preview.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("BulkImportPreviewPanel rows (#1027)", () => {
  it("summarises the file and validation counts", () => {
    render(<BulkImportPreviewPanel preview={preview} />);

    expect(
      screen.getByText(
        "outages-preview.csv: 2 rows, 1 valid, 1 invalid, 0 with warnings, 1 errors",
      ),
    ).toBeInTheDocument();
  });

  it("renders a table labelled with the file name", () => {
    render(<BulkImportPreviewPanel preview={preview} />);

    const table = screen.getByRole("table", { name: "Import rows for outages-preview.csv" });
    expect(within(table).getByRole("caption")).toHaveClass("sr-only");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Row", "Status", "Site", "Severity", "Findings"]);
  });

  it("renders one row per preview row with its values", () => {
    render(<BulkImportPreviewPanel preview={preview} />);

    expect(bodyRows()).toHaveLength(2);
    expect(cells(bodyRows()[0]!)).toEqual(["1", "valid", "Lagos", "high", "-"]);
    expect(cells(bodyRows()[1]!).slice(0, 4)).toEqual(["2", "invalid", "Abuja", "urgent"]);
  });

  it("renders every validation finding for a row", () => {
    render(<BulkImportPreviewPanel preview={preview} />);

    const findings = within(bodyRows()[1]!).getAllByRole("listitem");
    expect(findings.map((item) => item.textContent)).toEqual([
      "error: Severity - Unknown severity.",
      "warning: Site - Site not recognised.",
    ]);
  });

  it("renders a dash when a row has no findings", () => {
    render(<BulkImportPreviewPanel preview={preview} />);

    const findings = cells(bodyRows()[0]!).at(-1);
    expect(findings).toBe("-");
    expect(within(bodyRows()[0]!).queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders an empty cell for a missing column value", () => {
    render(
      <BulkImportPreviewPanel
        preview={{
          ...preview,
          rows: [{ rowNumber: 1, status: "warning", values: { Site: "Lagos" }, issues: [] }],
        }}
      />,
    );

    expect(cells(bodyRows()[0]!)).toEqual(["1", "warning", "Lagos", "", "-"]);
  });

  it("renders each additional column header from the preview", () => {
    render(
      <BulkImportPreviewPanel
        preview={{
          ...preview,
          headers: ["Site", "Severity", "Started"],
          rows: [
            {
              rowNumber: 1,
              status: "valid",
              values: { Site: "Lagos", Severity: "high", Started: "2026-05-01" },
              issues: [],
            },
          ],
        }}
      />,
    );

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Row", "Status", "Site", "Severity", "Started", "Findings"]);
    expect(cells(bodyRows()[0]!)).toEqual([
      "1",
      "valid",
      "Lagos",
      "high",
      "2026-05-01",
      "-",
    ]);
  });
});
