"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Settings page shell (Issue #615).
 *
 * The page used to be a single ~1400-line component mixing session control,
 * account profile, theme, language, wallet forms, Stellar health, the SLA
 * contract id, onboarding replay, and the dev auth toolset. It is now a thin
 * shell: every concern lives in a feature module under `src/features/settings/`
 * that owns its own data-fetching and state, and this file only nests the
 * module providers and composes the sections in the original layout order so
 * the rendered page — and therefore e2e behaviour — is identical.
 *
 * Module map:
 *   - session.tsx    session control, account profile, dev auth toolset,
 *                    session status card
 *   - wallet.tsx     wallet form/details/balances, friendbot funding, wallet
 *                    stats cards, readiness guidance
 *   - appearance.tsx theme preference + onboarding tour replay
 *   - language.tsx   language selector
 *   - stellar.tsx    Stellar network health card + SLA contract id card
 *   - notifications.tsx page-level feedback/error banners
 */
import { useI18n } from "@/i18n/i18n";
import { env, resolveCanonicalSlaContractId } from "@/lib/config/env";
import { ENDPOINTS } from "@/lib/endpoints";
import { explorerLink } from "@/lib/explorer";
import { getThemePreference, setThemePreference } from "@/lib/theme-storage";
import { getUsdValue } from "@/lib/usd-value";
import { useRouter } from "next/navigation";

type Wallet = {
  user_id: string;
  public_key: string;
  created_at: string;
  last_updated: string;
  funded: boolean;
  active: boolean;
  trustline_ready: boolean;
  message?: string;
};

type WalletStatus = {
  user_id: string;
  public_key: string;
  funded: boolean;
  trustline_ready: boolean;
  usable: boolean;
  active: boolean;
  last_updated: string;
};

