/** Small, privacy-safe analytics surface for sidebar interactions. */
export const SIDEBAR_EVENTS = {
  view: "sidebar.view",
  linkClick: "sidebar.link_click",
  groupToggle: "sidebar.group_toggle",
  empty: "sidebar.empty_state",
} as const;

export type SidebarEvent = (typeof SIDEBAR_EVENTS)[keyof typeof SIDEBAR_EVENTS];
export interface SidebarEventProperties {
  href?: string;
  groupId?: string;
  linkCount?: number;
  expanded?: boolean;
}

type Sink = (event: SidebarEvent, properties: SidebarEventProperties) => void;
let sink: Sink | null = null;

export function setSidebarAnalyticsSink(next: Sink | null): () => void {
  const previous = sink;
  sink = next;
  return () => { sink = previous; };
}

/** Query strings and fragments can contain identifiers; never record them. */
export function trackSidebarEvent(
  event: SidebarEvent,
  properties: SidebarEventProperties = {},
): void {
  const safe = { ...properties };
  if (safe.href) {
    if (/^https?:\/\//i.test(safe.href)) delete safe.href;
    else {
      const path = safe.href.split(/[?#]/, 1)[0];
      if (path) safe.href = path;
      else delete safe.href;
    }
  }
  try {
    (globalThis as { Sentry?: { addBreadcrumb?: (crumb: Record<string, unknown>) => void } })
      .Sentry?.addBreadcrumb?.({ category: "sidebar", message: event, level: "info", data: safe });
    sink?.(event, safe);
  } catch {
    // Analytics is best-effort and must not affect navigation.
  }
}
