import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: basic response/error interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err?.response?.data?.detail || err?.message || "Unexpected API error";
    return Promise.reject(new Error(message));
  },
);
