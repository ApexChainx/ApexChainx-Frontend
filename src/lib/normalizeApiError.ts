export type NormalizedError = {
  message: string;
  status?: number;
  correlationId?: string;
};

export function normalizeApiError(error: any): NormalizedError {
  // Axios-style response
  const response = error?.response;

  const correlationId =
    response?.headers?.["x-correlation-id"] ||
    response?.data?.correlationId ||
    response?.data?.requestId;

  const message =
    response?.data?.message ||
    error?.message ||
    "Something went wrong";

  return {
    message,
    status: response?.status,
    correlationId,
  };
}