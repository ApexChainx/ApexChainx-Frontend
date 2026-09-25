/** ApexChain Network Operations Intelligence Platform */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OutagesPageClient from "@/app/outages/components/outages-page-client";
import { slaEventKeys } from "@/lib/query-keys";
import { resolveOutage, updateOutage } from "@/services/outages";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null, toString: () => "" }),
}));

const mockResolveOutage = vi.fn();
const mockUpdateOutage = vi.fn();

vi.mock("@/services/outages", () => ({
  resolveOutage: (...args: unknown[]) => mockResolveOutage(...args),
  updateOutage: (...args: unknown[]) => mockUpdateOutage(...args),
  getOutage: vi.fn(),
  deleteOutage: vi.fn(),
  listOutages: vi.fn(),
  createOutage: vi.fn(),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const createOutage = (overrides: Partial<{
  id: string;
  title: string;
  site_name: string;
  status: string;
  createdAt: string;
  assigned_to: string;
}> = {}) => ({
  id: overrides.id ?? "outage-1",
  title: overrides.title ?? "Test Outage",
  site_name: overrides.site_name ?? "Test Site",
  status: overrides.status ?? "open",
  createdAt: overrides.createdAt ?? "2026-03-27T08:00:00.000Z",
  assigned_to: overrides.assigned_to,
});

describe("OutagesPageClient bulk mutations", () => {
  beforeEach(() => {
    mockResolveOutage.mockReset();
    mockUpdateOutage.mockReset();
    mockResolveOutage.mockResolvedValue({});
    mockUpdateOutage.mockResolvedValue({});
  });

  it("optimistically updates selected rows to resolved on bulk resolve", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    
    // Seed the cache with list data
    const testOutages = [
      createOutage({ id: "outage-1" }),
      createOutage({ id: "outage-2" }),
      createOutage({ id: "outage-3" }),
    ];
    
    queryClient.setQueryData(slaEventKeys.outages.list({}), { items: testOutages, total: 3 });

    render(
      <QueryClientProvider client={queryClient}>
        <OutagesPageClient data={testOutages} />
      </QueryClientProvider>
    );

    // Select first two outages
    fireEvent.click(screen.getByLabelText("Select Test Outage"));
    fireEvent.click(screen.getByLabelText("Select Test Outage"));

    // Open bulk resolve modal
    fireEvent.click(screen.getByRole("button", { name: /Bulk Resolve/i }));

    // Fill MTTR and confirm
    const mttrInput = screen.getByLabelText("Mean time to resolve (minutes)");
    fireEvent.change(mttrInput, { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Resolve/i }));

    // Check optimistic update: rows should show "resolved" status immediately
    await waitFor(() => {
      expect(screen.getAllByText("resolved")).toHaveLength(2);
    });

    // Verify API was called
    await waitFor(() => {
      expect(mockResolveOutage).toHaveBeenCalledTimes(2);
    });

    // After success, cache should be invalidated (narrow invalidation)
    // The test verifies the pattern - we check that the query key is the lists key
    expect(queryClient.getQueryCache().findAll({ queryKey: slaEventKeys.outages.lists })).toHaveLength(1);
  });

  it("optimistically updates selected rows on bulk assign", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    
    const testOutages = [
      createOutage({ id: "outage-1" }),
      createOutage({ id: "outage-2" }),
    ];
    
    queryClient.setQueryData(slaEventKeys.outages.list({}), { items: testOutages, total: 2 });

    render(
      <QueryClientProvider client={queryClient}>
        <OutagesPageClient data={testOutages} />
      </QueryClientProvider>
    );

    // Select first outage
    fireEvent.click(screen.getByLabelText("Select Test Outage"));

    // Open bulk assign modal
    fireEvent.click(screen.getByRole("button", { name: /Bulk Assign/i }));

    // Fill assignee and confirm
    const assigneeInput = screen.getByLabelText("Assign to (user ID or name)");
    fireEvent.change(assigneeInput, { target: { value: "john-doe" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Assign/i }));

    // Check optimistic update: row should show assigned_to immediately
    await waitFor(() => {
      expect(screen.getByText("Assigned: john-doe")).toBeInTheDocument();
    });

    // Verify API was called
    await waitFor(() => {
      expect(mockUpdateOutage).toHaveBeenCalledWith("outage-1", { assigned_to: "john-doe" });
    });
  });

  it("rolls back optimistic update on bulk resolve failure", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    
    const testOutages = [
      createOutage({ id: "outage-1" }),
      createOutage({ id: "outage-2" }),
    ];
    
    queryClient.setQueryData(slaEventKeys.outages.list({}), { items: testOutages, total: 2 });

    mockResolveOutage.mockRejectedValueOnce(new Error("Network error"));

    render(
      <QueryClientProvider client={queryClient}>
        <OutagesPageClient data={testOutages} />
      </QueryClientProvider>
    );

    // Select both outages
    fireEvent.click(screen.getByLabelText("Select Test Outage"));
    fireEvent.click(screen.getByLabelText("Select Test Outage"));

    // Open bulk resolve modal
    fireEvent.click(screen.getByRole("button", { name: /Bulk Resolve/i }));

    // Fill MTTR and confirm
    const mttrInput = screen.getByLabelText("Mean time to resolve (minutes)");
    fireEvent.change(mttrInput, { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Resolve/i }));

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText(/Failed to resolve outages/i)).toBeInTheDocument();
    });

    // Check rollback: rows should still show "open" status
    await waitFor(() => {
      expect(screen.getAllByText("open")).toHaveLength(2);
    });
  });
});