"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Settings wallet module (Issue #615).
 *
 * Owns every wallet concern on the settings page: the wallet form, wallet
 * details/status/balances fetching, the testnet friendbot funding action, and
 * the wallet stats cards + readiness guidance composed into the page layout.
 * The embedded auth stack's register/login handlers pre-fill the wallet form's
 * user id, so the provider keeps the form in sync with the session module's
 * `currentUser` (Issue #615 — mirrors the previous single-component behaviour).
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { useToast } from "@/components/ui/toast";
import { useUsdRates } from "@/hooks/useUsdRates";
import { useI18n } from "@/i18n/i18n";
import { api } from "@/lib/api";
import { env } from "@/lib/config/env";
import { ENDPOINTS } from "@/lib/endpoints";
import { explorerLink } from "@/lib/explorer";

import { useSettingsNotifications } from "./notifications";
import { useSessionSettings } from "./session";
import { useStellarHealthSettings } from "./stellar";
import type { Wallet, WalletBalance, WalletStatus } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface WalletFormState {
  user_id: string;
  public_key: string;
  funded: boolean;
  trustline_ready: boolean;
}

interface WalletSettingsContextValue {
  wallet: Wallet | null;
  walletStatus: WalletStatus | null;
  walletBalance: WalletBalance | null;
  walletForm: WalletFormState;
  setWalletForm: Dispatch<SetStateAction<WalletFormState>>;
  loadingAction: string | null;
  walletAddress: string;
  walletAssetCount: number;
  walletReadinessLabel: string;
  walletReadinessTone: string;
  activeUserId: string;
  usdRates: Record<string, number> | null;
  usdRatesError: string | null;
  isHorizonUnreachable: boolean;
  handleCreateWallet: () => Promise<void>;
  handleLinkWallet: () => Promise<void>;
  handleLoadWalletDetails: () => Promise<void>;
  handleLoadBalance: () => Promise<void>;
  handleFundTestnetWallet: () => Promise<void>;
}

const WalletSettingsContext = createContext<WalletSettingsContextValue | null>(null);

export function useWalletSettings(): WalletSettingsContextValue {
  const ctx = useContext(WalletSettingsContext);
  if (!ctx) {
    throw new Error("useWalletSettings must be used within WalletSettingsProvider");
  }
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function WalletSettingsProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { notifyError, notifyFeedback } = useSettingsNotifications();
  const { currentUser } = useSessionSettings();
  const { isHorizonUnreachable } = useStellarHealthSettings();
  const toast = useToast();
  const { rates: usdRates, error: usdRatesError } = useUsdRates();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [walletForm, setWalletForm] = useState<WalletFormState>({
    user_id: "",
    public_key: "",
    funded: false,
    trustline_ready: false,
  });

  // The session module's register/login set `currentUser`; keep the wallet
  // form's user id in sync so those actions pre-fill the form exactly as they
  // did when the page was a single component (Issue #615).
  useEffect(() => {
    if (!currentUser?.id) return;
    setWalletForm((current) =>
      current.user_id === currentUser.id ? current : { ...current, user_id: currentUser.id },
    );
  }, [currentUser?.id]);

  const activeUserId = useMemo(
    () => currentUser?.id ?? walletForm.user_id.trim(),
    [currentUser?.id, walletForm.user_id],
  );
  const walletAssetCount = useMemo(
    () => Object.keys(walletBalance?.balances ?? {}).length,
    [walletBalance],
  );
  const walletReadinessLabel = useMemo(() => {
    if (!walletStatus) {
      return t('settings.notLoaded');
    }
    if (!walletStatus.active) {
      return t('settings.inactive');
    }
    if (!walletStatus.funded) {
      return t('settings.fundingRequired');
    }
    if (!walletStatus.trustline_ready) {
      return t('settings.trustlineMissing');
    }
    return walletStatus.usable ? t('settings.ready') : t('settings.reviewRequired');
  }, [walletStatus, t]);
  const walletReadinessTone = useMemo(() => {
    if (!walletStatus) {
      return "text-slate-900";
    }
    return walletStatus.usable ? "text-emerald-600" : "text-amber-600";
  }, [walletStatus]);
  const walletAddress = wallet?.public_key ?? walletStatus?.public_key ?? walletForm.public_key;

  async function handleCreateWallet() {
    if (!activeUserId) {
      notifyError("Provide a user ID or log in before creating a wallet.");
      return;
    }

    setLoadingAction("create-wallet");
    notifyError(null);
    notifyFeedback(null);

    try {
      const response = await api.post<Wallet>(ENDPOINTS.wallets.create, {
        user_id: activeUserId,
      });
      setWallet(response.data);
      setWalletForm((current) => ({
        ...current,
        user_id: response.data.user_id,
        public_key: response.data.public_key,
        funded: response.data.funded,
        trustline_ready: response.data.trustline_ready,
      }));
      notifyFeedback(response.data.message ?? "Wallet created.");
    } catch (issue) {
      notifyError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLinkWallet() {
    if (!walletForm.user_id.trim() || !walletForm.public_key.trim()) {
      notifyError("Provide both a user ID and public key before linking a wallet.");
      return;
    }

    setLoadingAction("link-wallet");
    notifyError(null);
    notifyFeedback(null);

    try {
      const response = await api.post<Wallet>(ENDPOINTS.wallets.link, {
        user_id: walletForm.user_id.trim(),
        public_key: walletForm.public_key.trim(),
        funded: walletForm.funded,
        trustline_ready: walletForm.trustline_ready,
      });
      setWallet(response.data);
      notifyFeedback("Wallet linked successfully.");
    } catch (issue) {
      notifyError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLoadWalletDetails() {
    if (!activeUserId) {
      notifyError("Provide a user ID or log in before loading wallet details.");
      return;
    }

    setLoadingAction("wallet-details");
    notifyError(null);
    notifyFeedback(null);

    try {
      const [walletResponse, statusResponse] = await Promise.all([
        api.get<Wallet>(ENDPOINTS.wallets.byId(activeUserId)),
        api.get<WalletStatus>(ENDPOINTS.wallets.status(activeUserId)),
      ]);
      setWallet(walletResponse.data);
      setWalletStatus(statusResponse.data);
      setWalletForm((current) => ({
        ...current,
        user_id: walletResponse.data.user_id,
        public_key: walletResponse.data.public_key,
        funded: walletResponse.data.funded,
        trustline_ready: walletResponse.data.trustline_ready,
      }));
      notifyFeedback("Wallet details loaded.");
    } catch (issue) {
      notifyError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLoadBalance() {
    const address = wallet?.public_key ?? walletForm.public_key.trim();
    if (!address) {
      notifyError("Load or link a wallet before requesting balances.");
      return;
    }

    setLoadingAction("wallet-balance");
    notifyError(null);
    notifyFeedback(null);

    try {
      const response = await api.get<WalletBalance>(ENDPOINTS.wallets.balance(address));
      setWalletBalance(response.data);
      notifyFeedback("Wallet balance loaded.");
    } catch (issue) {
      notifyError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleFundTestnetWallet() {
    const address = wallet?.public_key ?? walletForm.public_key.trim();
    if (!address) {
      notifyError("Load or link a wallet before funding the wallet.");
      return;
    }

    setLoadingAction("fund-testnet-wallet");
    notifyError(null);
    notifyFeedback(null);

    try {
      await api.get(ENDPOINTS.wallets.friendbot(address));

      const statusUserId = wallet?.user_id ?? (activeUserId || address);
      const [statusResponse, balanceResponse] = await Promise.all([
        api.get<WalletStatus>(ENDPOINTS.wallets.status(statusUserId)),
        api.get<WalletBalance>(ENDPOINTS.wallets.balance(address)),
      ]);

      setWalletStatus(statusResponse.data);
      setWalletBalance(balanceResponse.data);
      setWalletForm((current) => ({
        ...current,
        funded: true,
      }));

      const successMessage = "Wallet funded successfully.";
      notifyFeedback(successMessage);
      toast(successMessage, "success");
    } catch (issue) {
      const errorMessage = getErrorMessage(issue);
      notifyError(errorMessage);
      toast(errorMessage, "error");
    } finally {
      setLoadingAction(null);
    }
  }

  const value: WalletSettingsContextValue = {
    wallet,
    walletStatus,
    walletBalance,
    walletForm,
    setWalletForm,
    loadingAction,
    walletAddress,
    walletAssetCount,
    walletReadinessLabel,
    walletReadinessTone,
    activeUserId,
    usdRates,
    usdRatesError,
    isHorizonUnreachable,
    handleCreateWallet,
    handleLinkWallet,
    handleLoadWalletDetails,
    handleLoadBalance,
    handleFundTestnetWallet,
  };

  return (
    <WalletSettingsContext.Provider value={value}>
      {children}
    </WalletSettingsContext.Provider>
  );
}

// ─── Stats grid cards ────────────────────────────────────────────────────────
export function WalletStatusCard() {
  const { t } = useI18n();
  const { walletAddress, handleFundTestnetWallet, loadingAction, isHorizonUnreachable } =
    useWalletSettings();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('settings.wallet')}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">
        {walletAddress ? t('settings.connected') : t('settings.notLinked')}
      </p>
      <p className="mt-1 truncate text-sm text-slate-500">
        {walletAddress || t('settings.createLinkWallet')}
      </p>
      {env.STELLAR_NETWORK === "testnet" && walletAddress ? (
        <button
          type="button"
          onClick={() => void handleFundTestnetWallet()}
          disabled={loadingAction === "fund-testnet-wallet" || isHorizonUnreachable}
          className="mt-3 w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
        >
          {loadingAction === "fund-testnet-wallet" ? "Funding..." : "Fund testnet wallet"}
        </button>
      ) : null}
    </div>
  );
}

export function WalletReadinessCard() {
  const { t } = useI18n();
  const { walletStatus, walletReadinessLabel, walletReadinessTone } = useWalletSettings();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('settings.readiness')}</p>
      <p className={`mt-2 text-xl font-semibold ${walletReadinessTone}`}>
        {walletReadinessLabel}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {walletStatus
          ? `${walletStatus.funded ? t('settings.funded') : t('settings.unfunded')} • ${
              walletStatus.trustline_ready ? t('settings.trustlineReady') : t('settings.trustlineMissing')
            }`
          : t('settings.loadWalletDetails')}
      </p>
    </div>
  );
}

export function WalletBalancesCard() {
  const { t } = useI18n();
  const { walletAssetCount } = useWalletSettings();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('settings.balances')}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{walletAssetCount}</p>
      <p className="mt-1 text-sm text-slate-500">
        {walletAssetCount > 0 ? t('settings.trackedAssetsLoaded') : t('settings.noBalanceData')}
      </p>
    </div>
  );
}

// ─── Wallet status panel ─────────────────────────────────────────────────────
export function WalletStatusPanel() {
  const { t } = useI18n();
  const {
    wallet,
    walletStatus,
    walletBalance,
    walletForm,
    setWalletForm,
    loadingAction,
    isHorizonUnreachable,
    handleCreateWallet,
    handleLinkWallet,
    handleLoadWalletDetails,
    handleLoadBalance,
    usdRates,
  } = useWalletSettings();

  function getUsdValue(assetCode: string, balance: string): string | null {
    if (!usdRates || !usdRates[assetCode]) return null;
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) return null;
    return (numBalance * usdRates[assetCode]).toFixed(2);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('settings.walletStatus')}</h2>
        <p className="text-sm text-slate-500">
          {t('settings.walletBackendBridge')}
        </p>
      </div>

      <div className="grid gap-3">
        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={walletForm.user_id}
          onChange={(event) =>
            setWalletForm((current) => ({
              ...current,
              user_id: event.target.value,
            }))
          }
          placeholder="User ID"
        />
        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={walletForm.public_key}
          onChange={(event) =>
            setWalletForm((current) => ({
              ...current,
              public_key: event.target.value,
            }))
          }
          placeholder="Public key"
        />
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={walletForm.funded}
              onChange={(event) =>
                setWalletForm((current) => ({
                  ...current,
                  funded: event.target.checked,
                }))
              }
            />
            Funded
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={walletForm.trustline_ready}
              onChange={(event) =>
                setWalletForm((current) => ({
                  ...current,
                  trustline_ready: event.target.checked,
                }))
              }
            />
            Trustline ready
          </label>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => void handleCreateWallet()}
          disabled={loadingAction === "create-wallet" || isHorizonUnreachable}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          title={isHorizonUnreachable ? "Horizon is unreachable — wallet actions disabled" : "Create wallet"}
        >
          {loadingAction === "create-wallet" ? "Creating..." : "Create wallet"}
        </button>
        <button
          onClick={() => void handleLinkWallet()}
          disabled={loadingAction === "link-wallet" || isHorizonUnreachable}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          title={isHorizonUnreachable ? "Horizon is unreachable — wallet actions disabled" : "Link wallet"}
        >
          {loadingAction === "link-wallet" ? "Linking..." : "Link wallet"}
        </button>
        <button
          onClick={() => void handleLoadWalletDetails()}
          disabled={loadingAction === "wallet-details" || isHorizonUnreachable}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          title={isHorizonUnreachable ? "Horizon is unreachable — wallet actions disabled" : "Load wallet details"}
        >
          {loadingAction === "wallet-details" ? "Loading..." : "Load wallet details"}
        </button>
        <button
          onClick={() => void handleLoadBalance()}
          disabled={loadingAction === "wallet-balance" || isHorizonUnreachable}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          title={isHorizonUnreachable ? "Horizon is unreachable — wallet actions disabled" : "Load balance"}
        >
          {loadingAction === "wallet-balance" ? "Loading..." : "Load balance"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <h3 className="font-medium text-slate-900">Wallet details</h3>
          {wallet ? (
            <dl className="mt-3 grid gap-2 text-slate-600">
              <div className="flex justify-between gap-4">
                <dt>Address</dt>
                <dd className="break-all text-right font-medium text-slate-900">
                  {explorerLink("account", wallet.public_key) ? (
                    <a href={explorerLink("account", wallet.public_key)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {wallet.public_key}
                    </a>
                  ) : wallet.public_key}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Funded</dt>
                <dd className="font-medium text-slate-900">
                  {wallet.funded ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Trustline</dt>
                <dd className="font-medium text-slate-900">
                  {wallet.trustline_ready ? "Ready" : "Missing"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-slate-500">No wallet loaded yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <h3 className="font-medium text-slate-900">Wallet readiness</h3>
          {walletStatus ? (
            <dl className="mt-3 grid gap-2 text-slate-600">
              <div className="flex justify-between gap-4">
                <dt>Active</dt>
                <dd className="font-medium text-slate-900">
                  {walletStatus.active ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Usable</dt>
                <dd className="font-medium text-slate-900">
                  {walletStatus.usable ? "Ready" : "Not ready"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Last updated</dt>
                <dd className="font-medium text-slate-900">
                  {new Date(walletStatus.last_updated).toLocaleString()}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-slate-500">Load wallet details to inspect readiness.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <h3 className="font-medium text-slate-900">Balances</h3>
        {walletBalance ? (
          <div className="mt-3 grid gap-2">
            {Object.entries(walletBalance.balances).map(([asset, balance]) => {
              const usdValue = getUsdValue(asset, balance.balance);
              return (
                <div
                  key={asset}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{asset}</span>
                    {usdValue && (
                      <span className="text-xs text-emerald-600">≈ ${usdValue} USD</span>
                    )}
                  </div>
                  <span className="text-slate-600">{balance.balance}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-slate-500">No balance data loaded yet.</p>
        )}
      </div>
    </section>
  );
}

// ─── Wallet readiness guidance (FE-022) ─────────────────────────────────────
export function WalletReadinessGuidance() {
  const { walletStatus } = useWalletSettings();

  return (
    <>
      {walletStatus && !walletStatus.usable && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-900">Wallet Not Ready — Next Steps</h2>
          <p className="mt-1 text-sm text-amber-700">
            Your wallet must be funded and have a trustline set up before payments can be processed.
          </p>
          <ul className="mt-4 space-y-3">
            {!walletStatus.active && (
              <li className="flex items-start gap-3 text-sm text-amber-800">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-amber-200 text-center text-xs font-bold leading-5 text-amber-900">1</span>
                <span><strong>Activate your wallet.</strong> The wallet is currently inactive. Contact your administrator or re-link the wallet via the Wallet Status panel above.</span>
              </li>
            )}
            {walletStatus.active && !walletStatus.funded && (
              <li className="flex items-start gap-3 text-sm text-amber-800">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-amber-200 text-center text-xs font-bold leading-5 text-amber-900">2</span>
                <span><strong>Fund your wallet.</strong> Send at least 1 XLM to <code className="rounded bg-amber-100 px-1 font-mono text-xs">{walletStatus.public_key}</code> on the Stellar network to activate the account.</span>
              </li>
            )}
            {walletStatus.active && walletStatus.funded && !walletStatus.trustline_ready && (
              <li className="flex items-start gap-3 text-sm text-amber-800">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-amber-200 text-center text-xs font-bold leading-5 text-amber-900">3</span>
                <span><strong>Set up a trustline.</strong> Your wallet is funded but missing a trustline for the payment asset. Use the Stellar Laboratory or your wallet app to add a trustline for the required asset.</span>
              </li>
            )}
          </ul>
        </section>
      )}

      {walletStatus?.usable && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-800">
            ✓ Wallet is fully ready — funded, trustline active, and usable for payments.
          </p>
        </section>
      )}
    </>
  );
}

// ─── Composed module ─────────────────────────────────────────────────────────
export default function WalletSettings() {
  return (
    <>
      <WalletStatusCard />
      <WalletReadinessCard />
      <WalletBalancesCard />
      <WalletStatusPanel />
      <WalletReadinessGuidance />
    </>
  );
}