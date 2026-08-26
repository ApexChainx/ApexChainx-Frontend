/** ApexChain Network Operations Intelligence Platform */
import { AxiosError } from "axios";

import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { DEFAULT_OUTAGES_PAGE_SIZE } from "@/lib/urlState";
import type {
  Outage,
  OutageCreate,
  OutageUpdate,
  PaginatedOutages,
  ResolveOutagePayload,
  ResolveOutageResponse,
} from "@/types/outages";

interface GetOutagesParams {
  page?: number | undefined;
  page_size?: number | undefined;
  severity?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
  sort_field?: string | undefined;
  sort_order?: "asc" | "desc" | undefined;
}

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

const OUTAGES_ENDPOINT = ENDPOINTS.outages.base;

function handleApiError(error: unknown, fallbackMessage: string): never {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;

    throw new Error(
      apiError?.message ||
        error.message ||
        fallbackMessage,
    );
  }

  if (error instanceof Error) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

/**
 * Fetch all outages (non-paginated shortcut)
 */
export async function listOutages(
  options?: { signal?: AbortSignal },
): Promise<Outage[]> {
  try {
    const res = await api.get<PaginatedOutages>(OUTAGES_ENDPOINT, {
      ...(options?.signal ? { signal: options.signal } : {}),
    });

    return res.data.items;
  } catch (error) {
    handleApiError(error, "Failed to fetch outages.");
  }
}

/**
 * Fetch paginated outages with filters
 */
export async function getOutages(
  params: GetOutagesParams = {},
  options?: { signal?: AbortSignal },
): Promise<PaginatedOutages> {
  try {
    const res = await api.get<PaginatedOutages>(OUTAGES_ENDPOINT, {
      params: {
        ...params,
        page_size: params.page_size ?? DEFAULT_OUTAGES_PAGE_SIZE,
      },
      ...(options?.signal ? { signal: options.signal } : {}),
    });

    return res.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch outages.");
  }
}

/**
 * Fetch a single outage by ID
 */
export async function getOutage(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<Outage> {
  try {
    if (!id) {
      throw new Error("Outage ID is required.");
    }

    const res = await api.get<Outage>(ENDPOINTS.outages.byId(id), {
      ...(options?.signal ? { signal: options.signal } : {}),
    });

    return res.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch outage.");
  }
}

/**
 * Create a new outage
 */
export async function createOutage(
  payload: OutageCreate,
): Promise<Outage> {
  try {
    const res = await api.post<Outage>(
      OUTAGES_ENDPOINT,
      payload,
    );

    return res.data;
  } catch (error) {
    handleApiError(error, "Failed to create outage.");
  }
}

/**
 * Update an existing outage
 */
export async function updateOutage(
  id: string,
  payload: OutageUpdate,
): Promise<Outage> {
  try {
    if (!id) {
      throw new Error("Outage ID is required.");
    }

    const res = await api.put<Outage>(
      ENDPOINTS.outages.byId(id),
      payload,
    );

    return res.data;
  } catch (error) {
    handleApiError(error, "Failed to update outage.");
  }
}

/**
 * Delete an outage
 */
export async function deleteOutage(
  id: string,
): Promise<{ message: string }> {
  try {
    if (!id) {
      throw new Error("Outage ID is required.");
    }

    const res = await api.delete<{ message: string }>(
      ENDPOINTS.outages.byId(id),
    );

    return res.data;
  } catch (error) {
    handleApiError(error, "Failed to delete outage.");
  }
}

/**
 * Resolve an outage
 */
export async function resolveOutage(
  id: string,
  payload: ResolveOutagePayload,
): Promise<ResolveOutageResponse> {
  try {
    if (!id) {
      throw new Error("Outage ID is required.");
    }

    const res = await api.post<ResolveOutageResponse>(
      ENDPOINTS.outages.resolve(id),
      payload,
    );

    return res.data;
  } catch (error) {
    handleApiError(error, "Failed to resolve outage.");
  }
}