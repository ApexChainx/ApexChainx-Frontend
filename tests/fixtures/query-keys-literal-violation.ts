/**
 * ApexChain Frontend Test Suite
 *
 * Issue #623 — deliberate violation fixture for the query-key literal scan.
 *
 * This file lives under tests/ (which the src scan excludes) and exists so
 * tests/query-key-literal-scan.test.ts can prove the alarm actually fires.
 * Do NOT "fix" the literals below — the scan test asserts they are caught.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useLiteralKeyViolation() {
  return useQuery({
    queryKey: ["literal-key", "violation"],
    queryFn: () => Promise.resolve(null),
  });
}

export function invalidateLiteralKeyViolation() {
  const queryClient = useQueryClient();
  queryClient.invalidateQueries({ queryKey: ["literal-key", "invalidate"] });
}
