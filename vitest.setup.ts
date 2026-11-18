import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";

import { resetHydrationTelemetry } from "@/lib/persisted-cache";

beforeEach(() => {
  resetHydrationTelemetry();
});

vi.mock("@/components/ui/toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/toast")>();
  return { ...actual, useToast: () => vi.fn() };
});

const jsdomWindow = (
  globalThis as typeof globalThis & {
    jsdom?: { window: Window & typeof globalThis };
  }
).jsdom?.window;

if (jsdomWindow && !window.localStorage) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: jsdomWindow.localStorage,
  });
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: jsdomWindow.sessionStorage,
  });
}

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
