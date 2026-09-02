/** ApexChain Frontend Test Suite */
/** ApexChain Network Operations Intelligence Platform */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "@/app/setting/page";
import { I18nProvider } from "@/i18n/i18n";

// SettingsPage requires the i18n context, same as settings-theme.test.tsx.
function renderSettingsPage() {
  return render(
    <I18nProvider>
      <SettingsPage />
    </I18nProvider>,
  );
}

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockToast = vi.fn();

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
// SettingsPage calls useRouter() for session actions; outside a real Next.js
// App Router tree this throws unless mocked (same as the other page tests).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const wallet = { user_id: "u1", public_key: "GABC", funded: true, trustline_ready: true, active: true, created_at: "2026-01-01T00:00:00Z", last_updated: "2026-01-01T00:00:00Z" };
const walletStatus = { user_id: "u1", public_key: "GABC", funded: true, trustline_ready: true, usable: true, active: true, last_updated: "2026-01-01T00:00:00Z" };

describe("SettingsPage", () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); });

  it("renders with unauthenticated state and no wallet", () => {
    renderSettingsPage();
    expect(screen.getByText("Settings and Wallet Control")).toBeInTheDocument();
    expect(screen.getAllByText("Not signed in.").length).toBeGreaterThan(0);
    expect(screen.getByText("Not linked")).toBeInTheDocument();
  });

  it("loads and displays wallet details", async () => {
    mockGet.mockResolvedValueOnce({ data: wallet }).mockResolvedValueOnce({ data: walletStatus });
    renderSettingsPage();
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Wallet details loaded.")).toBeInTheDocument();
    expect(screen.getAllByText("GABC").length).toBeGreaterThan(0);
  });

  it("renders unconfigured state when NEXT_PUBLIC_SLA_CONTRACT_ID is unset", () => {
    renderSettingsPage();

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
    renderSettingsPage();
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Provide a user ID or log in before loading wallet details.")).toBeInTheDocument();
  });

  it("shows ready banner when wallet is usable", async () => {
    mockGet.mockResolvedValueOnce({ data: wallet }).mockResolvedValueOnce({ data: walletStatus });
    renderSettingsPage();
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText(/Wallet is fully ready/)).toBeInTheDocument();
  });

  it("shows not-ready guidance when wallet is unusable", async () => {
    mockGet.mockResolvedValueOnce({ data: wallet }).mockResolvedValueOnce({ data: { ...walletStatus, usable: false, funded: false } });
    renderSettingsPage();
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

    renderSettingsPage();
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Wallet details loaded.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /fund testnet wallet/i }));

    expect(await screen.findByText("Wallet funded successfully.")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("/wallets/friendbot?address=GABC");
    expect(mockToast).toHaveBeenCalledWith("Wallet funded successfully.", "success");
  });
});
