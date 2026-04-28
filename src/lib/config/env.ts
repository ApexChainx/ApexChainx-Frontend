const DEFAULT_API_BASE = "http://localhost:8000/api/v1";

export const env = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE,
};