"use client";
/** ApexChain — first-time operator onboarding tour controller.
 *
 * Renders nothing. Drives driver.js one step at a time across routes
 * (dashboard → outages → payments), auto-starting on first authenticated
 * visit and persisting a "done" flag (server-synced via lib/preferences) once
 * the operator finishes or skips. Replayable via the `apexchain:start-tour`
 * window event (see Settings).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Config, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

import { useI18n } from "@/i18n/i18n";
import { useSession } from "@/hooks/useSession";
import {
  getPreferences,
  hydratePreferences,
  subscribeToPreferences,
  updatePreferences,
} from "@/lib/preferences";
import { TOUR_STEPS } from "@/lib/onboarding/steps";

/** Custom event other parts of the app dispatch to (re)start the tour. */
export const START_TOUR_EVENT = "apexchain:start-tour";

export default function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useSession();
  const { t, locale } = useI18n();

  const [hydrated, setHydrated] = useState(false);
  const [done, setDone] = useState<boolean>(() => Boolean(getPreferences().onboardingTourDone));

  // Refs so the driver.js callbacks always read fresh values without rebuilding.
  const driverRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);
  // Set before an intentional teardown (restart/locale change) so onDestroyed
  // doesn't mistake it for the operator finishing or skipping the tour.
  const restartingRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  const tRef = useRef(t);
  useEffect(() => {
    pathnameRef.current = pathname;
    routerRef.current = router;
    tRef.current = t;
  }, [pathname, router, t]);

  /** Use the localized string when it resolves, otherwise the inline English copy. */
  const resolveCopy = useCallback((key: string, fallback: string) => {
    const value = tRef.current(key);
    return value === key ? fallback : value;
  }, []);

  /** Idempotent: persist the opt-out so the tour never auto-shows again. */
  const markDone = useCallback(() => {
    setDone(true);
    if (!getPreferences().onboardingTourDone) {
      void updatePreferences({ onboardingTourDone: true });
    }
  }, []);

  const start = useCallback(() => {
    if (startedRef.current) return;
    if (typeof window === "undefined") return;
    startedRef.current = true;

    // Ensure we're on the first step's route before highlighting.
    if (pathnameRef.current !== TOUR_STEPS[0].route) {
      routerRef.current.push(TOUR_STEPS[0].route);
    }

    const steps = TOUR_STEPS.map((step) => ({
      element: step.selector,
      popover: {
        title: resolveCopy(`onboarding.steps.${step.id}.title`, step.title),
        description: resolveCopy(`onboarding.steps.${step.id}.body`, step.body),
        side: step.side,
        align: step.align,
      },
    }));

    const config: Config = {
      steps,
      showProgress: true,
      // driver.js waits for lazily-rendered targets (dashboard is ssr:false,
      // outages is Suspense-wrapped) instead of highlighting an empty region.
      waitForElement: 6000,
      skipMissingElement: true,
      allowClose: true,
      overlayClickBehavior: "close",
      stagePadding: 6,
      stageRadius: 12,
      popoverClass: "apex-tour",
      nextBtnText: resolveCopy("onboarding.buttons.next", "Next"),
      prevBtnText: resolveCopy("onboarding.buttons.back", "Back"),
      doneBtnText: resolveCopy("onboarding.buttons.done", "Done"),
      progressText: resolveCopy("onboarding.buttons.progress", "{{current}} of {{total}}"),
      // Route-aware navigation: move to the next step's page before advancing.
      onNextClick: () => {
        const d = driverRef.current;
        if (!d) return;
        const index = d.getActiveIndex() ?? 0;
        const nextStep = TOUR_STEPS[index + 1];
        if (!nextStep) {
          d.destroy(); // last step → finish
          return;
        }
        if (nextStep.route !== TOUR_STEPS[index].route) {
          routerRef.current.push(nextStep.route);
        }
        d.moveNext();
      },
      onPrevClick: () => {
        const d = driverRef.current;
        if (!d) return;
        const index = d.getActiveIndex() ?? 0;
        const prevStep = TOUR_STEPS[index - 1];
        if (!prevStep) return;
        if (prevStep.route !== TOUR_STEPS[index].route) {
          routerRef.current.push(prevStep.route);
        }
        d.movePrevious();
      },
      // Inject an explicit "Skip tour" control alongside the built-in close (X).
      onPopoverRender: (popover) => {
        if (popover.footer.querySelector("[data-tour-skip]")) return;
        const skip = document.createElement("button");
        skip.type = "button";
        skip.dataset.tourSkip = "true";
        skip.className = "apex-tour__skip";
        skip.textContent = resolveCopy("onboarding.buttons.skip", "Skip tour");
        skip.addEventListener("click", () => driverRef.current?.destroy());
        popover.footer.insertBefore(skip, popover.footer.firstChild);
      },
      // Catch-all: fires however the tour ends (Done, Skip, X, Esc, overlay).
      onDestroyed: () => {
        driverRef.current = null;
        startedRef.current = false;
        if (restartingRef.current) {
          restartingRef.current = false;
          return; // intentional teardown — not a finish/skip
        }
        markDone();
      },
    };

    const instance = driver(config);
    driverRef.current = instance;
    instance.drive(0);
  }, [markDone, resolveCopy]);

  // Hydrate the persisted flag (server wins) and stay in sync with other tabs/views.
  useEffect(() => {
    let active = true;
    void hydratePreferences().then((prefs) => {
      if (!active) return;
      setDone(Boolean(prefs.onboardingTourDone));
      setHydrated(true);
    });
    const unsubscribe = subscribeToPreferences((prefs) => {
      setDone(Boolean(prefs.onboardingTourDone));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Auto-start once, for authenticated first-time operators.
  useEffect(() => {
    if (hydrated && state === "authenticated" && !done) {
      start();
    }
  }, [hydrated, state, done, start]);

  // Manual restart (e.g. Settings → "Replay tour"), ignoring the persisted flag.
  useEffect(() => {
    const handler = () => {
      if (driverRef.current) {
        restartingRef.current = true;
        driverRef.current.destroy();
      }
      startedRef.current = false;
      start();
    };
    window.addEventListener(START_TOUR_EVENT, handler);
    return () => window.removeEventListener(START_TOUR_EVENT, handler);
  }, [start]);

  // Rebuild copy if the locale changes mid-session while the tour is open.
  useEffect(() => {
    if (driverRef.current?.isActive()) {
      restartingRef.current = true;
      driverRef.current.destroy();
      startedRef.current = false;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      restartingRef.current = true;
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  return null;
}
