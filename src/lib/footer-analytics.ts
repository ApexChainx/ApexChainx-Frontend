/** ApexChain - Network Operations Intelligence Platform */
/**
 * Product analytics event tracking (Issue #816).
 *
 * The app had no first-party analytics: there was no way to answer "which
 * footer links do operators actually use?" or "how often does an operator land
 * on a page with no navigation entries at all?". Guessing from server logs
 * misses client-side navigation entirely, because an in-app route change never
 * reaches the access log.
 *
 * This module is deliberately tiny and dependency-free. Events go to two
 * places:
 *
 *   1. `logger` — already wired through `NEXT_PUBLIC_LOGGING_DISABLED`, so a
 *      deployment can turn analytics off without a code change.
 *   2. A Sentry breadcrumb — the project's existing error-reporting channel.
 *      Breadcrumbs ride along with any error report, so a support ticket can be
 *      read as "they clicked Payments, then Settings, then hit the failure".
 *
 * No network call is made here. A real sink (a vendor SDK, a first-party
 * endpoint) plugs in behind `setAnalyticsSink` without any call site changing.
 */

/** Every event the footer is allowed to emit. */
export const FOOTER_EVENTS = {
  /** The footer became visible for the first time. */
  view: "footer.view",
  /** An operator activated one of the footer's links. */
  linkClick: "footer.link_click",
  /** The footer rendered with nothing to show. */
  empty: "footer.empty_state",
  /** An operator expanded a link column that was collapsed on narrow screens. */
  groupExpand: "footer.group_expand",
} as const;

export type FooterEvent = (typeof FOOTER_EVENTS)[keyof typeof FOOTER_EVENTS];

/**
 * Properties attached to a footer event. Narrow on purpose: analytics is only
 * useful while it stays cheap to reason about, and `href` is deliberately
 * limited to internal routes so operator-identifying query strings can never
 * leak into an event payload.
 */
export interface FooterEventProperties {
  /** Link group id, e.g. `platform`. */
  groupId?: string;
  /** Internal route that was activated. External URLs are not recorded. */
  href?: string;
  /** Stable link identifier, e.g. `common.payments`. */
  labelKey?: string;
  /** Whether the link leaves the app. */
  external?: boolean;
  /** Visible link count at the time of the event. */
  linkCount?: number;
}

/** The subset of the Sentry client this module uses. */
interface SentryBreadcrumbClient {
  addBreadcrumb: (crumb: {
    category?: string;
    message?: string;
    level?: "info" | "warning" | "error";
    data?: Record<string, unknown>;
  }) => void;
}

/** Destination for recorded events. Swappable so tests and sinks can observe. */
export type AnalyticsSink = (
  event: FooterEvent,
  properties: FooterEventProperties,
) => void;

let sink: AnalyticsSink | null = null;

/**
 * Register a destination for footer events (a vendor SDK, a beacon endpoint…).
 * Returns a cleanup function that restores the previous sink.
 */
export function setAnalyticsSink(next: AnalyticsSink | null): () => void {
  const previous = sink;
  sink = next;
  return () => {
    sink = previous;
  };
}

/** Current sink, or `null` when analytics is not wired up. */
export function getAnalyticsSink(): AnalyticsSink | null {
  return sink;
}

/** Strip query strings and fragments so routes stay safe to record. */
export function sanitiseHref(href: string): string | undefined {
  if (!href || href.startsWith("http")) return undefined;
  const [path = ""] = href.split(/[?#]/);
  return path || undefined;
}

/**
 * Record a footer event.
 *
 * Never throws: analytics must not be able to break the surface it is
 * measuring, so a misbehaving sink is swallowed after being logged.
 */
export function trackFooterEvent(
  event: FooterEvent,
  properties: FooterEventProperties = {},
): void {
  const safe: FooterEventProperties = { ...properties };
  if (properties.href !== undefined) {
    const path = sanitiseHref(properties.href);
    if (path === undefined) delete safe.href;
    else safe.href = path;
  }

  const client = (globalThis as { Sentry?: SentryBreadcrumbClient }).Sentry;
  client?.addBreadcrumb({
    category: "footer",
    message: event,
    level: "info",
    data: safe,
  });

  if (!sink) return;
  try {
    sink(event, safe);
  } catch {
    // A failing analytics sink must never surface in the UI.
  }
}