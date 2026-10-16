/**
 * ApexChain Frontend Test Suite — landing page i18n (#789) and memoization
 * (#791).
 *
 * `@/i18n/i18n` is mocked because the upstream message bundles are corrupted
 * (binary), and `next/dynamic` is mocked because a real lazy chunk cannot
 * resolve in jsdom (the lazily-imported dashboard module is itself corrupted
 * upstream). The mock renders the configured `loading` option so the
 * translated fallback can be asserted.
 */
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const tSpy = vi.hoisted(() => vi.fn((key: string) => key));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({
    t: tSpy,
    locale: "en",
    setLocale: () => {},
    locales: ["en"],
    localeNames: { en: "English" },
  }),
}));

vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options: { loading?: () => ReactNode }) =>
    function MockDynamic() {
      return <>{options?.loading ? options.loading() : null}</>;
    },
}));

import Dashboard from "@/app/page";

afterEach(cleanup);

describe("LandingPage internationalization (#789)", () => {
  it("translates the loading fallback instead of hard-coding English", () => {
    render(<Dashboard />);

    expect(tSpy).toHaveBeenCalledWith("dashboard.loading");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("dashboard.loading");
  });

  it("announces the loading state politely", () => {
    render(<Dashboard />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});

describe("LandingPage memoization (#791)", () => {
  it("exports a memoized route component", () => {
    expect((Dashboard as unknown as { $$typeof?: symbol }).$$typeof).toBe(
      Symbol.for("react.memo"),
    );
  });

  it("re-renders the translated fallback with a stable element type", () => {
    const { rerender } = render(<Dashboard />);
    const first = screen.getByRole("status");
    rerender(<Dashboard />);
    expect(screen.getByRole("status")).toBe(first);
  });
});
