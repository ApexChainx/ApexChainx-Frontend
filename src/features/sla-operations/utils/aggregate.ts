/** ApexChain Network Operations Intelligence Platform */
/**
 * Aggregation utilities (Issue #960).
 *
 * Pure helpers for counts, totals, averages and grouped summaries over
 * operations datasets (outages, payments, webhook events). Numeric helpers
 * ignore nullish and non-finite values instead of propagating `NaN`, and
 * report `null` when there is nothing to aggregate so callers can render an
 * explicit placeholder. Grouping preserves first-seen order, which keeps
 * charts and tables stable between renders.
 */

/** A value that may be missing or unusable. */
export type MaybeNumber = number | null | undefined;

/** Label used for items whose group key is missing or blank. */
export const UNKNOWN_GROUP_KEY = "unknown";

/** Number of items that share a group key. */
export interface GroupCount {
  key: string;
  count: number;
}

/** Items that share a group key. */
export interface Group<T> {
  key: string;
  items: T[];
}

/** Numeric summary of one group. */
export interface GroupSummary {
  key: string;
  /** Items in the group, whether or not they have a usable value. */
  count: number;
  /** Items with a finite value. */
  valueCount: number;
  sum: number;
  /** `null` when no item had a usable value. */
  average: number | null;
  min: number | null;
  max: number | null;
}

/** Keep only finite numbers. */
function finiteValues(values: readonly MaybeNumber[]): number[] {
  return values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
}

/** Resolve a group key, mapping nullish and blank keys to `UNKNOWN_GROUP_KEY`. */
function resolveKey(key: string | null | undefined): string {
  if (key === null || key === undefined) {
    return UNKNOWN_GROUP_KEY;
  }
  const trimmed = String(key).trim();
  return trimmed === "" ? UNKNOWN_GROUP_KEY : trimmed;
}

/** Sum of the usable values; `0` when there are none. */
export function sum(values: readonly MaybeNumber[]): number {
  return finiteValues(values).reduce((total, value) => total + value, 0);
}

/** Arithmetic mean of the usable values, or `null` when there are none. */
export function average(values: readonly MaybeNumber[]): number | null {
  const usable = finiteValues(values);
  return usable.length === 0 ? null : sum(usable) / usable.length;
}

/** Smallest usable value, or `null` when there are none. */
export function minOf(values: readonly MaybeNumber[]): number | null {
  const usable = finiteValues(values);
  return usable.length === 0 ? null : Math.min(...usable);
}

/** Largest usable value, or `null` when there are none. */
export function maxOf(values: readonly MaybeNumber[]): number | null {
  const usable = finiteValues(values);
  return usable.length === 0 ? null : Math.max(...usable);
}

/** Median of the usable values (mean of the middle two for an even count), or `null`. */
export function median(values: readonly MaybeNumber[]): number | null {
  const sorted = finiteValues(values).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return null;
  }
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] as number;
  return sorted.length % 2 === 1
    ? upper
    : ((sorted[middle - 1] as number) + upper) / 2;
}

/** Group items by a key function, in first-seen order. */
export function groupBy<T>(
  items: readonly T[],
  getKey: (item: T) => string | null | undefined,
): Group<T>[] {
  const groups = new Map<string, Group<T>>();
  for (const item of items) {
    const key = resolveKey(getKey(item));
    const group = groups.get(key);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(key, { key, items: [item] });
    }
  }
  return [...groups.values()];
}

/** Count items per group key, in first-seen order. */
export function countBy<T>(
  items: readonly T[],
  getKey: (item: T) => string | null | undefined,
): GroupCount[] {
  return groupBy(items, getKey).map(({ key, items: members }) => ({
    key,
    count: members.length,
  }));
}

/** Count, sum, average, min and max of a numeric field per group. */
export function summarizeBy<T>(
  items: readonly T[],
  getKey: (item: T) => string | null | undefined,
  getValue: (item: T) => MaybeNumber,
): GroupSummary[] {
  return groupBy(items, getKey).map(({ key, items: members }) => {
    const values = finiteValues(members.map(getValue));
    return {
      key,
      count: members.length,
      valueCount: values.length,
      sum: sum(values),
      average: average(values),
      min: minOf(values),
      max: maxOf(values),
    };
  });
}

/**
 * The `limit` largest groups by `count`, ties keeping first-seen order.
 * A non-positive or non-finite limit returns an empty list.
 */
export function topGroups(
  groups: readonly GroupCount[],
  limit: number,
): GroupCount[] {
  if (!Number.isFinite(limit) || limit <= 0) {
    return [];
  }
  return groups
    .map((group, index) => ({ group, index }))
    .sort((a, b) => b.group.count - a.group.count || a.index - b.index)
    .slice(0, Math.floor(limit))
    .map(({ group }) => group);
}
