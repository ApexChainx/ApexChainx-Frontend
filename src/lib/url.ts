import { env } from "@/lib/config/env";

export function buildApiUrl(path: string) {
  const base = env.API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");

  return `${base}/${cleanPath}`;
}