/** ApexChain Network Operations Intelligence Platform */
/**
 * Sample incident timeline fixtures (Issue #1018).
 *
 * Deterministic, side-effect-free incident timelines for timeline components
 * and tests. Every timestamp is a fixed literal (never `Date.now()`), so
 * snapshots and assertions stay stable across runs.
 *
 * Each entry pairs a human-readable name with events in chronological order,
 * ready to pass straight to `IncidentTimelinePanel` or to map over
 * `TimelineItem`:
 *
 * @example
 * import {
 *   resolvedCriticalIncident,
 *   getSampleTimelineById,
 * } from "@/features/sla-operations/fixtures/sampleTimelines";
 *
 * const timeline = getSampleTimelineById("sample_resolved_critical");
 * const events = timeline?.events ?? [];
 *
 * <IncidentTimelinePanel events={events} />
 */
import type { TimelineActor, TimelineEvent } from "../types/timeline";

/** A named collection of timeline events covering one incident state. */
export interface SampleTimeline {
  /** Stable identifier used by `getSampleTimelineById`. */
  id: string;
  /** Short description of the state this fixture represents. */
  name: string;
  /** Events in chronological order (oldest first). */
  events: TimelineEvent[];
}

const MONITOR: TimelineActor = {
  kind: "system",
  id: "actor_monitor",
  label: "ApexChain Monitor",
};

const ADAEZE: TimelineActor = {
  kind: "operator",
  id: "actor_op_adaeze",
  label: "Adaeze Okonkwo",
};

const MARCUS: TimelineActor = {
  kind: "operator",
  id: "actor_op_marcus",
  label: "Marcus Lindqvist",
};

const PARTNER_WEBHOOK: TimelineActor = {
  kind: "webhook",
  id: "actor_wh_northbridge",
  label: "Northbridge Fiber webhook",
};

const SLA_ENGINE: TimelineActor = {
  kind: "automation",
  id: "actor_sla_engine",
  label: "SLA settlement engine",
};

/**
 * Resolved critical incident — the happy path.
 * Spans every category and ends with a met SLA and a settled reward payment.
 */
export const resolvedCriticalIncident: SampleTimeline = {
  id: "sample_resolved_critical",
  name: "Resolved critical outage with a met SLA and settled reward",
  events: [
    {
      id: "evt_2841_detected",
      category: "outage",
      title: "Uplink loss detected on backbone segment LG-04",
      description:
        "Three consecutive heartbeat misses from the Ikeja aggregation node triggered an automatic outage record.",
      timestamp: "2026-11-14T02:14:00.000Z",
      actor: MONITOR,
      referenceId: "out_2841",
      label: "critical",
    },
    {
      id: "evt_2841_acknowledged",
      category: "outage",
      title: "Incident acknowledged by on-call operator",
      timestamp: "2026-11-14T02:21:00.000Z",
      actor: ADAEZE,
      referenceId: "out_2841",
    },
    {
      id: "evt_2841_escalated",
      category: "annotation",
      title: "Escalated to Northbridge Fiber for physical link repair",
      description:
        "Remote diagnostics pointed to a cut fiber pair requiring partner dispatch.",
      timestamp: "2026-11-14T02:48:00.000Z",
      actor: ADAEZE,
      referenceId: "out_2841",
    },
    {
      id: "evt_2841_sla_met",
      category: "sla",
      title: "SLA evaluated: met",
      description:
        "MTTR 98 min against a 120-min threshold — a reward applies.",
      timestamp: "2026-11-14T03:52:00.000Z",
      actor: SLA_ENGINE,
      referenceId: "sla_2841",
      label: "reward",
    },
    {
      id: "evt_2841_payment_settled",
      category: "payment",
      title: "Reward payment settled on-chain",
      timestamp: "2026-11-14T03:54:00.000Z",
      actor: SLA_ENGINE,
      referenceId: "pay_2841",
      label: "settled",
    },
    {
      id: "evt_2841_root_cause",
      category: "system",
      title: "Root cause recorded: rodent damage to buried fiber",
      timestamp: "2026-11-14T04:05:00.000Z",
      actor: ADAEZE,
      referenceId: "out_2841",
    },
  ],
};

