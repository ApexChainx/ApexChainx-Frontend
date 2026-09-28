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
    // The error appears both in the blocking-error list and as an inline
    // preview chip (issue #610).
    const matches = await screen.findAllByText(/Required field "end_time" is empty/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
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

  // ── Issue #610: preview diagnostics for row-level validation ──
  describe("preview diagnostics (#610)", () => {
    it("marks a malformed row inline without submitting", async () => {
      render(<BulkImportView />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [file("bad-row.csv", "service_id,start_time,end_time\ns1,2026-01-01,\n")] },
      });

      // Blocking error list flags the row (the inline chip duplicates the
      // message by design)...
      expect((await screen.findAllByText(/Required field "end_time" is empty/)).length).toBeGreaterThanOrEqual(2);
      // ...the preview marks the offending row...
      const badRow = screen.getByText("s1").closest("tr");
      expect(badRow?.className).toContain("bg-red-50");
      // ...with an inline error chip...
      expect(screen.getByText(/Row 2: Required field "end_time" is empty/)).toBeInTheDocument();
      // ...and an invalid-row readout in the header.
      expect(screen.getByText(/1 row invalid/)).toBeInTheDocument();
      // Submit stays disabled until resolved.
      expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
    });

    it("flags a malformed timestamp in a row", async () => {
      render(<BulkImportView />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, {
        target: {
          files: [file("bad-ts.csv", "service_id,start_time,end_time\ns1,not-a-date,2026-01-02")],
        },
      });
      // Message appears in the blocking list and the inline chip.
      expect((await screen.findAllByText(/Malformed timestamp in "start_time"/)).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
    });

    it("flags an invalid severity value", async () => {
      render(<BulkImportView />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, {
        target: {
          files: [
            file(
              "bad-severity.csv",
              "service_id,start_time,end_time,severity\ns1,2026-01-01,2026-01-02,catastrophic"
            ),
          ],
        },
      });
      expect((await screen.findAllByText(/Invalid severity "catastrophic"/)).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
    });

    it("accepts all valid severity values", async () => {
      render(<BulkImportView />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, {
        target: {
          files: [
            file(
              "severities.csv",
              "service_id,start_time,end_time,severity\ns1,2026-01-01,2026-01-02,critical\ns2,2026-01-01,2026-01-02,HIGH\ns3,2026-01-01,2026-01-02,medium\ns4,2026-01-01,2026-01-02,low"
            ),
          ],
        },
      });
      await screen.findByText("severities.csv");
      expect(screen.queryByText(/Invalid severity/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload file/i })).toBeEnabled();
    });

    it("flags an empty site_name column that is present but blank", async () => {
      render(<BulkImportView />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, {
        target: {
          files: [
            file(
              "bad-site.csv",
              "service_id,start_time,end_time,site_name\ns1,2026-01-01,2026-01-02,"
            ),
          ],
        },
      });
      expect((await screen.findAllByText(/Field "site_name" is present but empty/)).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
    });

    it("keeps missing optional columns silent", async () => {
      render(<BulkImportView />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file("minimal.csv", validCsv)] } });
      await screen.findByText("minimal.csv");
      expect(screen.queryByText(/is present but empty/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Malformed timestamp/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload file/i })).toBeEnabled();
    });

    it("chips appear per page while paging through a multi-page invalid file", async () => {
      const lines = ["service_id,start_time,end_time,severity"];
      for (let i = 1; i <= 25; i++) {
        lines.push(`s${i},2026-01-01,2026-01-02,${i % 2 === 0 ? "bogus" : "high"}`);
      }
      render(<BulkImportView />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file("multi-bad.csv", lines.join("\n"))] } });

      expect(await screen.findByText(/rows invalid/)).toBeInTheDocument();
      // Page 1 chips only cover file rows 2–11 (the first 10 data rows); row
      // 4 of the file is data row 3. Chips live in a nested span, so match on
      // the wrapping chip element.
      const pageChip = (text: RegExp) => screen.getByText(text).closest("span.rounded-full");
      expect(pageChip(/Row 3: Invalid severity/)).not.toBeNull();
      expect(screen.queryByText(/Row 13: Invalid severity/)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText(/Row 13: Invalid severity/)).toBeInTheDocument();
      expect(screen.queryByText(/Row 3: Invalid severity/)).not.toBeInTheDocument();
    });

    it("marks a malformed JSON record inline", async () => {
      render(<BulkImportView />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, {
        target: {
          files: [
            new File(
              [
                JSON.stringify([
                  { service_id: "s1", start_time: "2026-01-01", end_time: "2026-01-02" },
                  { service_id: "s2", start_time: "nope", end_time: "2026-01-02" },
                ]),
              ],
              "bad.json",
              { type: "application/json" }
            ),
          ],
        },
      });
      expect((await screen.findAllByText(/Malformed timestamp in "start_time"/)).length).toBeGreaterThanOrEqual(2);
      const badRow = screen.getByText("s2").closest("tr");
      expect(badRow?.className).toContain("bg-red-50");
      expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
    });
  });
});
