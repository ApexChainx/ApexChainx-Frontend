"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Settings session module (Issue #615).
 *
 * Owns session control (sign out / revoke all), the account-profile section,
 * the dev auth toolset (register / login / refresh / logout), and the session
 * status card composed into the page-level stats grid. State is shared
 * between the module's sections through `SessionSettingsProvider`.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { useRouter } from "next/navigation";

import { useSession } from "@/hooks/useSession";
import { useI18n } from "@/i18n/i18n";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

import { useSettingsNotifications } from "./notifications";
import type { AuthSessionResponse, AuthUser } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface AuthRegisterForm {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

interface AuthLoginForm {
  email: string;
  password: string;
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface SessionSettingsContextValue {
  sessionState: string;
  sessionUser: AuthUser | null;
  logout: () => Promise<{ serverRevoked: boolean }>;
  session: AuthSessionResponse | null;
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  sessionActionLoading: string | null;
  sessionActionFeedback: string | null;
  sessionActionError: string | null;
  handleSignOut: () => Promise<void>;
  handleLogoutAll: () => Promise<void>;
  registerForm: AuthRegisterForm;
  setRegisterForm: Dispatch<SetStateAction<AuthRegisterForm>>;
  loginForm: AuthLoginForm;
  setLoginForm: Dispatch<SetStateAction<AuthLoginForm>>;
  handleRegister: () => Promise<void>;
  handleLogin: () => Promise<void>;
  handleLoadSession: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

const SessionSettingsContext = createContext<SessionSettingsContextValue | null>(null);

export function useSessionSettings(): SessionSettingsContextValue {
  const ctx = useContext(SessionSettingsContext);
  if (!ctx) {
    throw new Error("useSessionSettings must be used within SessionSettingsProvider");
  }
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function SessionSettingsProvider({ children }: { children: ReactNode }) {
  const { state: sessionState, user: sessionUser, logout } = useSession();
  const router = useRouter();
  const { notifyError, notifyFeedback } = useSettingsNotifications();

  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null);
  const [sessionActionFeedback, setSessionActionFeedback] = useState<string | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);

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

  const handleSignOut = useCallback(async () => {
    setSessionActionLoading("signout");
    setSessionActionFeedback(null);
    setSessionActionError(null);
    try {
      const { serverRevoked } = await logout();
      if (!serverRevoked) {
        setSessionActionError(
          "Signed out on this device, but we couldn't confirm the server session was revoked. If you're on a shared device, please close the browser to be safe.",
        );
      }
      router.replace("/login");
    } finally {
      setSessionActionLoading(null);
    }
  }, [logout, router]);

  const handleLogoutAll = useCallback(async () => {
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
          "All-session revocation isn't available on this server yet — you've been signed out of this session only. Other sessions will expire on their own.",
        );
        return;
      }

      // Any other failure (5xx, network) — keep the session intact and let
      // the user retry rather than destroying local state for a failed call.
      setSessionActionError("Could not revoke all sessions. Please try again.");
      setSessionActionLoading(null);
    }
  }, [logout, router]);

  const handleRegister = useCallback(async () => {
    notifyError(null);
    notifyFeedback(null);

    try {
      const response = await api.post<AuthUser>(ENDPOINTS.auth.register, registerForm);
      setCurrentUser(response.data);
      setFeedback("Account registered successfully.");
    } catch (issue) {
      notifyError(getErrorMessage(issue));
    }
  }, [api, registerForm, notifyError, notifyFeedback]);

  const handleLogin = useCallback(async () => {
    notifyError(null);
    notifyFeedback(null);

    try {
      const response = await api.post<AuthSessionResponse>(ENDPOINTS.auth.login, loginForm);
      setSession(response.data);
      setCurrentUser(response.data.user);
      setFeedback("Signed in successfully.");
    } catch (issue) {
      notifyError(getErrorMessage(issue));
    }
  }, [api, loginForm, notifyError, notifyFeedback]);

  const handleLoadSession = useCallback(async () => {
    if (!session?.access_token) {
      notifyError("Login first to load the current session.");
      return;
    }

    notifyError(null);
    notifyFeedback(null);

    try {
      const response = await api.get<AuthUser>(ENDPOINTS.auth.me, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      setCurrentUser(response.data);
      setFeedback("Session refreshed from the backend.");
    } catch (issue) {
      notifyError(getErrorMessage(issue));
    }
  }, [api, session?.access_token, notifyError, notifyFeedback]);

  const handleLogout = useCallback(async () => {
    if (!session?.access_token) {
      setSession(null);
      setCurrentUser(null);
      setFeedback("Local session cleared.");
      return;
    }

    notifyError(null);
    notifyFeedback(null);

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
      notifyError(getErrorMessage(issue));
    }
  }, [api, session?.access_token, notifyError, notifyFeedback]);

  // Local feedback setter that reports to the page-level banner.
  const setFeedback = useCallback(
    (message: string) => notifyFeedback(message),
    [notifyFeedback],
  );

  const value = useMemo<SessionSettingsContextValue>(
    () => ({
      sessionState,
      sessionUser,
      logout,
      session,
      currentUser,
      setCurrentUser,
      sessionActionLoading,
      sessionActionFeedback,
      sessionActionError,
      handleSignOut,
      handleLogoutAll,
      registerForm,
      setRegisterForm,
      loginForm,
      setLoginForm,
      handleRegister,
      handleLogin,
      handleLoadSession,
      handleLogout,
    }),
    [
      sessionState,
      sessionUser,
      logout,
      session,
      currentUser,
      sessionActionLoading,
      sessionActionFeedback,
      sessionActionError,
      handleSignOut,
      handleLogoutAll,
      registerForm,
      setRegisterForm,
      loginForm,
      setLoginForm,
      handleRegister,
      handleLogin,
      handleLoadSession,
      handleLogout,
      setFeedback,
    ],
  );

  return (
    <SessionSettingsContext.Provider value={value}>
      {children}
    </SessionSettingsContext.Provider>
  );
}

