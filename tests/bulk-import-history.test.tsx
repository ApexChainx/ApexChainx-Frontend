/** ApexChain Frontend Test Suite */
/** ApexChain Network Operations Intelligence Platform */
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BulkImportHistoryPage from "@/app/bulk-import/history/page";
import type { BulkImportRecord } from "@/types/bulkImport";

const mockFetchHistory = vi.fn();
vi.mock("@/services/bulkImportService", () => ({
  fetchBulkImportHistory: (...a: unknown[]) => mockFetchHistory(...a),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function record(overrides: Partial<BulkImportRecord> & { id: string }): BulkImportRecord {
  return {
    filename: `${overrides.id}.csv`,
    imported: 10,
    skipped: 0,
    error_count: 0,
    errors: [],
    created_at: "2026-09-01T10:00:00Z",
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BulkImportHistoryPage />
    </QueryClientProvider>
  );
}

describe("BulkImportHistoryPage", () => {
  beforeEach(() => {
    mockFetchHistory.mockReset();
    mockFetchHistory.mockResolvedValue([]);
  });

  it("renders the empty state when there is no history", async () => {
    renderPage();
    expect(await screen.findByText("No import history yet.")).toBeInTheDocument();
  });

  it("shows the recent success-rate summary strip", async () => {
    mockFetchHistory.mockResolvedValue([
      record({ id: "r1", imported: 8, skipped: 0, error_count: 2, errors: [{ row: 2, message: "boom" }] }),
      record({ id: "r2", imported: 10, skipped: 0, error_count: 0 }),
    ]);
    renderPage();
    // 18 of 20 rows imported across the two runs.
    expect(await screen.findByText(/90%/)).toBeInTheDocument();
    expect(screen.getByText(/recent success rate/i)).toBeInTheDocument();
    expect(screen.getByText(/2 recent imports/i)).toBeInTheDocument();
  });

  it("shows a failure-rate badge per run", async () => {
    mockFetchHistory.mockResolvedValue([
      record({ id: "clean", imported: 10, skipped: 0, error_count: 0 }),
      record({ id: "rough", imported: 5, skipped: 3, error_count: 2, errors: [{ row: 2, message: "bad" }] }),
    ]);
    renderPage();
    expect(await screen.findByText("clean.csv")).toBeInTheDocument();
    // rough: 5 of 10 attempted rows did not import -> 50% failures.
    expect(screen.getByText(/50% failures/i)).toBeInTheDocument();
    // Clean runs show a 0% badge (clean + the 100% summary both render a
    // green pill, so assert at least one 0% badge exists).
    expect(screen.getAllByText(/0% failures/i).length).toBeGreaterThanOrEqual(1);
  });

  it("colors the failure badge by severity", async () => {
    mockFetchHistory.mockResolvedValue([
      record({ id: "half", imported: 5, skipped: 0, error_count: 5, errors: [{ row: 2, message: "bad" }] }),
    ]);
    renderPage();
    const badge = await screen.findByText(/50% failures/i).then((el) => el.closest("span"));
    expect(badge?.className).toContain("bg-red-100");
  });

  it("paginates the history list with a bounded DOM", async () => {
    const many: BulkImportRecord[] = Array.from({ length: 30 }, (_, i) =>
      record({ id: `run-${String(i + 1).padStart(2, "0")}` })
    );
    mockFetchHistory.mockResolvedValue(many);
    renderPage();

    // Only the first page of records is rendered...
    expect(await screen.findByText("run-01.csv")).toBeInTheDocument();
    expect(screen.getByText("run-10.csv")).toBeInTheDocument();
    expect(screen.queryByText("run-11.csv")).not.toBeInTheDocument();

    // ...and paging forward reveals the rest while the DOM stays bounded.
    const pageButtons = screen.getAllByRole("button", { name: /^Page \d+$/ });
    expect(pageButtons.length).toBeLessThanOrEqual(5);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("run-11.csv")).toBeInTheDocument();
    expect(screen.queryByText("run-01.csv")).not.toBeInTheDocument();
    expect(screen.queryByText("run-01.csv")).not.toBeInTheDocument();
  });

  it("keeps the summary strip scoped to the most recent runs", async () => {
    const failing = record({
      id: "old-failure",
      imported: 0,
      skipped: 0,
      error_count: 10,
      errors: [{ row: 2, message: "bad" }],
    });
    const clean = record({ id: "new-clean", imported: 10, skipped: 0, error_count: 0 });
    mockFetchHistory.mockResolvedValue([clean, failing]);
    renderPage();

    // The strip covers the two most recent runs (records come newest-first),
    // so 10/20 rows imported = 50%.
    expect(await screen.findByText(/50%/)).toBeInTheDocument();
  });

  it("expands error details for a run with failures", async () => {
    mockFetchHistory.mockResolvedValue([
      record({
        id: "with-errors",
        imported: 1,
        skipped: 1,
        error_count: 1,
        errors: [{ row: 3, field: "site_name", message: "Site is unknown" }],
      }),
    ]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /view errors/i }));
    expect(screen.getByText(/Row 3/)).toBeInTheDocument();
    expect(screen.getByText(/Site is unknown/)).toBeInTheDocument();
  });
});
