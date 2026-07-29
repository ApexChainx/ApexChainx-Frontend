/** ApexChain — first-time operator onboarding tour: step definitions.
 *
 * Each step targets a stable `data-tour="…"` attribute (not a class name) so
 * the tour survives styling refactors. Steps carry inline English copy that is
 * used verbatim unless a matching i18n key resolves — see `resolveCopy` in the
 * OnboardingTour controller. i18n keys follow `onboarding.steps.<id>.{title,body}`.
 */

export type TourSide = "top" | "right" | "bottom" | "left";
export type TourAlign = "start" | "center" | "end";

export interface TourStep {
  /** Stable id; also the i18n sub-key (`onboarding.steps.<id>.…`). */
  id: string;
  /** Route this step lives on — the controller navigates here before highlighting. */
  route: string;
  /** CSS selector for the highlight target. */
  selector: string;
  /** Preferred popover placement relative to the target. */
  side: TourSide;
  align?: TourAlign;
  /** English fallback copy (used unless the i18n key resolves). */
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboardKpis",
    route: "/",
    selector: '[data-tour="dashboard-kpis"]',
    side: "bottom",
    align: "start",
    title: "Your SLA health at a glance",
    body: "Compliance, penalties, rewards, and net balance update live from the backend. This is your starting point every shift.",
  },
  {
    id: "dashboardFilters",
    route: "/",
    selector: '[data-tour="dashboard-filters"]',
    side: "bottom",
    align: "start",
    title: "Slice the metrics",
    body: "Narrow every chart and KPI by date range, severity, or site to focus on what matters right now.",
  },
  {
    id: "outagesSearch",
    route: "/outages",
    selector: '[data-tour="outages-search"]',
    side: "bottom",
    align: "start",
    title: "Find an incident",
    body: "Search and sort the outage list to locate the incident you need to act on.",
  },
  {
    id: "outagesList",
    route: "/outages",
    selector: '[data-tour="outages-list"]',
    side: "top",
    align: "center",
    title: "Resolve and dispute outages",
    body: "Select outages to resolve them in bulk, or open one to record a resolution or dispute an SLA breach — the two most common operator actions.",
  },
  {
    id: "paymentsFilters",
    route: "/payments",
    selector: '[data-tour="payments-filters"]',
    side: "bottom",
    align: "start",
    title: "Filter payouts",
    body: "Filter reward and penalty payments by status, type, or date to reconcile activity.",
  },
  {
    id: "paymentsTable",
    route: "/payments",
    selector: '[data-tour="payments-table"]',
    side: "top",
    align: "center",
    title: "Payment history",
    body: "Every automated blockchain payout lands here. Click any row to inspect its full detail. That's the tour — you're ready to go!",
  },
];
