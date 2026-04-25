import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "@/app/setting/page";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) },
  getAccessToken: () => null,
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}));
vi.mock("@/lib/explorer", () => ({ explorerLink: () => null }));
vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: "unauthenticated", user: null }),
}));

const wallet = { user_id: "u1", public_key: "GABC", funded: true, trustline_ready: true, active: true, created_at: "2026-01-01T00:00:00Z", last_updated: "2026-01-01T00:00:00Z" };
const walletStatus = { user_id: "u1", public_key: "GABC", funded: true, trustline_ready: true, usable: true, active: true, last_updated: "2026-01-01T00:00:00Z" };

describe("SettingsPage", () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); });

  it("renders with unauthenticated state and no wallet", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings and Wallet Control")).toBeInTheDocument();
    expect(screen.getByText("Not signed in.")).toBeInTheDocument();
    expect(screen.getByText("Not linked")).toBeInTheDocument();
  });

  it("loads and displays wallet details", async () => {
    mockGet.mockResolvedValueOnce({ data: wallet }).mockResolvedValueOnce({ data: walletStatus });
    render(<SettingsPage />);
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Wallet details loaded.")).toBeInTheDocument();
    expect(screen.getAllByText("GABC").length).toBeGreaterThan(0);
  });

  it("shows error when loading wallet without user id", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Provide a user ID or log in before loading wallet details.")).toBeInTheDocument();
  });

  it("shows ready banner when wallet is usable", async () => {
    mockGet.mockResolvedValueOnce({ data: wallet }).mockResolvedValueOnce({ data: walletStatus });
    render(<SettingsPage />);
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText(/Wallet is fully ready/)).toBeInTheDocument();
  });

  it("shows not-ready guidance when wallet is unusable", async () => {
    mockGet.mockResolvedValueOnce({ data: wallet }).mockResolvedValueOnce({ data: { ...walletStatus, usable: false, funded: false } });
    render(<SettingsPage />);
    fireEvent.change(screen.getByPlaceholderText("User ID"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: /load wallet details/i }));
    expect(await screen.findByText("Wallet Not Ready — Next Steps")).toBeInTheDocument();
  });
});
