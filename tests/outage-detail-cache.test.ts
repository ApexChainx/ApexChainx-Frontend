/** ApexChain Network Operations Intelligence Platform */
/**
 * Issue #571 / #572 — outage detail cache reconciliation.
 *
 * The detail route fetches by hand instead of going through `useOutage`, so
 * the exact query keys it touches are asserted here against a real
 * `QueryClient`. That makes the two invariants testable without rendering
 * the page:
 *
 *  - a delete *removes* the detail entry (not merely invalidates it), and
 *  - every mutation marks the whole list family stale regardless of the
 *    filter params each cached page was stored under.
 */
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  invalidateOutageListCaches,
  removeOutageFromCache,
  setOutageDetailCache,
} from "@/features/outages/hooks/outage-cache";
import { slaEventKeys } from "@/lib/query-keys";
import type { Outage, PaginatedOutages } from "@/types/outages";

const OUTAGE_ID = "OUT-1756700000000";

function makeOutage(overrides: Partial<Outage> = {}): Outage {
  return {
    id: OUTAGE_ID,
    site_name: "Lagos Node 1",
    severity: "medium",
    status: "open",
    detected_at: "2026-01-01T00:00:00.000Z",
    description: "Packet loss on upstream link",
    affected_services: ["VoIP"],
    ...overrides,
  };
}

function makePage(params: Record<string, unknown>): PaginatedOutages {
  return {
    items: [makeOutage()],
    total: 1,
    page: Number(params.page ?? 1),
    page_size: Number(params.page_size ?? 10),
  };
}

describe("outage cache helpers", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("#572 delete removes the detail entry", () => {
    it("drops the cached detail row so a back-navigation cannot resurrect it", () => {
      setOutageDetailCache(queryClient, makeOutage());
      expect(
        queryClient.getQueryData(slaEventKeys.outages.detail(OUTAGE_ID)),
      ).toBeDefined();

      removeOutageFromCache(queryClient, OUTAGE_ID);

      // Not "undefined because it was invalidated and refetched" — the entry
      // itself is gone, so nothing can render it without a fresh fetch.
      expect(
        queryClient.getQueryState(slaEventKeys.outages.detail(OUTAGE_ID)),
      ).toBeUndefined();
    });

    it("does not remove sibling detail entries", () => {
      const siblingId = "OUT-1756700000001";
      setOutageDetailCache(queryClient, makeOutage());
      setOutageDetailCache(queryClient, makeOutage({ id: siblingId }));

      removeOutageFromCache(queryClient, OUTAGE_ID);

      expect(
        queryClient.getQueryData(slaEventKeys.outages.detail(siblingId)),
      ).toBeDefined();
    });
  });

  describe("#571 mutations mark list pages stale", () => {
    it("marks every cached filter variant stale", async () => {
      const openParams = { page: 1, page_size: 10, status: "open" };
      const resolvedParams = { page: 1, page_size: 10, status: "resolved" };
      const searchedParams = { page: 2, page_size: 10, search: "lagos" };

      queryClient.setQueryData(
        slaEventKeys.outages.list(openParams),
        makePage(openParams),
      );
      queryClient.setQueryData(
        slaEventKeys.outages.list(resolvedParams),
        makePage(resolvedParams),
      );
      queryClient.setQueryData(
        slaEventKeys.outages.list(searchedParams),
        makePage(searchedParams),
      );

      expect(
        queryClient.getQueryState(slaEventKeys.outages.list(openParams))
          ?.isInvalidated,
      ).toBe(false);

      await invalidateOutageListCaches(queryClient);

      // This is the assertion that would fail if the helper used
      // `slaEventKeys.outages.list()` (i.e. `[..., "list", undefined]`): the
      // trailing undefined makes prefix matching miss every real entry.
      for (const params of [openParams, resolvedParams, searchedParams]) {
        expect(
          queryClient.getQueryState(slaEventKeys.outages.list(params))
            ?.isInvalidated,
        ).toBe(true);
      }
    });

    it("leaves unrelated families alone", async () => {
      queryClient.setQueryData(slaEventKeys.payments.list({}), {
        items: [],
        total: 0,
      });
      queryClient.setQueryData(slaEventKeys.disputes.list({}), {
        items: [],
        total: 0,
      });

      await invalidateOutageListCaches(queryClient);

      expect(
        queryClient.getQueryState(slaEventKeys.payments.list({}))
          ?.isInvalidated,
      ).toBe(false);
      expect(
        queryClient.getQueryState(slaEventKeys.disputes.list({}))
          ?.isInvalidated,
      ).toBe(false);
    });
  });

  describe("setOutageDetailCache", () => {
    it("keys the entry by the factory detail key", () => {
      const outage = makeOutage();
      setOutageDetailCache(queryClient, outage);
      expect(queryClient.getQueryData(slaEventKeys.outages.detail(outage.id)))
        .toEqual(outage);
    });
  });
});
