"use client";

import { useMemo, useState } from "react";

import { api } from "@/lib/api";

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

  async function handleRegister() {
    setLoadingAction("register");
    setError(null);
    setFeedback(null);

    try {
      const response = await api.post<AuthUser>("/auth/register", registerForm);
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
      const response = await api.post<AuthSessionResponse>("/auth/login", loginForm);
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
      const response = await api.get<AuthUser>("/auth/me", {
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
        "/auth/logout",
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
      const response = await api.post<Wallet>("/wallets/create", {
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
      const response = await api.post<Wallet>("/wallets/link", {
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
        api.get<Wallet>(`/wallets/${activeUserId}`),
        api.get<WalletStatus>(`/wallets/${activeUserId}/status`),
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

  async function handleLoadBalance() {
    const address = wallet?.public_key ?? walletForm.public_key.trim();
    if (!address) {
      setError("Load or link a wallet before requesting balances.");
      return;
    }

    setLoadingAction("wallet-balance");
    setError(null);
    setFeedback(null);

    try {
      const response = await api.get<WalletBalance>(`/wallets/${address}/balance`);
      setWalletBalance(response.data);
      setFeedback("Wallet balance loaded.");
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Settings and Wallet Control
        </h1>
        <p className="text-sm text-slate-500">
          Manage operator session state, register or sign in, and check wallet readiness from the live backend.
        </p>
      </div>

      {feedback ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Account Session</h2>
            <p className="text-sm text-slate-500">
              Register, sign in, and validate the active backend session.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <h3 className="font-medium text-slate-900">Register</h3>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={registerForm.full_name}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    full_name: event.target.value,
                  }))
                }
                placeholder="Full name"
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
                placeholder="Email"
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
                placeholder="Password"
              />
              <button
                onClick={handleRegister}
                disabled={loadingAction === "register"}
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loadingAction === "register" ? "Registering..." : "Register account"}
              </button>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <h3 className="font-medium text-slate-900">Login</h3>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="Email"
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
                placeholder="Password"
              />
              <button
                onClick={handleLogin}
                disabled={loadingAction === "login"}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loadingAction === "login" ? "Signing in..." : "Sign in"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleLoadSession}
                  disabled={loadingAction === "session"}
                  className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Refresh session
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loadingAction === "logout"}
                  className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <h3 className="font-medium text-slate-900">Current user</h3>
            {currentUser ? (
              <dl className="mt-3 grid gap-2 text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt>User ID</dt>
                  <dd className="font-medium text-slate-900">{currentUser.id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Email</dt>
                  <dd className="font-medium text-slate-900">{currentUser.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Role</dt>
                  <dd className="font-medium text-slate-900">{currentUser.role}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-slate-500">No active user loaded yet.</p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Wallet Status</h2>
            <p className="text-sm text-slate-500">
              Create, link, and inspect the operator wallet through the backend bridge.
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
              disabled={loadingAction === "create-wallet"}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loadingAction === "create-wallet" ? "Creating..." : "Create wallet"}
            </button>
            <button
              onClick={handleLinkWallet}
              disabled={loadingAction === "link-wallet"}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingAction === "link-wallet" ? "Linking..." : "Link wallet"}
            </button>
            <button
              onClick={handleLoadWalletDetails}
              disabled={loadingAction === "wallet-details"}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingAction === "wallet-details" ? "Loading..." : "Load wallet details"}
            </button>
            <button
              onClick={handleLoadBalance}
              disabled={loadingAction === "wallet-balance"}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
                      {wallet.public_key}
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
                {Object.entries(walletBalance.balances).map(([asset, balance]) => (
                  <div
                    key={asset}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="font-medium text-slate-900">{asset}</span>
                    <span className="text-slate-600">{balance.balance}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-slate-500">No balance data loaded yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
