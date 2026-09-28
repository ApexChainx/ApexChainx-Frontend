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
import { env } from "@/lib/config/env";
import { ENDPOINTS } from "@/lib/endpoints";
import { explorerLink } from "@/lib/explorer";
import { getThemePreference, setThemePreference } from "@/lib/theme-storage";
import { getUsdValue } from "@/lib/usd-value";
import { useRouter } from "next/navigation";

type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  stellar_wallet?: string | null;
  created_at: string;
};

type AuthSessionResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

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

  async function handleLogoutAll() {
    setSessionActionLoading("logout-all");
    setSessionActionFeedback(null);
    setSessionActionError(null);
    try {
      await api.post(ENDPOINTS.auth.logoutAll);
      await logout();
      router.replace("/login");
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;

      // Issue #529 — a 404 means the all-session revocation endpoint is not
      // deployed yet. This is NOT a server fault: signing out every session
      // is a single-vendor convenience, and the backend may not support it.
      // Sign out locally and stay on the page instead of silently navigating
      // (the server-side token may still be valid on other devices).
      if (status === 404) {
        setSessionActionLoading(null);
        await logout().catch(() => undefined);
        setSessionActionError(
          "All-session revocation isn't available on this server yet — you've been signed out of this session only. Other sessions will expire on their own."
        );
        return;
      }

      // Any other failure (5xx, network) — keep the session intact and let
      // the user retry rather than destroying local state for a failed call.
      setSessionActionError("Could not revoke all sessions. Please try again.");
      setSessionActionLoading(null);
    }
  }
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [registerForm, setRegisterForm] = useState({
    email: "operator@example.com",
    password: "secure123",
    full_name: "NOC Operator",
    role: "engineer",
  });
  const [loginForm, setLoginForm] = useState({
    email: "operator@example.com",
    password: "secure123",
  });
  const [walletForm, setWalletForm] = useState({
    user_id: "",
    public_key: "",
    funded: false,
    trustline_ready: false,
  });

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

  // USD rates for balance conversion (mainnet only)
  const { rates: usdRates, error: usdRatesError } = useUsdRates();

  async function handleRegister() {
    setLoadingAction("register");
    setError(null);
    setFeedback(null);

    try {
      const response = await api.post<AuthUser>(ENDPOINTS.auth.register, registerForm);
      setCurrentUser(response.data);
      setWalletForm((current) => ({
        ...current,
        user_id: response.data.id,
      }));
      setFeedback("Account registered successfully.");
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLogin() {
    setLoadingAction("login");
    setError(null);
    setFeedback(null);

    try {
      const response = await api.post<AuthSessionResponse>(ENDPOINTS.auth.login, loginForm);
      setSession(response.data);
      setCurrentUser(response.data.user);
      setWalletForm((current) => ({
        ...current,
        user_id: response.data.user.id,
      }));
      setFeedback("Signed in successfully.");
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLoadSession() {
    if (!session?.access_token) {
      setError("Login first to load the current session.");
      return;
    }

    setLoadingAction("session");
    setError(null);
    setFeedback(null);

    try {
      const response = await api.get<AuthUser>(ENDPOINTS.auth.me, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      setCurrentUser(response.data);
      setFeedback("Session refreshed from the backend.");
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLogout() {
    if (!session?.access_token) {
      setSession(null);
      setCurrentUser(null);
      setFeedback("Local session cleared.");
      return;
    }

    setLoadingAction("logout");
    setError(null);
    setFeedback(null);

    try {
      await api.post(
        ENDPOINTS.auth.logout,
        {},
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );
      setSession(null);
      setCurrentUser(null);
      setFeedback("Logged out successfully.");
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

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

              <SettingsFeedbackBanner />

              {/* Appearance (theme) + onboarding tour replay */}
              <AppearanceSettings />
              <OnboardingReplay />

              {/* Account profile (session module) */}
              <AccountProfile />

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

              {/* Stellar network health + SLA contract id (stellar module) */}
              <StellarHealthCard network={env.STELLAR_NETWORK} />
              <SLAContractIdCard
                contractId={env.SLA_CONTRACT_ID}
                network={env.STELLAR_NETWORK}
              />

              {/* Dev auth toolset (session module) + wallet status panel (wallet module) */}
              <div className="grid gap-6 lg:grid-cols-2">
                <DevAuthToolset />
                <WalletStatusPanel />
              </div>

              {/* Wallet readiness guidance (wallet module) */}
              <WalletReadinessGuidance />
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

/** Canonical SLA contract IDs published for each network */
const CANONICAL_SLA_CONTRACT_IDS: Record<string, string> = {
  testnet: "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  // TODO: replace the placeholder below with the actual published mainnet
  //       contract ID from the DOCS.md once it is confirmed.
  mainnet: "PLACEHOLDER_MAINNET_CONTRACT_ID_CHANGE_ME",
};

function SLAContractIdCard({
  contractId,
  network,
}: {
  contractId?: string | undefined;
  network: string;
}) {
  const canonicalId = CANONICAL_SLA_CONTRACT_IDS[network];
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