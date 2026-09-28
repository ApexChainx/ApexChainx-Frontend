"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Settings page notifications (Issue #615).
 *
 * The settings shell composes several feature modules. The feedback and error
 * banners are page-level (the shell renders them at fixed positions), so the
 * banner state lives here and whichever module triggered an action reports to
 * it through context — session, wallet, or otherwise.
 */
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

interface SettingsNotificationsContextValue {
  feedback: string | null;
  error: string | null;
  notifyFeedback: (message: string | null) => void;
  notifyError: (message: string | null) => void;
}

const SettingsNotificationsContext =
  createContext<SettingsNotificationsContextValue | null>(null);

export function useSettingsNotifications(): SettingsNotificationsContextValue {
  const ctx = useContext(SettingsNotificationsContext);
  if (!ctx) {
    throw new Error(
      "useSettingsNotifications must be used within SettingsNotificationsProvider",
    );
  }
  return ctx;
}

export function SettingsNotificationsProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notifyFeedback = useCallback(
    (message: string | null) => setFeedback(message),
    [],
  );
  const notifyError = useCallback((message: string | null) => setError(message), []);

  return (
    <SettingsNotificationsContext.Provider
      value={{ feedback, error, notifyFeedback, notifyError }}
    >
      {children}
    </SettingsNotificationsContext.Provider>
  );
}

/** Page-level feedback banner (rendered at the top of the settings shell). */
export function SettingsFeedbackBanner() {
  const { feedback } = useSettingsNotifications();
  if (!feedback) return null;
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {feedback}
    </div>
  );
}

/** Page-level error banner (rendered after the account-profile section). */
export function SettingsErrorBanner() {
  const { error } = useSettingsNotifications();
  if (!error) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </div>
  );
}
