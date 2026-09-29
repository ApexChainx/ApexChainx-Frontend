/** ApexChain Network Operations Intelligence Platform */
/**
 * Issue #634 — the outages list must paint cached rows before the network
 * response, instead of flashing the loading shell while the IndexedDB
 * hydration (which runs in a `useEffect`, i.e. after the first paint) races
 * the initial render.
 *
 * `useOutages` now seeds React Query from a synchronous in-memory mirror of
 * the persisted cache, so a warm visit has data on the very first render.
 * These tests exercise the real hook against a never-resolving network, so the
 * only possible source of rows is the persisted snapshot.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOutages } from "@/features/outages/hooks/useOutages";
import { DEFAULT_OUTAGES_PAGE_SIZE } from "@/lib/outages";
import { persistedCache, resetCacheMirror } from "@/lib/persisted-cache";
import type { PaginatedOutages } from "@/types/outages";

// The network never settles, so nothing can arrive from the API and any row
// that renders must have come from the persisted cache.
vi.mock("@/lib/outages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/outages")>();
  return {
    ...actual,
    fetchOutages: vi.fn(() => new Promise(() => {})),
  };
});

const CACHED_PAGE: PaginatedOutages = {
  items: [{ id: "outage-1", site_name: "Lagos Node 1" }] as unknown as PaginatedOutages["items"],
  total: 1,
  page: 1,
  page_size: DEFAULT_OUTAGES_PAGE_SIZE,
};

/** Mirrors the key `useOutages` derives from its normalized params. */
function cacheKeyFor(params: Record<string, unknown>): string {
  return `outages:${JSON.stringify(params)}`;
}

const defaultParams = { page: 1, page_size: DEFAULT_OUTAGES_PAGE_SIZE };

/** Surfaces both observable branches of the hook. */
function OutagesProbe() {
  const { data, isLoading } = useOutages({});

  if (isLoading) {
    return <p>loading-shell</p>;
  }

  return (
    <ul>
      {(data?.items ?? []).map((item) => (
        <li key={item.id}>{item.site_name}</li>
      ))}
    </ul>
  );
}

function renderProbe() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <OutagesProbe />
    </QueryClientProvider>,
  );
}

describe("useOutages cache-first paint (Issue #634)", () => {
  beforeEach(() => {
    // jsdom has no IndexedDB by default; install a fresh instance per test so
    // the real persisted-cache code paths run without leaking state.
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    resetCacheMirror();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetCacheMirror();
  });

  it("paints cached rows on the first render without flashing the loading shell", async () => {
    await persistedCache.set(cacheKeyFor(defaultParams), CACHED_PAGE);

    renderProbe();

    // Rows are present on the very first render, and the loading shell never
    // appears — even though the network request is still in flight.
    expect(screen.getByText("Lagos Node 1")).toBeInTheDocument();
    expect(screen.queryByText("loading-shell")).not.toBeInTheDocument();
  });

  it("still shows the loading shell on a cold visit with nothing cached", () => {
    renderProbe();

    expect(screen.getByText("loading-shell")).toBeInTheDocument();
    expect(screen.queryByText("Lagos Node 1")).not.toBeInTheDocument();
  });
});