// ─── Account profile (FE-056) ────────────────────────────────────────────────
export function AccountProfile() {
  const { t } = useI18n();
  const { sessionState, sessionUser } = useSessionSettings();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Account Profile</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current session identity and metadata.</p>
      {sessionState === "loading" && (
        <p className="mt-4 text-sm text-slate-400">{t('settings.loadingSession')}</p>
      )}
      {sessionState === "unauthenticated" && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Not signed in.</p>
      )}
      {sessionState === "authenticated" && sessionUser && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {[
            { label: "Email", value: sessionUser.email },
            { label: "Role", value: sessionUser.role },
            { label: "Full name", value: sessionUser.full_name ?? "—" },
            { label: "User ID", value: sessionUser.id },
            { label: "Wallet", value: sessionUser.stellar_wallet ?? "Not linked" },
            {
              label: "Member since",
              value: sessionUser.created_at
                ? new Date(sessionUser.created_at).toLocaleDateString()
                : "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 truncate font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

// ─── Session control (FE-008) ────────────────────────────────────────────────
export function SessionControl() {
  const { t } = useI18n();
  const {
    sessionState,
    sessionActionLoading,
    sessionActionFeedback,
    sessionActionError,
    handleSignOut,
    handleLogoutAll,
  } = useSessionSettings();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{t('settings.sessionManagement')}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {t('settings.controlActiveSession')}
      </p>

      {sessionActionFeedback && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {sessionActionFeedback}
        </div>
      )}
      {sessionActionError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {sessionActionError}
        </div>
      )}

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

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm space-y-3">
          <h3 className="font-medium text-slate-900">{t('settings.revokeAllSessions')}</h3>
          <p className="text-slate-500">
            {t('settings.invalidateAllTokens')}
          </p>
          <button
            onClick={() => void handleLogoutAll()}
            disabled={sessionState !== "authenticated" || sessionActionLoading !== null}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {sessionActionLoading === "logout-all" ? `${t('common.loading')}` : t('settings.revokeAllSessions')}
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
  );
}

// ─── Dev auth toolset ────────────────────────────────────────────────────────
export function DevAuthToolset() {
  const { t } = useI18n();
  const {
    session,
    currentUser,
    setCurrentUser,
    registerForm,
    setRegisterForm,
    loginForm,
    setLoginForm,
    handleRegister,
    handleLogin,
    handleLoadSession,
    handleLogout,
  } = useSessionSettings();
  const { notifyError, notifyFeedback } = useSettingsNotifications();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<void>) {
    setLoadingAction(action);
    notifyError(null);
    notifyFeedback(null);
    try {
      await fn();
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('settings.accountSession')}</h2>
        <p className="text-sm text-slate-500">
          {t('settings.registerSignInValidate')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <h3 className="font-medium text-slate-900">{t('settings.register')}</h3>
          <input
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={registerForm.full_name}
            onChange={(event) =>
              setRegisterForm((current) => ({
                ...current,
                full_name: event.target.value,
              }))
            }
            placeholder={t('settings.fullName')}
          />
          <input
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={registerForm.email}
            onChange={(event) =>
              setRegisterForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            placeholder={t('settings.email')}
          />
          <input
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            type="password"
            value={registerForm.password}
            onChange={(event) =>
              setRegisterForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder={t('settings.password')}
          />
          <button
            onClick={() => void run("register", handleRegister)}
            disabled={loadingAction === "register"}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loadingAction === "register" ? `${t('common.loading')}` : t('settings.registerAccount')}
          </button>
        </div>

        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <h3 className="font-medium text-slate-900">{t('settings.login')}</h3>
          <input
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={loginForm.email}
            onChange={(event) =>
              setLoginForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            placeholder={t('settings.email')}
          />
          <input
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            type="password"
            value={loginForm.password}
            onChange={(event) =>
              setLoginForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder={t('settings.password')}
          />
          <button
            onClick={() => void run("login", handleLogin)}
            disabled={loadingAction === "login"}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loadingAction === "login" ? `${t('common.loading')}` : t('settings.signIn')}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => void run("session", handleLoadSession)}
              disabled={loadingAction === "session"}
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {t('settings.refreshSession')}
            </button>
            <button
              onClick={() => void run("logout", handleLogout)}
              disabled={loadingAction === "logout"}
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {t('settings.logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <h3 className="font-medium text-slate-900">{t('settings.currentUser')}</h3>
        {currentUser ? (
          <dl className="mt-3 grid gap-2 text-slate-600">
            <div className="flex justify-between gap-4">
              <dt>{t('settings.userId')}</dt>
              <dd className="font-medium text-slate-900">{currentUser.id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t('settings.email')}</dt>
              <dd className="font-medium text-slate-900">{currentUser.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t('settings.role')}</dt>
              <dd className="font-medium text-slate-900">{currentUser.role}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-slate-500">{t('settings.noActiveUser')}</p>
        )}
      </div>
    </section>
  );
}

// ─── Session status card (stats grid) ────────────────────────────────────────
export function SessionStatusCard() {
  const { t } = useI18n();
  const { currentUser } = useSessionSettings();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('settings.session')}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">
        {currentUser ? t('settings.authenticated') : t('settings.notSignedIn')}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {currentUser?.email ?? t('settings.loadCreateAccount')}
      </p>
    </div>
  );
}

// ─── Composed module ─────────────────────────────────────────────────────────
export default function SessionSettings() {
  return (
    <>
      <AccountProfile />
      <SessionControl />
      <DevAuthToolset />
    </>
  );
}
