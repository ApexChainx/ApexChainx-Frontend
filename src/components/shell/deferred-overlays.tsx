"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Issue #633 — route-level code splitting for the shared app shell.
 *
 * `app/layout.tsx` imported the command palette and the onboarding tour at
 * module scope, so *every* route's client bundle carried them — including
 * `/payments` and `/config`, which are the heaviest and least-visited screens
 * and never render the tour at all. That is what made visiting `/payments`
 * pull down the whole application graph (tour + palette) before it could show
 * anything.
 *
 * Both are interactive overlays that contribute nothing to first paint, so they
 * are loaded on demand in their own chunks instead. Everything the shared shell
 * actually needs on every route (navigation, providers, the offline banner)
 * stays eager.
 *
 * `ssr: false` is deliberate: the overlays are pure client-side interactions,
 * and Next requires `ssr: false` to be declared from a Client Component (this
 * module) rather than the Server Component layout.
 */
import dynamic from "next/dynamic";

export const DeferredCommandPalette = dynamic(
  () => import("@/components/CommandPalette"),
  { ssr: false },
);

export const DeferredOnboardingTour = dynamic(
  () => import("@/components/onboarding/OnboardingTour"),
  { ssr: false },
);
