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

import {
  SettingsErrorBanner,
  SettingsFeedbackBanner,
  SettingsNotificationsProvider,
} from "@/features/settings/notifications";
import {
  AccountProfile,
  DevAuthToolset,
  SessionControl,
  SessionSettingsProvider,
  SessionStatusCard,
} from "@/features/settings/session";
import {
  WalletBalancesCard,
  WalletReadinessCard,
  WalletReadinessGuidance,
  WalletSettingsProvider,
  WalletStatusCard,
  WalletStatusPanel,
} from "@/features/settings/wallet";
import { AppearanceSettings, OnboardingReplay } from "@/features/settings/appearance";
import LanguageSettings from "@/features/settings/language";
import {
  SLAContractIdCard,
  StellarHealthCard,
  StellarHealthProvider,
} from "@/features/settings/stellar";

/**
 * Issue #620 — translate known faucet rate-limit responses (HTTP 429, or a
 * friendbot error body that reports rate limiting) into an actionable
 * message; anything else falls back to the generic error text.
 */
function getFundingErrorMessage(
  issue: unknown,
  t: (key: string) => string,
): string {
  const response = (issue as { response?: { status?: number; data?: unknown } }).response;
  if (response?.status === 429) {
    return t('settings.friendbotRateLimited');
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
          </WalletSettingsProvider>
        </StellarHealthProvider>
      </SessionSettingsProvider>
    </SettingsNotificationsProvider>
  );
}