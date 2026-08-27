/** ApexChain Network Operations Intelligence Platform */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

// Mock the three hooks Navigation depends on.
vi.mock("@/hooks/useHealth", () => ({
  useHealth: () => ({ status: "green" as const, isOffline: false }),
}));

vi.mock("@/providers/session", () => ({
  useSession: () => ({
    state: "authenticated" as const,
    user: { id: "u1", email: "ops@example.com", role: "admin" as const },
    logout: vi.fn(),
  }),
}));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "errors.offline": "You are offline",
        "navigation.systemHealth": "System Health",
        "common.dashboard": "Dashboard",
        "common.outages": "Outages",
        "common.bulkImport": "Bulk Import",
        "common.payments": "Payments",
        "common.settings": "Settings",
        "common.config": "Config",
        "common.webhooks": "Webhooks",
        "common.signOut": "Sign Out",
        "auth.signIn": "Sign In",
        "settings.loadingSession": "Loading session…",
      };
      return map[key] ?? key;
    },
  }),
}));

import Navigation from "@/components/Navigation";

describe("Navigation pipe separators", () => {
  it("renders pipe separators with aria-hidden", () => {
    render(<Navigation />);

    // All visual pipe separators must have aria-hidden="true" so screen
    // readers do not announce "pipe" between every nav item.
    const pipes = screen.getAllByText("|");
    expect(pipes.length).toBeGreaterThanOrEqual(5);
    for (const pipe of pipes) {
      expect(pipe).toHaveAttribute("aria-hidden", "true");
    }
  });
});