/** ApexChain Network Operations Intelligence Platform */
/**
 * Typed sorting utilities (Issue #926).
 *
 * Comparators for outage, payment and webhook operation datasets. Nullish
 * values sort last, and every comparator is pure so it can be passed directly
 * to `Array.prototype.sort` (via the `sortBy` helper, which does not mutate).
 */

/** Comparator conforming to the `Array.prototype.sort` contract. */
export type Comparator<T> = (a: T, b: T) => number;

/** Direction in which a sorted result should be ordered. */
export type SortDirection = "asc" | "desc";

function compareNullable<T>(
  a: T | null | undefined,
  b: T | null | undefined,
  compare: (left: T, right: T) => number,
): number {
  if (a === b) {
    return 0;
  }
  if (a === null || a === undefined) {
    return 1;
  }
  if (b === null || b === undefined) {
    return -1;
  }
  return compare(a, b);
}

/** Compare two strings using locale-aware ordering; nullish values last. */
export function compareStrings(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return compareNullable(a, b, (left, right) => left.localeCompare(right));
}

/** Compare two numbers; nullish values last. */
export function compareNumbers(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  return compareNullable(a, b, (left, right) => left - right);
}

/** Compare two ISO timestamp strings chronologically; nullish values last. */
export function compareDates(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return compareNullable(a, b, (left, right) => {
    const leftTime = new Date(left).getTime();
    const rightTime = new Date(right).getTime();
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return 0;
    }
    return leftTime - rightTime;
  });
}

/** Compare two booleans (false before true); nullish values last. */
export function compareBooleans(
  a: boolean | null | undefined,
  b: boolean | null | undefined,
): number {
  return compareNullable(a, b, (left, right) => Number(left) - Number(right));
}

/** Build a string comparator from an item selector. */
export function byString<T>(
  selector: (item: T) => string | null | undefined,
  direction: SortDirection = "asc",
): Comparator<T> {
  const factor = direction === "desc" ? -1 : 1;
  return (a, b) => factor * compareStrings(selector(a), selector(b));
}

/** Build a numeric comparator from an item selector. */
export function byNumber<T>(
  selector: (item: T) => number | null | undefined,
  direction: SortDirection = "asc",
): Comparator<T> {
  const factor = direction === "desc" ? -1 : 1;
  return (a, b) => factor * compareNumbers(selector(a), selector(b));
}

/** Build a date comparator from an item selector. */
export function byDate<T>(
  selector: (item: T) => string | null | undefined,
  direction: SortDirection = "asc",
): Comparator<T> {
  const factor = direction === "desc" ? -1 : 1;
  return (a, b) => factor * compareDates(selector(a), selector(b));
}

/** Combine comparators into a stable tie-breaking chain. */
export function combineComparators<T>(
  ...comparators: Comparator<T>[]
): Comparator<T> {
  return (a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  };
}

/** Return a sorted copy of the dataset; the input is never mutated. */
export function sortBy<T>(
  items: readonly T[],
  comparator: Comparator<T>,
  direction: SortDirection = "asc",
): T[] {
  const factor = direction === "desc" ? -1 : 1;
  return [...items].sort((a, b) => factor * comparator(a, b));
}

/** Minimal shape of an outage row required for sorting. */
export interface SortableOutage {
  detected_at?: string | null;
  site_name?: string | null;
  mttr_minutes?: number | null;
}

/** Minimal shape of a payment row required for sorting. */
export interface SortablePayment {
  created_at?: string | null;
  amount?: number | null;
}

/** Minimal shape of a webhook delivery row required for sorting. */
export interface SortableWebhookDelivery {
  attempted_at?: string | null;
  duration_ms?: number | null;
  status?: string | null;
}

export const compareOutagesByDetectedAt = byDate<SortableOutage>(
  (outage) => outage.detected_at,
);
export const compareOutagesBySite = byString<SortableOutage>(
  (outage) => outage.site_name,
);
export const compareOutagesByMttr = byNumber<SortableOutage>(
  (outage) => outage.mttr_minutes,
);

export const comparePaymentsByCreatedAt = byDate<SortablePayment>(
  (payment) => payment.created_at,
);
export const comparePaymentsByAmount = byNumber<SortablePayment>(
  (payment) => payment.amount,
);

export const compareWebhooksByAttemptedAt = byDate<SortableWebhookDelivery>(
  (delivery) => delivery.attempted_at,
);
export const compareWebhooksByDuration = byNumber<SortableWebhookDelivery>(
  (delivery) => delivery.duration_ms,
);
export const compareWebhooksByStatus = byString<SortableWebhookDelivery>(
  (delivery) => delivery.status,
);