/**
 * Active incident with escalation in flight — warning state.
 * The timeline ends mid-incident: no SLA evaluation or settlement yet, and a
 * partner webhook delivery failed.
 */
export const activeEscalationIncident: SampleTimeline = {
  id: "sample_active_escalation",
  name: "Active high-severity outage with a failed partner webhook",
  events: [
    {
      id: "evt_2842_detected",
      category: "outage",
      title: "Packet loss above 8% sustained for five minutes",
      timestamp: "2026-11-15T09:05:00.000Z",
      actor: MONITOR,
      referenceId: "out_2842",
      label: "high",
    },
    {
      id: "evt_2842_acknowledged",
      category: "outage",
      title: "Incident acknowledged; packet capture started",
      timestamp: "2026-11-15T09:12:00.000Z",
      actor: MARCUS,
      referenceId: "out_2842",
    },
    {
      id: "evt_2842_escalated",
      category: "annotation",
      title: "Escalated to network engineering for upstream carrier review",
      timestamp: "2026-11-15T09:44:00.000Z",
      actor: MARCUS,
      referenceId: "out_2842",
    },
    {
      id: "evt_2842_webhook_failed",
      category: "webhook",
      title: "Partner notification failed after 3 retries",
      description:
        "Northbridge Fiber returned HTTP 503; delivery is queued for a later retry.",
      timestamp: "2026-11-15T09:45:00.000Z",
      actor: PARTNER_WEBHOOK,
      referenceId: "wh_2842",
      label: "failed",
    },
    {
      id: "evt_2842_mitigating",
      category: "outage",
      title: "Draining traffic from the affected carrier path",
      description: "Carrier confirms degradation on their Nairobi–Mombasa span.",
      timestamp: "2026-11-15T10:20:00.000Z",
      actor: MARCUS,
      referenceId: "out_2842",
      label: "mitigating",
    },
  ],
};

/**
 * Webhook and settlement retry activity — error/edge state.
 * Useful for exercising webhook and payment event rendering without an outage.
 */
export const webhookRetryActivity: SampleTimeline = {
  id: "sample_webhook_retries",
  name: "Webhook delivery retries followed by a successful settlement retry",
  events: [
    {
      id: "evt_wh_771_attempt_1",
      category: "webhook",
      title: "Delivery attempt 1 failed: connection timeout",
      timestamp: "2026-11-16T11:02:00.000Z",
      actor: PARTNER_WEBHOOK,
      referenceId: "wh_771",
      label: "failed",
    },
    {
      id: "evt_wh_771_attempt_2",
      category: "webhook",
      title: "Delivery attempt 2 failed: HTTP 502",
      timestamp: "2026-11-16T11:07:00.000Z",
      actor: PARTNER_WEBHOOK,
      referenceId: "wh_771",
      label: "failed",
    },
    {
      id: "evt_pay_771_retry",
      category: "payment",
      title: "Penalty settlement retried",
      description: "Previous attempt failed validation; retry accepted by the backend.",
      timestamp: "2026-11-16T11:12:00.000Z",
      actor: SLA_ENGINE,
      referenceId: "pay_771",
      label: "retrying",
    },
    {
      id: "evt_pay_771_settled",
      category: "payment",
      title: "Penalty settled after retry",
      timestamp: "2026-11-16T11:15:00.000Z",
      actor: SLA_ENGINE,
      referenceId: "pay_771",
      label: "settled",
    },
  ],
};

/**
 * Incident with no recorded events — empty-state fixture.
 * Lets components assert their "no events recorded" prompt.
 */
export const emptyTimeline: SampleTimeline = {
  id: "sample_empty",
  name: "Incident with no recorded events",
  events: [],
};

/** All fixtures, in the order timeline galleries usually display them. */
export const SAMPLE_TIMELINES: readonly SampleTimeline[] = [
  resolvedCriticalIncident,
  activeEscalationIncident,
  webhookRetryActivity,
  emptyTimeline,
];

/**
 * Look up a sample timeline by its fixture id.
 *
 * @returns The matching fixture, or `undefined` when the id is unknown.
 */
export function getSampleTimelineById(id: string): SampleTimeline | undefined {
  return SAMPLE_TIMELINES.find((timeline) => timeline.id === id);
}
