/** ApexChain Network Operations Intelligence Platform */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertDownloadableBlob, downloadBlob } from "@/lib/download";

describe("assertDownloadableBlob", () => {
  it("passes through a real CSV blob unchanged", async () => {
    const blob = new Blob(["a,b,c\n1,2,3"], { type: "text/csv" });
    await expect(assertDownloadableBlob(blob)).resolves.toBe(blob);
  });

  it("passes through a JSON file that is not an error body", async () => {
    const blob = new Blob(['{"sla": 95}'], { type: "application/json" });
    await expect(assertDownloadableBlob(blob)).resolves.toBe(blob);
  });

  it("rejects a JSON error body with a detail string", async () => {
    const blob = new Blob(['{"detail": "Export failed"}'], {
      type: "application/json",
    });
    await expect(assertDownloadableBlob(blob)).rejects.toThrow("Export failed");
  });

  it("rejects a JSON error body with a message field", async () => {
    const blob = new Blob(['{"message": "Forbidden"}'], {
      type: "application/json",
    });
    await expect(assertDownloadableBlob(blob)).rejects.toThrow("Forbidden");
  });

  it("joins a FastAPI array detail into a readable message", async () => {
    const blob = new Blob(['{"detail": [{"msg": "too many"}, {"msg": "bad"}]}'], {
      type: "application/json",
    });
    await expect(assertDownloadableBlob(blob)).rejects.toThrow(
      "too many; bad",
    );
  });

  it("does not reject a blob with no JSON content-type", async () => {
    const blob = new Blob(["plain text"], { type: "text/plain" });
    await expect(assertDownloadableBlob(blob)).resolves.toBe(blob);
  });
});

describe("downloadBlob", () => {
  let createSpy: ReturnType<typeof vi.spyOn>;
  let revokeSpy: ReturnType<typeof vi.spyOn>;
  let appendSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    appendSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => document.createElement("a"));
    removeSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "remove")
      .mockImplementation(() => {});
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    setTimeoutSpy = vi
      .spyOn(window, "setTimeout")
      .mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends the anchor to the document before clicking", () => {
    const blob = new Blob(["data"], { type: "text/csv" });
    downloadBlob(blob, "file.csv");

    expect(createSpy).toHaveBeenCalledWith(blob);
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it("sets the download filename and href from the blob URL", () => {
    const blob = new Blob(["data"], { type: "text/csv" });
    downloadBlob(blob, "report.csv");

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe("report.csv");
    expect(anchor.href).toBe("blob:mock-url");
  });

  it("defers revokeObjectURL to the next tick so downloads do not race", () => {
    const blob = new Blob(["data"], { type: "text/csv" });
    downloadBlob(blob, "file.csv");

    // revoke is deferred inside the setTimeout callback, not called immediately
    expect(revokeSpy).not.toHaveBeenCalled();
    const cb = setTimeoutSpy.mock.calls[0][0] as () => void;
    cb();
    expect(revokeSpy).toHaveBeenCalledWith("blob:mock-url");
  });
});
