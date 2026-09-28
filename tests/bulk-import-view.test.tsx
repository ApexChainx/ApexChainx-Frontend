/** ApexChain Frontend Test Suite */
/** ApexChain Network Operations Intelligence Platform */
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BulkImportView from "@/components/bulk-import/bulk-import-view";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const mockBulkImport = vi.fn();
vi.mock("@/services/bulkImportService", () => ({
  bulkImportOutages: (...a: unknown[]) => mockBulkImport(...a),
}));

const validCsv = "service_id,start_time,end_time\ns1,2026-01-01,2026-01-02";
const file = (name: string, content: string) => new File([content], name, { type: "text/csv" });

describe("BulkImportView", () => {
  beforeEach(() => mockBulkImport.mockReset());

  it("renders upload area with disabled button", () => {
    render(<BulkImportView />);
    expect(screen.getByText("Bulk Outage Import")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
  });

  it("rejects unsupported file types", async () => {
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "data.txt", { type: "text/plain" })] } });
    expect(await screen.findByText(/Invalid file type/)).toBeInTheDocument();
  });

  it("shows blocking errors for CSV missing required columns", async () => {
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("bad.csv", "name,value\nfoo,bar")] } });
    expect(await screen.findByText(/Missing required columns/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
  });

  it("warns about unrecognized columns but allows upload to proceed", async () => {
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [file("with-extra.csv", "service_id,start_time,end_time,mystery_col\ns1,2026-01-01,2026-01-02,x")],
      },
    });
    expect(await screen.findByText(/Unrecognized column.*mystery_col/)).toBeInTheDocument();
    // Warning is non-blocking — upload stays enabled
    expect(screen.getByRole("button", { name: /upload file/i })).toBeEnabled();
  });

  it("recognizes optional known columns without warnings", async () => {
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [file("with-optional.csv", "service_id,start_time,end_time,severity,description\ns1,2026-01-01,2026-01-02,high,disk full")],
      },
    });
    expect(await screen.findByText("with-optional.csv")).toBeInTheDocument();
    expect(screen.queryByText(/Unrecognized column/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload file/i })).toBeEnabled();
  });

  it("catches row errors beyond the preview window across the whole file", async () => {
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    // 10 rows: only 5 are previewed, but row 10 is missing end_time
    const rows = ["service_id,start_time,end_time"];
    for (let i = 1; i <= 9; i++) rows.push(`s${i},2026-01-0${i},2026-01-0${i + 1}`);
    rows.push("s10,2026-01-10,");
    fireEvent.change(input, {
      target: { files: [file("deep-error.csv", rows.join("\n"))] },
    });
    expect(await screen.findByText(/Required field "end_time" is empty/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
  });

  it("shows success summary after valid upload", async () => {
    mockBulkImport.mockResolvedValue({ imported: 3, skipped: 1, errors: [] });
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("data.csv", validCsv)] } });
    await screen.findByText("data.csv");
    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));
    expect(await screen.findByText("Import Summary")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows server validation errors in summary", async () => {
    mockBulkImport.mockResolvedValue({ imported: 0, skipped: 1, errors: [{ row: 2, message: "Invalid date" }] });
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("data.csv", validCsv)] } });
    await screen.findByText("data.csv");
    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));
    expect(await screen.findByText("Invalid date")).toBeInTheDocument();
  });

  // ── Issue #609: paginate the preview and surface per-row validation state ──
  describe("preview pagination (#609)", () => {
    function largeCsv(rowCount: number): string {
      const lines = ["service_id,start_time,end_time"];
      for (let i = 1; i <= rowCount; i++) {
        lines.push(`s${i},2026-01-01,2026-01-02`);
      }
      return lines.join("\n");
    }

    async function renderWithFile(content: string) {
      render(<BulkImportView />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file("large.csv", content)] } });
      await screen.findByText("large.csv");
    }

    it("shows the first page of rows with a row-count readout", async () => {
      await renderWithFile(largeCsv(30));
      expect(screen.getByText("30 rows")).toBeInTheDocument();
      // First page of 10 rows is visible...
      expect(screen.getByText("s1")).toBeInTheDocument();
      expect(screen.getByText("s10")).toBeInTheDocument();
      // ...and rows beyond the first page are not
      expect(screen.queryByText("s11")).not.toBeInTheDocument();
    });

    it("pages forward and back through the preview", async () => {
      await renderWithFile(largeCsv(30));

      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText("s11")).toBeInTheDocument();
      expect(screen.queryByText("s1")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /previous/i }));
      expect(screen.getByText("s1")).toBeInTheDocument();
    });

    it("jumps to a numbered page and caps buttons to a bounded window", async () => {
      await renderWithFile(largeCsv(200));

      // 200 rows / 10 per page = 20 pages; the window keeps only 5 buttons
      let pageButtons = screen.getAllByRole("button", { name: /^Page \d+$/ });
      expect(pageButtons.length).toBeLessThanOrEqual(5);

      // Page forward to the end; the window slides and stays bounded.
      const next = () => screen.getByRole("button", { name: /next/i });
      for (let i = 0; i < 19; i++) fireEvent.click(next());
      expect(screen.getByText("s200")).toBeInTheDocument();
      expect(next()).toBeDisabled();

      pageButtons = screen.getAllByRole("button", { name: /^Page \d+$/ });
      expect(pageButtons.length).toBeLessThanOrEqual(5);
      expect(screen.getByRole("button", { name: "Page 20" })).toBeInTheDocument();
    });

    it("marks rows with errors and pages through to reach them", async () => {
      const lines = ["service_id,start_time,end_time"];
      for (let i = 1; i <= 25; i++) {
        lines.push(i === 18 ? "s18,2026-01-01," : `s${i},2026-01-01,2026-01-02`);
      }
      await renderWithFile(lines.join("\n"));

      // The blocking error is reported up front...
      expect(screen.getByText(/Required field "end_time" is empty/)).toBeInTheDocument();
      // ...and the offending row is marked on page 2 without submitting.
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      const brokenRow = screen.getByText("s18").closest("tr");
      expect(brokenRow).not.toBeNull();
      expect(brokenRow?.className).toContain("bg-red-50");
      expect(screen.getByText("s17").closest("tr")?.className).not.toContain("bg-red-50");
    });

    it("does not render pagination controls for small files", async () => {
      await renderWithFile(largeCsv(8));
      expect(screen.getByText("8 rows")).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: /preview pagination/i })).not.toBeInTheDocument();
    });
  });
});
