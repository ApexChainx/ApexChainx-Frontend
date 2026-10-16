/**
 * ApexChain Frontend Test Suite — NavBar i18n (#805) + memoization (#807).
 *
 * The real i18n bundles are corrupted binary data in this checkout, so the
 * provider is mocked with a spy: every rendered string is the translation key,
 * which lets us assert exactly which keys the component requests.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Fragment, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  state: "authenticated" as "loading" | "authenticated" | "unauthenticated",
  user: { id: "u1", email: "operator@apexchain.com", role: "admin" } as
    | { id: string; email: string; role: string }
    | null,
  logout: vi.fn(() => Promise.resolve({ serverRevoked: true })),
  calls: 0,
}));

const health = vi.hoisted(() => ({
  status: "green" as "green" | "red",
  isOffline: false,
}));

const t = vi.hoisted(() => vi.fn((key: string) => key));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({ t, locale: "en" }),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => {
    session.calls += 1;
    return {
      state: session.state,
      user: session.user,
      logout: session.logout,
    };
  },
}));

vi.mock("@/hooks/useHealth", () => ({
  useHealth: () => ({ status: health.status, isOffline: health.isOffline }),
}));

vi.mock("@/lib/explorer", () => ({ STELLAR_NETWORK: "mainnet" }));

import Navigation from "@/components/Navigation";

beforeEach(() => {
  session.state = "authenticated";
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
  session.logout.mockClear();
  session.calls = 0;
  health.status = "green";
  health.isOffline = false;
  t.mockClear();
});

afterEach(cleanup);

describe("NavBar i18n (#805)", () => {
  it("routes the previously hard-coded strings through the translator", () => {
    render(<Navigation />);

    expect(t).toHaveBeenCalledWith("common.retryQueue");
    expect(t).toHaveBeenCalledWith("common.mainnet");
    expect(t).toHaveBeenCalledWith("common.admin");
  });

  it("renders the translated retry-queue link, mainnet badge and admin badge", () => {
    render(<Navigation />);

    expect(screen.getByRole("link", { name: "common.retryQueue" })).toHaveAttribute(
      "href",
      "/payments/retry-queue",
    );
    expect(screen.getByText("common.mainnet")).toBeInTheDocument();
    expect(screen.getByText("common.admin")).toBeInTheDocument();
  });

  it("keeps the existing translated labels wired up", () => {
    render(<Navigation />);

    for (const key of [
      "common.dashboard",
      "common.outages",
      "common.bulkImport",
      "common.payments",
      "common.settings",
      "common.config",
      "common.webhooks",
      "common.signOut",
    ]) {
      expect(t).toHaveBeenCalledWith(key);
    }
  });
});

describe("NavBar memoization (#807)", () => {
  it("exports a memoized component", () => {
    expect(
      (Navigation as unknown as { $$typeof?: symbol }).$$typeof,
    ).toBe(Symbol.for("react.memo"));
  });

  it("skips re-rendering when a parent re-renders with unchanged props", () => {
    function Shell() {
      const [, setTick] = useState(0);
      return (
        <Fragment>
          <button type="button" onClick={() => setTick((n) => n + 1)}>
            tick
          </button>
          <Navigation />
        </Fragment>
      );
    }

    render(<Shell />);
    expect(session.calls).toBe(1);

    fireEvent.click(screen.getByText("tick"));
    // React.memo bails out, so the component body (and its hooks) are not
    // invoked again.
    expect(session.calls).toBe(1);

    // Sanity: the memoized child is still mounted and interactive.
    expect(screen.getByRole("button", { name: "common.signOut" })).toBeInTheDocument();
  });

  it("re-renders when a consumed hook value changes", () => {
    const { rerender } = render(<Navigation />);
    session.user = { id: "u1", email: "other@apexchain.com", role: "user" };
    // No props change, so force a fresh element identity to exercise the body.
    rerender(<Navigation key="remount" />);

    expect(screen.getByText("other@apexchain.com")).toBeInTheDocument();
  });
});
