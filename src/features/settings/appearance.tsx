"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Settings appearance module (Issue #615).
 *
 * Owns the theme preference (light / dark / system): localStorage persistence,
 * the `dark` class on <html>, and the matchMedia listener for system-preference
 * changes. Also hosts the onboarding-tour replay section — a UI-preference
 * concern with no data-fetching of its own, grouped here so the settings shell
 * stays a pure composition of feature modules.
 */
import { useEffect, useState } from "react";

// ─── Theme settings ──────────────────────────────────────────────────────────
export function AppearanceSettings() {
  const [theme, setTheme] = useState<string>("system");

  // Initialize theme from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      setTheme(storedTheme);
    }
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
    localStorage.setItem('theme', theme);

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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Appearance Settings</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Customize your visual theme preference.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <button
          onClick={() => setTheme("light")}
          className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all ${
            theme === "light"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <svg className="h-8 w-8 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-sm font-medium text-slate-900 dark:text-white">Light</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all ${
            theme === "dark"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <svg className="h-8 w-8 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span className="text-sm font-medium text-slate-900 dark:text-white">Dark</span>
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all ${
            theme === "system"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <svg className="h-8 w-8 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-slate-900 dark:text-white">System</span>
        </button>
      </div>
    </section>
  );
}

// ─── Onboarding tour replay (Issue #159) ─────────────────────────────────────
// Mirrors OnboardingTour's START_TOUR_EVENT.
export function OnboardingReplay() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Onboarding</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Replay the guided tour of the dashboard, outages, and payments.
      </p>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("apexchain:start-tour"))}
        className="mt-4 rounded-md border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Replay onboarding tour
      </button>
    </section>
  );
}

// ─── Composed module ─────────────────────────────────────────────────────────
export default function AppearanceSettingsModule() {
  return (
    <>
      <AppearanceSettings />
      <OnboardingReplay />
    </>
  );
}