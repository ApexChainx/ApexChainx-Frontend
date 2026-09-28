"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchPayments, retryPayment } from "@/services/paymentService";
import { slaEventKeys } from "@/lib/query-keys";
import type { PaginatedPayments, Payment, PaymentStatus } from "@/types/payment";

const DEFAULT_FILTERS = {
  page: 1,
  page_size: 100,
  status: "failed" as const,
  date_from: (() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  })(),
};

const OPTIMISTIC_PENDING_STATUS: PaymentStatus = "pending";

export function useRetryQueue() {
  const queryClient = useQueryClient();
  const refreshKey = useRef(0);

  const filters = useMemo(
    () => ({
      ...DEFAULT_FILTERS,
      _refreshKey: refreshKey.current,
    }),
    [],
  );

  const queryKey = useMemo(
    () => slaEventKeys.payments.list(filters as Record<string, unknown>),
    [filters],
  );

  const query = useQuery<PaginatedPayments, Error>({
    queryKey,
    queryFn: () => fetchPayments(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: false,
    select: (data) => ({
      ...data,
      items: data.items ?? [],
    }),
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, PaymentStatus>>({});
  const [retryError, setRetryError] = useState<string | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const inFlightRef = useRef<Set<string>>(new Set());

  const applyOptimisticStatus = useCallback((ids: string[], status: PaymentStatus | null) => {
    setOptimisticStatus((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (status === null) {
          delete next[id];
        } else {
          next[id] = status;
        }
      }
      return next;
    });
  }, []);

  const rowStatus = useCallback(
    (payment: Payment) => optimisticStatus[payment.id] ?? payment.status,
    [optimisticStatus],
  );

  const invalidatePayments = useCallback(() => {
    refreshKey.current += 1;
    queryClient.invalidateQueries({ queryKey: slaEventKeys.payments.all });
  }, [queryClient]);

  const retryMutation = useMutation({
    mutationFn: retryPayment,
    onMutate: async (id: string) => {
      if (inFlightRef.current.has(id)) {
        throw new Error("Already in flight");
      }
      inFlightRef.current.add(id);
      setRetryError(null);
      setRetryingIds((prev) => new Set(prev).add(id));
      applyOptimisticStatus([id], OPTIMISTIC_PENDING_STATUS);

      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<PaginatedPayments>(queryKey);
      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      applyOptimisticStatus([_id], null);
      setRetryError(`Could not retry payment ${_id}. Please try again.`);
    },
    onSuccess: (updated, id) => {
      applyOptimisticStatus([id], updated?.status ?? OPTIMISTIC_PENDING_STATUS);
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    },
    onSettled: (_data, _error, id) => {
      inFlightRef.current.delete(id);
      setRetryingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    },
  });

  const bulkRetryMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => retryPayment(id)));
      return { results, ids };
    },
    onMutate: async (ids: string[]) => {
      ids.forEach((id) => inFlightRef.current.add(id));
      setBulkRetrying(true);
      setRetryError(null);
      applyOptimisticStatus(ids, OPTIMISTIC_PENDING_STATUS);

      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<PaginatedPayments>(queryKey);
      return { previousData };
    },
    onError: (_err, _ids, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      applyOptimisticStatus(_ids, null);
      setRetryError(`Could not retry payments. Please try again.`);
    },
    onSuccess: (data) => {
      const { results, ids } = data;
      const failedIds: string[] = [];

      results.forEach((result, index) => {
        const id = ids[index]!;
        if (result.status === "fulfilled") {
          applyOptimisticStatus([id], result.value?.status ?? OPTIMISTIC_PENDING_STATUS);
        } else {
          failedIds.push(id);
        }
      });

      if (failedIds.length > 0) {
        applyOptimisticStatus(failedIds, null);
        setRetryError(`Could not retry ${failedIds.length} of ${ids.length} payments. Please try again.`);
      } else {
        setSelectedIds(new Set());
      }
    },
    onSettled: (_data, _error, ids) => {
      ids.forEach((id) => inFlightRef.current.delete(id));
      setBulkRetrying(false);
      setShowConfirmDialog(false);
      invalidatePayments();
    },
  });

  const handleRetry = useCallback(
    (id: string) => {
      retryMutation.mutate(id);
    },
    [retryMutation],
  );

  const handleBulkRetry = useCallback(() => {
    const ids = Array.from(selectedIds).filter((id) => !inFlightRef.current.has(id));
    if (ids.length === 0) {
      setShowConfirmDialog(false);
      return;
    }
    bulkRetryMutation.mutate(ids);
  }, [selectedIds, bulkRetryMutation]);

  const toggleSelectAll = useCallback(() => {
    if (!query.data) return;
    if (selectedIds.size === query.data.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(query.data.items.map((item) => item.id)));
    }
  }, [query.data, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  return {
    query,
    selectedIds,
    retryingIds,
    optimisticStatus,
    retryError,
    bulkRetrying,
    showConfirmDialog,
    setShowConfirmDialog,
    rowStatus,
    handleRetry,
    handleBulkRetry,
    toggleSelectAll,
    toggleSelect,
  };
}