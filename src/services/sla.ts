/** ApexChain Network Operations Intelligence Platform */
import { AxiosError } from "axios";

import { api } from "@/lib/api";

import type {
  DisputeListParams,
  FlagDisputePayload,
  PaginatedDisputes,
  ResolveDisputePayload,
  SLADispute,
  SLAResult,
} from "@/types/sla";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface CalculateSLAParams {
  outage_id: string;
  severity: string;
  mttr_minutes: number;
}

interface PreviewSLAParams {
  severity: string;
  mttr_minutes: number;
}

interface APIErrorResponse {
  message?: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const SLA_ENDPOINTS = {
  CALCULATE: "/sla/calculate",
  PREVIEW: "/sla/preview",
  DISPUTES: "/sla/disputes",
} as const;

/* -------------------------------------------------------------------------- */
/*                               Helper Methods                               */
/* -------------------------------------------------------------------------- */

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<APIErrorResponse>;

  return (
    axiosError.response?.data?.message ||
    axiosError.message ||
    "An unexpected error occurred."
  );
}

function sanitizeParams<T extends Record<string, unknown>>(
  params: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  ) as Partial<T>;
}

function validateMTTR(mttr: number): void {
  if (mttr < 0) {
    throw new Error("MTTR minutes cannot be negative.");
  }
}

/* -------------------------------------------------------------------------- */
/*                               SLA Endpoints                                */
/* -------------------------------------------------------------------------- */

/**
 * Calculate finalized SLA result for an outage.
 */
export async function calculateSLA(
  params: CalculateSLAParams
): Promise<SLAResult> {
  validateMTTR(params.mttr_minutes);

  try {
    const response = await api.get<SLAResult>(
      SLA_ENDPOINTS.CALCULATE,
      {
        params: sanitizeParams(params),
      }
    );

    return response.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Preview SLA impact before saving or resolving outage.
 */
export async function previewSLA(
  params: PreviewSLAParams
): Promise<SLAResult> {
  validateMTTR(params.mttr_minutes);

  try {
    const response = await api.post<SLAResult>(
      SLA_ENDPOINTS.PREVIEW,
      sanitizeParams(params)
    );

    return response.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Fetch paginated SLA disputes.
 */
export async function getDisputes(
  params: DisputeListParams
): Promise<PaginatedDisputes> {
  try {
    const response = await api.get<PaginatedDisputes>(
      SLA_ENDPOINTS.DISPUTES,
      {
        params: sanitizeParams(params),
      }
    );

    return response.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Create or flag a new SLA dispute.
 */
export async function flagDispute(
  payload: FlagDisputePayload
): Promise<SLADispute> {
  try {
    const response = await api.post<SLADispute>(
      SLA_ENDPOINTS.DISPUTES,
      payload
    );

    return response.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Resolve or reject an SLA dispute.
 */
export async function resolveDispute(
  disputeId: string,
  payload: ResolveDisputePayload
): Promise<SLADispute> {
  if (!disputeId?.trim()) {
    throw new Error("Dispute ID is required.");
  }

  try {
    const response = await api.patch<SLADispute>(
      `${SLA_ENDPOINTS.DISPUTES}/${disputeId}`,
      payload
    );

    return response.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error));
  }
}

/* -------------------------------------------------------------------------- */
/*                            Optional Query Keys                             */
/* -------------------------------------------------------------------------- */

export const slaQueryKeys = {
  all: ["sla"] as const,

  calculate: (
    params: CalculateSLAParams
  ) => ["sla", "calculate", params] as const,

  preview: (
    params: PreviewSLAParams
  ) => ["sla", "preview", params] as const,

  disputes: (
    params?: Partial<DisputeListParams>
  ) => ["sla", "disputes", params] as const,

  dispute: (id: string) =>
    ["sla", "dispute", id] as const,
};