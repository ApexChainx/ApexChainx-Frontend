/** ApexChain Network Operations Intelligence Platform */

/**
 * Rejects a download when the server returned a JSON error body (e.g. a
 * FastAPI `{"detail": ...}` response) instead of the requested file. Without
 * this guard, a non-2xx-with-blob response would silently download the error
 * document as `payments-....csv`.
 *
 * @returns the original blob when it is a real file
 * @throws an Error with the server-provided message when the blob is an error body
 */
export async function assertDownloadableBlob(blob: Blob): Promise<Blob> {
  if (blob.type && blob.type.includes("application/json")) {
    let text: string;
    try {
      text = await blob.text();
    } catch {
      // Cannot read the body — assume it is a real file and proceed.
      return blob;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON despite the content-type — treat as a real file.
      return blob;
    }

    if (parsed && typeof parsed === "object") {
      const detail = (parsed as Record<string, unknown>).detail;
      const message = (parsed as Record<string, unknown>).message;
      const raw = detail ?? message;
      if (raw !== undefined) {
        const text2 = Array.isArray(raw)
          ? raw
              .map((d) => {
                if (d && typeof d === "object" && "msg" in (d as Record<string, unknown>)) {
                  return String((d as Record<string, unknown>).msg);
                }
                return String(d);
              })
              .join("; ")
          : String(raw);
        throw new Error(text2 || "Export failed");
      }
    }
  }

  return blob;
}

/**
 * Triggers a browser download of a blob URL. Appends the anchor to the DOM
 * before clicking (required in Firefox and some embedded webviews — a detached
 * anchor click is silently ignored), removes it afterwards, and defers URL
 * revocation to the next tick so a slow download does not race the revocation.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
