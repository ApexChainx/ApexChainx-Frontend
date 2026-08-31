/** ApexChain Network Operations Intelligence Platform */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isFormDirty,
  useUnsavedChangesGuard,
} from "@/hooks/useUnsavedChangesGuard";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isFormDirty", () => {
  it("is clean when every field is empty", () => {
    expect(
      isFormDirty({ a: "", b: "  ", c: "" }),
    ).toBe(false);
  });

  it("is dirty when any field has content", () => {
    expect(
      isFormDirty({ a: "", b: "Lagos", c: "" }),
    ).toBe(true);
  });
});

describe("useUnsavedChangesGuard", () => {
  it("registers a beforeunload handler only while dirty", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");

    const { rerender } = renderHook(
      ({ dirty }) => useUnsavedChangesGuard(dirty),
      { initialProps: { dirty: true } },
    );

    expect(add).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    rerender({ dirty: false });
    expect(remove).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("confirmLeave resolves true when there are no unsaved changes", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result } = renderHook(() => useUnsavedChangesGuard(false));

    expect(result.current.confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("confirmLeave prompts while dirty and honours the answer", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result } = renderHook(() => useUnsavedChangesGuard(true));

    expect(result.current.confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("markClean allows navigation to be skipped on subsequent calls", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { result } = renderHook(() => useUnsavedChangesGuard(true));

    act(() => result.current.markClean());

    expect(result.current.confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});
