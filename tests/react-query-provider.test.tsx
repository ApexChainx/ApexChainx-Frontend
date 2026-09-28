/** ApexChain Frontend Test Suite */
import { render } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  createAppQueryClient,
  defaultQueryOptions,
  ReactQueryProvider,
} from "@/providers/react-query";

/**
 * Issue #622 — the app-wide QueryClient defaults.
 *
 * Every hook used to re-declare its own staleTime/gcTime/retry/
 * refetchOnWindowFocus policy; these tests pin the app-wide shape so a
 * future edit cannot silently reintroduce per-hook inconsistency or a
 * window-focus misfetch storm.
 */
describe("ReactQueryProvider default options (Issue #622)", () => {
  it("exports the documented default options shape", () => {
    expect(defaultQueryOptions.staleTime).toBe(30_000);
    expect(defaultQueryOptions.gcTime).toBe(5 * 60_000);
    expect(defaultQueryOptions.refetchOnWindowFocus).toBe(false);
    expect(typeof defaultQueryOptions.retry).toBe("function");
    expect(typeof defaultQueryOptions.retryDelay).toBe("function");
  });

  it("retries the first failure but gives up on the second", () => {
    const retry = defaultQueryOptions.retry as (failureCount: number) => boolean;
    expect(retry(1)).toBe(true);
    expect(retry(2)).toBe(false);
  });

  it("backs off exponentially and caps the delay at 10s", () => {
    const retryDelay = defaultQueryOptions.retryDelay as (failureCount: number) => number;
    expect(retryDelay(1)).toBe(2_000);
    expect(retryDelay(2)).toBe(4_000);
    expect(retryDelay(3)).toBe(8_000);
    expect(retryDelay(10)).toBe(10_000);
  });

  it("builds a QueryClient whose defaultOptions match the exported defaults", () => {
    const client = createAppQueryClient();
    const queries = client.getDefaultOptions().queries;

    expect(queries?.staleTime).toBe(30_000);
    expect(queries?.gcTime).toBe(5 * 60_000);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(typeof queries?.retry).toBe("function");
    expect(typeof queries?.retryDelay).toBe("function");
  });

  it("wires the defaults into the client mounted by the provider", () => {
    let clientFromContext: ReturnType<typeof useQueryClient> | null = null;

    function Probe() {
      clientFromContext = useQueryClient();
      return null;
    }

    render(
      <ReactQueryProvider>
        <Probe />
      </ReactQueryProvider>,
    );

    expect(clientFromContext).not.toBeNull();
    const queries = clientFromContext!.getDefaultOptions().queries;
    expect(queries?.staleTime).toBe(30_000);
    expect(queries?.gcTime).toBe(5 * 60_000);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(typeof queries?.retry).toBe("function");
  });
});
