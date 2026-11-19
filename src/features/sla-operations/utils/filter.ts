/** ApexChain Network Operations Intelligence Platform */
/**
 * Composable filtering helpers (Issue #927).
 *
 * Pure predicates that can be combined and applied to SLA operations
 * collections. Nullish collections yield an empty array; the input is never
 * mutated.
 */

/** Predicate used to decide whether an item stays in a result set. */
export type Predicate<T> = (item: T) => boolean;

/** Combine predicates so an item must satisfy all of them (empty = accept all). */
export function allOf<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (item) => predicates.every((predicate) => predicate(item));
}

/** Combine predicates so an item must satisfy at least one (empty = accept none). */
export function anyOf<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (item) => predicates.some((predicate) => predicate(item));
}

/** Negate a predicate. */
export function not<T>(predicate: Predicate<T>): Predicate<T> {
  return (item) => !predicate(item);
}

/** Case-insensitive substring match on selected fields. A blank query matches everything. */
export function matchesText<T>(
  query: string | null | undefined,
  getFields: (item: T) => ReadonlyArray<string | null | undefined>,
): Predicate<T> {
  const needle = (query ?? "").trim().toLowerCase();
  return (item) =>
    needle === "" ||
    getFields(item).some(
      (field) => typeof field === "string" && field.toLowerCase().includes(needle),
    );
}

/** Match items whose value is in `allowed`. An empty or nullish list matches everything. */
export function matchesAny<T, V>(
  allowed: ReadonlyArray<V> | null | undefined,
  getValue: (item: T) => V,
): Predicate<T> {
  return (item) => !allowed || allowed.length === 0 || allowed.includes(getValue(item));
}

/** Inclusive numeric range check. Missing bounds are open; non-finite values never match a bound. */
export function inRange<T>(
  min: number | null | undefined,
  max: number | null | undefined,
  getValue: (item: T) => number | null | undefined,
): Predicate<T> {
  return (item) => {
    const value = getValue(item);
    const hasMin = typeof min === "number";
    const hasMax = typeof max === "number";
    if (!hasMin && !hasMax) {
      return true;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return false;
    }
    return (!hasMin || value >= min) && (!hasMax || value <= max);
  };
}

/** Apply a predicate to a collection without mutating it. */
export function applyFilter<T>(
  items: ReadonlyArray<T> | null | undefined,
  predicate: Predicate<T>,
): T[] {
  return items ? items.filter(predicate) : [];
}
