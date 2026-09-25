"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchPayment } from "@/services/paymentService";
import type { Payment } from "@/types/payment";

/**
 * Consecutive opens of the same payment within this window reuse the cached
 * payload instead of issuing another detail request.
 */
export const PAYMENT_DETAIL_STALE_WINDOW_MS = 30_000;

/** Cached detail payloads survive this long after the drawer closes. */
export const PAYMENT_DETAIL_GC_TIME_MS = 5 * 60_000;

export function paymentDetailQueryKey(paymentId: string | null) {
  return ["payment", "detail", paymentId] as const;
}

/**
 * Reads a single payment for the detail drawer.
 *
 * The drawer is opened from a list that was just refreshed, so a short stale
 * window is enough to make row-to-row browsing reuse the payload already on
 * screen. A cold open still shows the skeleton (react-query has no cached data),
 * while a warm open renders instantly with no new request.
 */
export function usePaymentDetail(paymentId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: paymentDetailQueryKey(paymentId),
    queryFn: ({ signal }) => fetchPayment(paymentId as string, signal),
    enabled: Boolean(paymentId),
    staleTime: PAYMENT_DETAIL_STALE_WINDOW_MS,
    gcTime: PAYMENT_DETAIL_GC_TIME_MS,
  });

  /** Fold a server response from an action (retry/reconcile) back into the cache. */
  const cachePayment = useCallback(
    (payment: Payment) => {
      queryClient.setQueryData(paymentDetailQueryKey(payment.id), payment);
    },
    [queryClient],
  );

  return { ...query, cachePayment };
}
