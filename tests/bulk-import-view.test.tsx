/** ApexChain Frontend Test Suite */
/** ApexChain Network Operations Intelligence Platform */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BulkImportView from "@/components/bulk-import/bulk-import-view";
import type { BulkImportProgress, BulkImportStage } from "@/types/bulkImport";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const mockBulkImport = vi.fn();
vi.mock("@/services/bulkImportService", () => ({
  bulkImportOutages: (...a: unknown[]) => mockBulkImport(...a),
}));

const validCsv = "service_id,start_time,end_time\ns1,2026-01-01,2026-01-02";
const file = (name: string, content: string) => new File([content], name, { type: "text/csv" });

/** Issue #614 — one fake staged progress event per import stage. */
const stagedProgress: BulkImportProgress[] = [
  { stage: "parsing", processed: 0, total: 0, percent: 0 },
  { stage: "validating", processed: 0, total: 0, percent: 10 },
  { stage: "submitting", processed: 512, total: 1024, percent: 50 },
  { stage: "applying", processed: 1024, total: 1024, percent: 95 },
  { stage: "done", processed: 1024, total: 1024, percent: 100 },
];

const tick = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

/** Drives the fake service through the staged events with a small delay so
 * each render is observable, then resolves with the import result. */
function mockStagedImport(recorded: BulkImportProgress[]) {
  mockBulkImport.mockImplementation(async (_file: File, options?: { onProgress?: (p: BulkImportProgress) => void }) => {
    for (const event of stagedProgress) {
      options?.onProgress?.(event);
      recorded.push(event);
      await tick();
    }
    return { imported: 2, skipped: 0, errors: [] };
  });
}

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

  // Issue #614 — staged progress strip.
  it("drives the progress strip through every stage to completion", async () => {
    const recorded: BulkImportProgress[] = [];
    mockStagedImport(recorded);
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("data.csv", validCsv)] } });
    await screen.findByText("data.csv");

    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

    // The strip appears and transitions through the stages.
    expect(await screen.findByText("Parsing file…")).toBeInTheDocument();
    expect(await screen.findByText("Validating file…")).toBeInTheDocument();
    expect(await screen.findByText("Uploading file…")).toBeInTheDocument();
    expect(await screen.findByText("Applying import…")).toBeInTheDocument();

    // The bar tracks the overall percent up to completion.
    const bar = screen.getByRole("progressbar", { name: "Import progress" });
    await waitFor(() => expect(bar).toHaveAttribute("aria-valuenow", "100"));
    expect(screen.getByText("Done")).toBeInTheDocument();

    // The service saw the full stage sequence, ending at 100%.
    expect(recorded.map((p) => p.stage)).toEqual([
      "parsing",
      "validating",
      "submitting",
      "applying",
      "done",
    ] satisfies BulkImportStage[]);
    expect(recorded[recorded.length - 1]?.percent).toBe(100);

    // Completion hands off to the result panel.
    expect(await screen.findByText("Import Summary")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("replaces the submit button with the strip while an import is in flight", async () => {
    mockStagedImport([]);
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("data.csv", validCsv)] } });
    await screen.findByText("data.csv");

    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));
    await screen.findByText("Uploading file…");

    // No resubmit affordance exists mid-import; the file input is disabled.
    expect(screen.queryByRole("button", { name: /upload file/i })).not.toBeInTheDocument();
    expect(document.querySelector("input[type='file']")).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeEnabled();
  });

  it("cancels an in-flight import from the strip and restores the submit button", async () => {
    let observedSignal: AbortSignal | null = null;
    mockBulkImport.mockImplementation(
      async (_file: File, options?: { signal?: AbortSignal }) => {
        observedSignal = options?.signal ?? null;
        options?.onProgress?.({ stage: "submitting", processed: 10, total: 100, percent: 50 });
        await new Promise((_, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError"))
          );
        });
        return { imported: 0, skipped: 0, errors: [] };
      }
    );
    render(<BulkImportView />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("data.csv", validCsv)] } });
    await screen.findByText("data.csv");

    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));
    await screen.findByText("Uploading file…");
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(observedSignal?.aborted).toBe(true));
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    // The file is retained, so the operator can resubmit after cancelling.
    expect(await screen.findByRole("button", { name: /upload file/i })).toBeEnabled();
  });
});
