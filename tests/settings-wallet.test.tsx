/** ApexChain Frontend Test Suite */
/** ApexChain Network Operations Intelligence Platform */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { I18nProvider } from "@/i18n/i18n";
import SettingsPage from "@/app/setting/page";

/** SettingsPage needs the real i18n context (not mocked in this file). */
function renderSettings(ui: ReactElement = <SettingsPage />) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockToast = vi.fn();

vi.mock("next/navigation", () => ({
  // SettingsPage calls useRouter(); outside a real App Router tree this
  // throws "invariant expected app router to be mounted" unless mocked.
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
vi.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));
vi.mock("@/hooks/useStellarHealth", () => ({
  // Health polling is out of scope here; return the initial state shape.
  useStellarHealth: () => ({ status: "checking", latencyMs: null, lastChecked: null }),
}));
vi.mock("@/hooks/useUsdRates", () => ({
  useUsdRates: () => ({ rates: null, loading: false, error: null, isMainnet: false }),
}));

// SettingsPage reads theme via matchMedia (jsdom does not implement it).
vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
})));

const wallet = { user_id: "u1", public_key: "GABC", funded: true, trustline_ready: true, active: true, created_at: "2026-01-01T00:00:00Z", last_updated: "2026-01-01T00:00:00Z" };
const walletStatus = { user_id: "u1", public_key: "GABC", funded: true, trustline_ready: true, usable: true, active: true, last_updated: "2026-01-01T00:00:00Z" };

describe("SettingsPage", () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); });

  it("renders with unauthenticated state and no wallet", () => {
    renderSettings();
    expect(screen.getByText("Settings and Wallet Control")).toBeInTheDocument();
    // The page repeats the signed-out notice in the session card and the
    // wallet card, so assert on at least one occurrence.
    expect(screen.getAllByText("Not signed in.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not linked").length).toBeGreaterThan(0);
  });

  it("loads and displays wallet details", async () => {
    mockGet.mockResolvedValueOnce({ data: wallet }).mockResolvedValueOnce({ data: walletStatus });
    renderSettings();
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Wallet details loaded.")).toBeInTheDocument();
    expect(screen.getAllByText("GABC").length).toBeGreaterThan(0);
  });

  it("renders unconfigured state when NEXT_PUBLIC_SLA_CONTRACT_ID is unset", () => {
    renderSettings();

    // The SLA contract card renders an explicit unconfigured state instead of
    // surfacing the all-C placeholder as if it were a real Stellar contract.
    expect(screen.getByText("SLA Contract ID")).toBeInTheDocument();
    expect(screen.getByText("Contract not configured")).toBeInTheDocument();
    expect(screen.getAllByText("Not configured").length).toBeGreaterThan(0);

    // No placeholder ever renders as an address, and nothing is claimed verified.
    expect(screen.queryAllByText(/CCCCCCCC/).length).toBe(0);
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  it("shows error when loading wallet without user id", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Provide a user ID or log in before loading wallet details.")).toBeInTheDocument();
  });

  it("shows ready banner when wallet is usable", async () => {
    mockGet.mockResolvedValueOnce({ data: wallet }).mockResolvedValueOnce({ data: walletStatus });
    renderSettings();
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText(/Wallet is fully ready/)).toBeInTheDocument();
  });

  it("shows not-ready guidance when wallet is unusable", async () => {
    mockGet.mockResolvedValueOnce({ data: wallet }).mockResolvedValueOnce({ data: { ...walletStatus, usable: false, funded: false } });
    renderSettings();
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Wallet Not Ready — Next Steps")).toBeInTheDocument();
  });

  it("funds a testnet wallet through the backend proxy and refreshes balance", async () => {
    mockGet
      .mockResolvedValueOnce({ data: wallet })
      .mockResolvedValueOnce({ data: walletStatus })
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockResolvedValueOnce({ data: walletStatus })
      .mockResolvedValueOnce({ data: { address: "GABC", balances: {}, last_updated: "2026-01-01T00:00:00Z" } });

    renderSettings();
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Wallet details loaded.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /fund testnet wallet/i }));

    expect(await screen.findByText("Wallet funded successfully.")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("/wallets/friendbot?address=GABC");
    expect(mockToast).toHaveBeenCalledWith("Wallet funded successfully.", "success");
  });
});
