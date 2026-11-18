/** ApexChain Network Operations Intelligence Platform */
/**
 * Query state serialization utilities (Issue #924).
 *
 * Pure helpers for converting filter/view state to and from URL query
 * strings. List values are comma-separated and all numeric/boolean values are
 * validated on parse, so malformed query strings produce safe defaults.
 */

/** Direction of the active sort. */
export type QuerySortDirection = "asc" | "desc";

/** Filter and view state that can be represented in a URL. */
export interface QueryState {
  search?: string | undefined;
  statuses: string[];
  severities: string[];
  from?: string | undefined;
  to?: string | undefined;
  sortField?: string | undefined;
  sortDir?: QuerySortDirection | undefined;
  page?: number | undefined;
}

/** Canonical empty query state. */
export const EMPTY_QUERY_STATE: QueryState = {
  statuses: [],
  severities: [],
};

function parseList(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Parse a query string, `URLSearchParams` or nullish value into query state. */
export function parseQueryState(
  input: string | URLSearchParams | null | undefined,
): QueryState {
  const params =
    typeof input === "string"
      ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
      : input instanceof URLSearchParams
        ? input
        : new URLSearchParams();

  const pageRaw = params.get("page");
  const parsedPage = pageRaw === null ? Number.NaN : Number(pageRaw);
  const sortDir = params.get("sortDir");

  return {
    search: params.get("search") ?? undefined,
    statuses: parseList(params.get("statuses")),
    severities: parseList(params.get("severities")),
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    sortField: params.get("sortField") ?? undefined,
    sortDir: sortDir === "asc" || sortDir === "desc" ? sortDir : undefined,
    page:
      Number.isFinite(parsedPage) && parsedPage >= 1
        ? Math.floor(parsedPage)
        : undefined,
  };
}

/** Serialize query state into a stable query string (without a leading "?"). */
export function serializeQueryState(state: QueryState): string {
  const params = new URLSearchParams();
  if (state.search) {
    params.set("search", state.search);
  }
  if (state.statuses.length > 0) {
    params.set("statuses", state.statuses.join(","));
  }
  if (state.severities.length > 0) {
    params.set("severities", state.severities.join(","));
  }
  if (state.from) {
    params.set("from", state.from);
  }
  if (state.to) {
    params.set("to", state.to);
  }
  if (state.sortField) {
    params.set("sortField", state.sortField);
  }
  if (state.sortDir) {
    params.set("sortDir", state.sortDir);
  }
  if (state.page !== undefined && state.page >= 1) {
    params.set("page", String(state.page));
  }
  return params.toString();
}

/** Merge a partial update over a base query state. */
export function mergeQueryState(
  base: QueryState,
  patch: Partial<QueryState>,
): QueryState {
  return { ...base, ...patch };
}
