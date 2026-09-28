/** ApexChain Frontend Test Suite */
/**
 * Issue #615 — wallet module tests (src/features/settings/wallet.tsx).
 *
 * Covers the wallet module's key behaviour that used to live inline in the
 * settings page: balances render with USD conversion when rates are available,
 * balances render without a USD line when the asset has no published rate, and
 * the module reports its errors through the page-level notifications context.
 *
 * The module is rendered through its real provider stack (notifications +
 * session + stellar health) so the context wiring is exercised exactly as the
 * settings shell composes it.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockToast = vi.fn();

vi.mock("next/navigation", () => ({
  // The session module's provider calls useRouter(); outside a real App
  // Router tree this throws unless mocked.
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) },
  getAccessToken: () => null,
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}));
vi.mock("@/lib/explorer", () => ({ explorerLink: () => null, STELLAR_NETWORK: "testnet" }));
vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: "unauthenticated", user: null }),
}));
vi.mock("@/hooks/useStellarHealth", () => ({
  // Health polling is out of scope here; return the initial state shape.
  useStellarHealth: () => ({ status: "checking", latencyMs: null, lastChecked: null }),
}));
vi.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

// Rates available for USD conversion (the mainnet-only fetch is bypassed by
// the mock, which returns the rates directly).
const mockRates: Record<string, number> = { XLM: 0.1, USDC: 1 };
vi.mock("@/hooks/useUsdRates", () => ({
  useUsdRates: () => ({
    rates: mockRates,
    loading: false,
    error: null,
    isStale: false,
    isMainnet: true,
  }),
}));

import { I18nProvider } from "@/i18n/i18n";
import {
  SettingsErrorBanner,
  SettingsFeedbackBanner,
  SettingsNotificationsProvider,
} from "@/features/settings/notifications";
import { SessionSettingsProvider } from "@/features/settings/session";
import { StellarHealthProvider } from "@/features/settings/stellar";
import { WalletSettingsProvider, WalletStatusPanel } from "@/features/settings/wallet";

function renderWalletPanel() {
  return render(
    <I18nProvider>
      <SettingsNotificationsProvider>
        <SessionSettingsProvider>
          <StellarHealthProvider>
            <WalletSettingsProvider>
              <SettingsFeedbackBanner />
              <WalletStatusPanel />
              <SettingsErrorBanner />
            </WalletSettingsProvider>
          </StellarHealthProvider>
        </SessionSettingsProvider>
      </SettingsNotificationsProvider>
    </I18nProvider>
  );
}

const balanceResponse = {
  address: "GABC",
  balances: {
    XLM: { balance: "10", asset_type: "native" },
  },
  last_updated: "2026-01-01T00:00:00Z",
};

describe("WalletSettingsProvider", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockRates.XLM = 0.1;
    mockRates.USDC = 1;
  });

  it("renders balances with USD conversion when rates are available", async () => {
    mockGet.mockResolvedValueOnce({ data: balanceResponse });

    renderWalletPanel();

    fireEvent.change(screen.getByPlaceholderText("Public key"), {
      target: { value: "GABC" },
    });
    fireEvent.click(screen.getByRole("button", { name: /load balance/i }));

    // 10 XLM * 0.1 = 1.00 USD
    expect(await screen.findByText("≈ $1.00 USD")).toBeInTheDocument();
    expect(screen.getByText("XLM")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders the balance row without a USD line when the asset has no rate", async () => {
    // USDC-only rates: XLM has no published rate, so no USD line is rendered
    // but the balance row stays visible.
    delete mockRates.XLM;
    mockGet.mockResolvedValueOnce({ data: balanceResponse });

    renderWalletPanel();

    fireEvent.change(screen.getByPlaceholderText("Public key"), {
      target: { value: "GABC" },
    });
    fireEvent.click(screen.getByRole("button", { name: /load balance/i }));

    expect(await screen.findByText("XLM")).toBeInTheDocument();
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument();
  });

  it("reports an error through the notifications context when loading balance without an address", async () => {
    renderWalletPanel();

    fireEvent.click(screen.getByRole("button", { name: /load balance/i }));

    expect(
      await screen.findByText("Load or link a wallet before requesting balances.")
    ).toBeInTheDocument();
  });

  it("reports an error through the notifications context when loading details without a user id", async () => {
    renderWalletPanel();

    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));

    expect(
      await screen.findByText("Provide a user ID or log in before loading wallet details.")
    ).toBeInTheDocument();
  });
});