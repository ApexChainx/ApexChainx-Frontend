const KEY = "auth_redirect";

export function saveRedirect(path: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, path);
}

export function getRedirect() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function clearRedirect() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}