type WalletBalance = {
  address: string;
  balances: Record<
    string,
    {
      balance: string;
      asset_type: string;
      asset_code?: string;
      asset_issuer?: string;
    }
  >;
  last_updated: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export default function SettingsPage() {
  const { state: sessionState, user: sessionUser, logout } = useSession();
  const router = useRouter();
  const toast = useToast();
  const { t, locale, setLocale, locales, localeNames } = useI18n();
  const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null);
  const [sessionActionFeedback, setSessionActionFeedback] = useState<string | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>("system");

  // Issue #128 — Stellar Horizon reachability + latency
  const stellarHealth = useStellarHealth();
  const isHorizonUnreachable = stellarHealth.status === "unreachable";

  // Initialize theme from storage (Issue #619 — namespaced key, migrates the
  // legacy "theme" key once on read)
  useEffect(() => {
    setTheme(getThemePreference());
  }, []);

  // Update theme when it changes
  useEffect(() => {
    const root = document.documentElement;
    
    function applyTheme(currentTheme: string) {
      if (currentTheme === 'dark') {
        root.classList.add('dark');
      } else if (currentTheme === 'light') {
        root.classList.remove('dark');
      } else {
        // System preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    }

    applyTheme(theme);
    setThemePreference(theme);

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function handleSystemThemeChange() {
      if (theme === 'system') {
        applyTheme('system');
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  async function handleSignOut() {
    setSessionActionLoading("signout");
    setSessionActionFeedback(null);
    setSessionActionError(null);
    try {
      const { serverRevoked } = await logout();
      if (!serverRevoked) {
        setSessionActionError(
          "Signed out on this device, but we couldn't confirm the server session was revoked. If you're on a shared device, please close the browser to be safe."
        );
      }
      router.replace("/login");
    } finally {
      setSessionActionLoading(null);
    }
  }

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [walletForm, setWalletForm] = useState({
    user_id: "",
    public_key: "",
    funded: false,
    trustline_ready: false,
  });

  const activeUserId = useMemo(
    () => walletForm.user_id.trim(),
    [walletForm.user_id],
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

  // USD rates for balance conversion (mainnet only)
  const { rates: usdRates, error: usdRatesError } = useUsdRates();

  async function handleCreateWallet() {
    if (!activeUserId) {
      setError("Provide a user ID or log in before creating a wallet.");
      return;
    }

    setLoadingAction("create-wallet");
    setError(null);
    setFeedback(null);

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
      setFeedback(response.data.message ?? "Wallet created.");
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLinkWallet() {
    if (!walletForm.user_id.trim() || !walletForm.public_key.trim()) {
      setError("Provide both a user ID and public key before linking a wallet.");
      return;
    }

    setLoadingAction("link-wallet");
    setError(null);
    setFeedback(null);

    try {
      const response = await api.post<Wallet>(ENDPOINTS.wallets.link, {
        user_id: walletForm.user_id.trim(),
        public_key: walletForm.public_key.trim(),
        funded: walletForm.funded,
        trustline_ready: walletForm.trustline_ready,
      });
      setWallet(response.data);
      setFeedback("Wallet linked successfully.");
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLoadWalletDetails() {
    if (!activeUserId) {
      setError("Provide a user ID or log in before loading wallet details.");
      return;
    }

    setLoadingAction("wallet-details");
    setError(null);
    setFeedback(null);

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
      setFeedback("Wallet details loaded.");
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  // Some proxies answer with a 200/400 and a rate-limit body instead of
  // HTTP 429 — flag those too rather than showing a generic failure.
  if (response?.data && typeof response.data === "object") {
    const bodyText = JSON.stringify(response.data).toLowerCase();
    if (bodyText.includes("rate limit") || bodyText.includes("rate_limit")) {
      return t('settings.friendbotRateLimited');
    }
  }

  return getErrorMessage(issue);
}

export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <SettingsNotificationsProvider>
      <SessionSettingsProvider>
        <StellarHealthProvider>
          <WalletSettingsProvider>
            <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  {t('settings.walletControl')}
                </h1>
                <p className="text-sm text-slate-500">
                  {t('settings.manageSessionWallet')}
                </p>
              </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm space-y-3">
            <h3 className="font-medium text-slate-900">{t('settings.signOutOfThisSession')}</h3>
            <p className="text-slate-500">
              {t('settings.endsCurrentSession')}
            </p>
            <button
              onClick={() => void handleSignOut()}
              disabled={sessionState !== "authenticated" || sessionActionLoading !== null}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {sessionActionLoading === "signout" ? `${t('common.loading')}` : t('common.signOut')}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
          <p className="font-medium">{t('settings.howSessionRefreshWorks')}</p>
          <p>
            {t('settings.sessionRefreshExplanation')}
          </p>
          <p>
            {t('settings.sessionExpiredMessage')}
          </p>
        </div>
      </section>

      {/* Language Settings */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">{t('settings.languageSettings')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('settings.selectLanguage')}</p>
        
        <div className="mt-6 max-w-md">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {localeNames[locale]}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[200px]">
              {locales.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className={`flex cursor-pointer items-center justify-between px-4 py-2 text-sm ${
                    locale === loc ? "bg-slate-100 font-medium" : ""
                  }`}
                >
                  {localeNames[loc]}
                  {locale === loc && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('settings.session')}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {sessionUser ? t('settings.authenticated') : t('settings.notSignedIn')}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {sessionUser?.email ?? t('settings.loadCreateAccount')}
          </p>
        </div>

              <SettingsErrorBanner />

              {/* Session control (session module) */}
              <SessionControl />

              {/* Language selector (language module) */}
              <LanguageSettings />

              {/* Stats grid: session card (session module) + wallet cards (wallet module) */}
              <div className="grid gap-4 md:grid-cols-4">
                <SessionStatusCard />
                <WalletStatusCard />
                <WalletReadinessCard />
                <WalletBalancesCard />
              </div>

          {/*
            Issue #616 — account access routes through the shared session
            provider and the real /login and /register flows. The duplicate
            embedded auth stack (register/login/refresh/logout handlers and
            this identity card) was removed so the session provider stays
            the single source of truth for auth transitions.
          */}
          {sessionState === "unauthenticated" && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {t('settings.signIn')}
              </button>
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {t('settings.registerAccount')}
              </button>
            </div>
          )}
          {sessionState === "authenticated" && sessionUser && (
            <p className="text-sm text-slate-600">
              Signed in as{" "}
              <span className="font-medium text-slate-900">{sessionUser.email}</span>{" "}
              — manage your session below.
            </p>
          )}
        </section>

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
              onClick={handleCreateWallet}
              disabled={loadingAction === "create-wallet" || isHorizonUnreachable}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              title={isHorizonUnreachable ? "Horizon is unreachable — wallet actions disabled" : "Create wallet"}
            >
              {loadingAction === "create-wallet" ? "Creating..." : "Create wallet"}
            </button>
            <button
              onClick={handleLinkWallet}
              disabled={loadingAction === "link-wallet" || isHorizonUnreachable}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              title={isHorizonUnreachable ? "Horizon is unreachable — wallet actions disabled" : "Link wallet"}
            >
              {loadingAction === "link-wallet" ? "Linking..." : "Link wallet"}
            </button>
            <button
              onClick={handleLoadWalletDetails}
              disabled={loadingAction === "wallet-details" || isHorizonUnreachable}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              title={isHorizonUnreachable ? "Horizon is unreachable — wallet actions disabled" : "Load wallet details"}
            >
              {loadingAction === "wallet-details" ? "Loading..." : "Load wallet details"}
            </button>
            <button
              onClick={handleLoadBalance}
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
            {/* Issue #617 — a failed rate service is reported separately from a
                per-asset missing rate so operators are not left wondering why
                USD lines are absent. */}
            {walletBalance && usdRatesError ? (
              <p className="mt-3 text-xs text-amber-600">
                USD rates unavailable — showing balances only
              </p>
            ) : null}
            {walletBalance ? (
              <div className="mt-3 grid gap-2">
                {Object.entries(walletBalance.balances).map(([asset, balance]) => {
                  const usdValue = getUsdValue(usdRates, usdRatesError, asset, balance.balance);
                  return (
                  <div
                    key={asset}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{asset}</span>
                      {usdValue.kind === "value" && (
                        <span className="text-xs text-emerald-600">≈ ${usdValue.usd} USD</span>
                      )}
                      {usdValue.kind === "no-rate" && (
                        <span className="text-xs text-slate-400">rate unavailable</span>
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
      </div>

      {/* FE-022: Wallet readiness guidance */}
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Issue #128 — Stellar Network Health Card                                   */
/* -------------------------------------------------------------------------- */

function StellarHealthCard({
  horizonStatus,
  latencyMs,
  network,
}: {
  horizonStatus: string;
  latencyMs: number | null;
  network: string;
}) {
  const isReachable = horizonStatus === "reachable";
  const isChecking = horizonStatus === "checking";

  const statusIcon = isChecking ? (
    <div className="h-3 w-3 animate-pulse rounded-full bg-amber-400" />
  ) : isReachable ? (
    <div className="h-3 w-3 rounded-full bg-emerald-500" />
  ) : (
    <div className="h-3 w-3 rounded-full bg-red-500" />
  );

  const statusLabel = isChecking
    ? "Checking..."
    : isReachable
    ? "Reachable"
    : "Unreachable";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Stellar Network Status
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Horizon endpoint health check for the {network} network
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {statusIcon}
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Latency
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {isChecking
              ? "—"
              : latencyMs !== null
              ? `${latencyMs} ms`
              : "N/A"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Network
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900 capitalize">
            {network}
          </p>
        </div>
      </div>

      {!isReachable && !isChecking && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Horizon is unreachable</p>
          <p className="mt-1 text-red-700">
            Stellar network actions (wallet creation, payments) are currently
            unavailable. Please check your network connection or the Horizon
            endpoint configuration.
          </p>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Issue #129 — SLA Contract ID Card                                         */
/* -------------------------------------------------------------------------- */

/**
 * Issue #640 — canonical ids come from deployment config, so the page no longer
 * carries its own (placeholder) copy of the table.
 */

function SLAContractIdCard({
  contractId,
  network,
}: {
  contractId?: string | undefined;
  network: string;
}) {
  const canonicalId = resolveCanonicalSlaContractId(network);
  const isConfigured = Boolean(contractId?.trim());
  const isMismatch =
    isConfigured && Boolean(canonicalId) && contractId !== canonicalId;
  const isVerified = isConfigured && !isMismatch && Boolean(canonicalId);

  const truncatedId =
    contractId && contractId.length > 10
      ? `${contractId.slice(0, 6)}...${contractId.slice(-4)}`
      : contractId ?? "";

  const canonicalTruncated =
    canonicalId && canonicalId.length > 10
      ? `${canonicalId.slice(0, 6)}...${canonicalId.slice(-4)}`
      : canonicalId ?? "";

  const sectionTone = isMismatch
    ? "border-red-200 bg-red-50"
    : isConfigured
    ? "border-slate-200 bg-white"
    : "border-amber-200 bg-amber-50";

  return (
    <section className={`rounded-2xl border p-6 shadow-sm ${sectionTone}`}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            SLA Contract ID
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Resolved smart contract identifier used for SLA calculation calls
          </p>
        </div>
        {isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Verified
          </span>
        )}
        {isMismatch && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mismatch
          </span>
        )}
        {!isConfigured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18zm-1 4h2v6h-2z" />
            </svg>
            Not configured
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Resolved Contract ID
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
            {isConfigured ? truncatedId : "Not configured"}
          </p>
        </div>
        {isConfigured && canonicalId && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Expected ({network})
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {canonicalTruncated}
            </p>
          </div>
        )}
      </div>

      {!isConfigured && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Contract not configured</p>
          <p className="mt-1">
            No SLA contract is configured for this deployment. Set the
            NEXT_PUBLIC_SLA_CONTRACT_ID environment variable to display the real
            contract address on this card.
          </p>
        </div>
      )}

      {isMismatch && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Contract ID Mismatch</p>
          <p className="mt-1 text-red-600">
            The configured SLA contract ID does not match the canonical published
            contract ID for the {network} network. Double-check your
            NEXT_PUBLIC_SLA_CONTRACT_ID environment variable to ensure it points
            to the correct contract.
          </p>
        </div>
      )}
    </section>
  );
}