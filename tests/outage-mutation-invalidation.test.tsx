/** ApexChain Frontend Test Suite */
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";

import {
  useDeleteOutage,
  useResolveOutage,
} from "@/features/outages/hooks/useOutageMutations";
import { slaEventKeys } from "@/lib/query-keys";

const mockDeleteOutage = vi.fn();
const mockResolveOutage = vi.fn();

vi.mock("@/services/outages", () => ({
  deleteOutage: (...args: unknown[]) => mockDeleteOutage(...args),
  resolveOutage: (...args: unknown[]) => mockResolveOutage(...args),
  getOutage: vi.fn(),
}));

/**
 * Mounts every aggregate query an outage mutation is expected to refresh and
 * counts how many times each query function runs, so a test can assert that a
 * mutation actually busts each family's cache.
 */
const fetchCounts = {
  outages: 0,
  dashboard: 0,
  sla: 0,
  payments: 0,
  disputes: 0,
};

function AggregateHarness() {
  useQuery({
    queryKey: slaEventKeys.outages.list({}),
    queryFn: async () => {
      fetchCounts.outages += 1;
      return [];
    },
  });
  useQuery({
    queryKey: ["dashboard-metrics", {}],
    queryFn: async () => {
      fetchCounts.dashboard += 1;
      return [];
    },
  });
  useQuery({
    queryKey: ["sla", "config"],
    queryFn: async () => {
      fetchCounts.sla += 1;
      return [];
    },
  });
  useQuery({
    queryKey: slaEventKeys.payments.list({}),
    queryFn: async () => {
      fetchCounts.payments += 1;
      return [];
    },
  });
  useQuery({
    queryKey: slaEventKeys.disputes.list({}),
    queryFn: async () => {
      fetchCounts.disputes += 1;
      return [];
    },
  });
  return null;
}

function MutationHarness() {
  AggregateHarness();
  const del = useDeleteOutage();
  const res = useResolveOutage("outage-1");
  return { del, res };
}

describe("outage-change invalidation", () => {
  let client: QueryClient;

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    fetchCounts.outages = 0;
    fetchCounts.dashboard = 0;
    fetchCounts.sla = 0;
    fetchCounts.payments = 0;
    fetchCounts.disputes = 0;
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockDeleteOutage.mockResolvedValue({});
    mockResolveOutage.mockResolvedValue({});
  });

  it("successful delete refreshes every affected aggregate family", async () => {
    const { result } = renderHook(() => MutationHarness(), {
      wrapper: Wrapper,
    });
    // Initial mount fetches each family exactly once.
    await waitFor(() => expect(fetchCounts.outages).toBe(1));
    expect(fetchCounts.dashboard).toBe(1);
    expect(fetchCounts.sla).toBe(1);
    expect(fetchCounts.payments).toBe(1);
    expect(fetchCounts.disputes).toBe(1);

    act(() => {
      result.current.del.mutate("outage-1");
    });
    await waitFor(() => expect(result.current.del.isSuccess).toBe(true));

    // Every aggregate family must be refetched after the delete.
    await waitFor(() => expect(fetchCounts.outages).toBeGreaterThan(1));
    expect(fetchCounts.dashboard).toBeGreaterThan(1);
    expect(fetchCounts.sla).toBeGreaterThan(1);
    expect(fetchCounts.payments).toBeGreaterThan(1);
    expect(fetchCounts.disputes).toBeGreaterThan(1);
    expect(mockDeleteOutage).toHaveBeenCalledWith("outage-1");
  });

  it("successful resolve refreshes every affected aggregate family", async () => {
    const { result } = renderHook(() => MutationHarness(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(fetchCounts.outages).toBe(1));

    act(() => {
      result.current.res.mutate(45);
    });
    await waitFor(() => expect(result.current.res.isSuccess).toBe(true));

    await waitFor(() => expect(fetchCounts.outages).toBeGreaterThan(1));
    expect(fetchCounts.dashboard).toBeGreaterThan(1);
    expect(fetchCounts.sla).toBeGreaterThan(1);
    expect(fetchCounts.payments).toBeGreaterThan(1);
    expect(fetchCounts.disputes).toBeGreaterThan(1);
    expect(mockResolveOutage).toHaveBeenCalledWith("outage-1", {
      mttr_minutes: 45,
    });
  });

  it("rejected delete invalidates nothing", async () => {
    mockDeleteOutage.mockRejectedValueOnce(new Error("settled outage"));

    const { result } = renderHook(() => MutationHarness(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(fetchCounts.outages).toBe(1));

    act(() => {
      result.current.del.mutate("outage-1");
    });
    await waitFor(() => expect(result.current.del.isError).toBe(true));

    // No family should have been refetched: a rejected delete changes nothing.
    expect(fetchCounts.outages).toBe(1);
    expect(fetchCounts.dashboard).toBe(1);
    expect(fetchCounts.sla).toBe(1);
    expect(fetchCounts.payments).toBe(1);
    expect(fetchCounts.disputes).toBe(1);
  });
});
