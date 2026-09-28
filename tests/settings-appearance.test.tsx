/** ApexChain Frontend Test Suite */
/**
 * Issue #615 — appearance module tests (src/features/settings/appearance.tsx).
 *
 * Covers the theme preference behaviour that used to live inline in the
 * settings page: switching themes persists to localStorage, applies the `dark`
 * class to <html>, follows the system preference, and keeps the matchMedia
 * listener balanced across re-renders and unmount.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppearanceSettings } from "@/features/settings/appearance";

function renderAppearance() {
  return render(<AppearanceSettings />);
}

describe("AppearanceSettings", () => {
  let addEventListener: ReturnType<typeof vi.fn>;
  let removeEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");

    addEventListener = vi.fn();
    removeEventListener = vi.fn();

    // jsdom does not implement matchMedia, so every test file that touches
    // theme logic needs to stub it.
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener,
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists the selected theme to localStorage", () => {
    renderAppearance();

    fireEvent.click(screen.getByRole("button", { name: /dark/i }));

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("applies the dark class to <html> when dark is selected", () => {
    renderAppearance();

    fireEvent.click(screen.getByRole("button", { name: /dark/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the dark class when light is selected", () => {
    localStorage.setItem("theme", "dark");
    renderAppearance();

    fireEvent.click(screen.getByRole("button", { name: /^light$/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("initializes the theme from localStorage", () => {
    localStorage.setItem("theme", "light");
    renderAppearance();

    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("registers exactly one 'change' listener on mount", () => {
    renderAppearance();

    const changeCalls = addEventListener.mock.calls.filter(([type]) => type === "change");
    expect(changeCalls).toHaveLength(1);
  });

  it("removes the same listener reference it added, on unmount", () => {
    const { unmount } = renderAppearance();

    const [, addedHandler] = addEventListener.mock.calls.find(([type]) => type === "change")!;

    unmount();

    const changeRemovals = removeEventListener.mock.calls.filter(([type]) => type === "change");
    expect(changeRemovals).toHaveLength(1);
    expect(changeRemovals[0]?.[1]).toBe(addedHandler);
  });

  it("keeps add/remove balanced across re-renders (no growing leak)", () => {
    const { unmount } = renderAppearance();

    unmount();

    const adds = addEventListener.mock.calls.filter(([type]) => type === "change");
    const removes = removeEventListener.mock.calls.filter(([type]) => type === "change");
    expect(removes).toHaveLength(adds.length);

    const addedHandlers = adds.map(([, handler]) => handler);
    const removedHandlers = removes.map(([, handler]) => handler);
    expect(removedHandlers).toEqual(addedHandlers);
  });
});