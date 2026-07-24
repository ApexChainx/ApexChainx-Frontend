/** ApexChain - Network Operations Intelligence Platform */

/**
 * Generate a device fingerprint for session anomaly detection.
 * Combines multiple browser signals into a stable hash.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const signals = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth.toString(),
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() ?? "unknown",
    navigator.platform,
  ];

  const fingerprint = signals.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get or create a stored device ID (persisted in sessionStorage).
 */
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("apex_device_id");
}

/**
 * Store device ID in sessionStorage.
 */
export function setDeviceId(deviceId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("apex_device_id", deviceId);
}
