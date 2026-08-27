/**
 * ApexChain Network Operations Intelligence Platform
 *
 * Query-key orphan guard (issue #382)
 *
 * Static-registry check: every root invalidated via
 *   queryClient.invalidateQueries({ queryKey }) / setQueryData / removeQueries
 * must also be used as a useQuery({ queryKey }) prefix somewhere in src/.
 *
 * This catches the class of bug where a mutation invalidates a query-key
 * family that nothing ever publishes under — the invalidate silently no-ops
 * and stale data survives. Two live instances were fixed in this PR:
 *   - useInvalidateOnResolve invalidated slaEventKeys.dashboard/payments/disputes/sla
 *     roots that no useQuery publishes under (dashboard actually uses
 *     ["dashboard-metrics"], disputes use ["sla-disputes"], sla config uses
 *     ["sla", "config"], and payments have no React Query cache at all).
 *   - useTwoFactor invalidated ["session"], which no query uses (session is
 *     React context, not React Query).
 *
 * How to register a new query-key factory (dynamic keys):
 *   - If the root is produced by a factory exported from `src/lib/query-keys.ts`
 *     (e.g. `slaEventKeys.outages.all`), add the factory to FACTORIES below so
 *     the guard can resolve it to a literal root array. Every query family you
 *     create must ALSO be consumed by at least one `useQuery({ queryKey })`
 *     call (or a setQueryData on a real cache entry) — otherwise the guard
 *     flags it as an orphaned invalidation.
 *   - If the root is a plain inline array literal (e.g. `["webhooks"]`), the
 *     guard resolves it directly and no registration is needed.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { slaEventKeys } from "../src/lib/query-keys";

/** Query-key factories the guard can resolve to literal root arrays. */
const FACTORIES: Record<string, unknown> = {
  slaEventKeys,
  // `outageKeys` is a public re-export of slaEventKeys.outages (see
  // src/features/outages/hooks/useOutageMutations.ts).
  outageKeys: slaEventKeys.outages,
};

const SRC_ROOT = path.resolve(__dirname, "../src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.") && !entry.name.includes(".spec.")) {
      out.push(full);
    }
  }
  return out;
}

/** Extract a balanced expression starting at index `start` (first char after a colon or arrow). */
function extractExpr(src: string, start: number): string {
  let depth = 0;
  let i = start;
  let inString: string | null = null;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (ch === "\\") {
        i++;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
    } else if (ch === "[" || ch === "(" || ch === "{") {
      depth++;
    } else if (ch === "]" || ch === ")" || ch === "}") {
      depth--;
      if (depth < 0) break;
    } else if ((ch === "," || ch === "}" || ch === ";") && depth === 0) {
      break;
    }
  }
  return src.slice(start, i).trim();
}

/** Parse a string array literal's string-literal elements, stopping at first non-literal. */
function literalPrefix(arrExpr: string): string[] | null {
  const inner = arrExpr.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  let inString: string | null = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inString) {
      cur += ch;
      if (ch === "\\") {
        cur += inner[++i] ?? "";
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      cur += ch;
    } else if (ch === "[" || ch === "(" || ch === "{") {
      depth++;
      cur += ch;
    } else if (ch === "]" || ch === ")" || ch === "}") {
      depth--;
      cur += ch;
    } else if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());

  const root: string[] = [];
  for (const p of parts) {
    const m = p.match(/^(['"])(.*)\1$/);
    if (!m) break; // first non-literal element ends the prefix
    root.push(m[2] ?? "");
  }
  return root.length > 0 ? root : null;
}

/**
 * Resolve a queryKey expression to its root prefix (array of string elements).
 * Supports inline array literals, factory chains with or without arguments
 * (e.g. `slaEventKeys.outages.all`, `slaEventKeys.outages.detail(id)`,
 * `outageKeys.all`), and single-identifier local vars defined earlier in the
 * same file (`const queryKey = useMemo(() => [...])`, `SLA_CONFIG_KEY`).
 * Returns null if the expression cannot be statically resolved.
 */
function resolveRoot(expr: string, fileSrc: string): string[] | null {
  let t = expr.trim().replace(/\s+as\s+const\s*$/, "");

  // Inline array literal → literal string prefix
  if (t.startsWith("[")) {
    return literalPrefix(t);
  }

  // Single identifier → resolve from local const definitions in the same file
  if (/^[A-Za-z_$][\w$]*$/.test(t)) {
    const init = findLocalVarValue(fileSrc, t);
    if (init !== null) {
      return resolveRoot(init, fileSrc);
    }
    return null;
  }

  // Factory chain: possibly with call args — strip a trailing call
  const chainMatch = t.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(?:\(.*\))?$/);
  if (chainMatch && chainMatch[1]) {
    const segs = chainMatch[1].split(".");
    const factoryName = segs[0] ?? "";
    const rootObj = FACTORIES[factoryName];
    if (rootObj === undefined) return null;
    let node: unknown = rootObj;
    for (let i = 1; i < segs.length; i++) {
      const seg = segs[i] as string;
      if (node && typeof node === "object" && seg in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[seg];
      } else {
        return null;
      }
    }
    if (Array.isArray(node)) {
      const root = node.filter((x) => typeof x === "string") as string[];
      return root.length > 0 ? root : null;
    }
    if (typeof node === "function") {
      try {
        const arr = (node as (...a: unknown[]) => unknown)();
        if (Array.isArray(arr)) {
          const root = arr.filter((x) => typeof x === "string") as string[];
          return root.length > 0 ? root : null;
        }
      } catch {
        return null;
      }
    }
    return null;
  }
  return null;
}

/** Find the initializer of `const <name> = ...` or `const <name> = useMemo(() => ...)` in fileSrc. */
function findLocalVarValue(fileSrc: string, name: string): string | null {
  const re = new RegExp(
    `const\\s+${name}\\s*=\\s*(?:useMemo\\s*(?:<[^>]*>)?\\s*\\(\\s*\\(\\)\\s*=>\\s*)?`,
  );
  const m = re.exec(fileSrc);
  if (!m) return null;
  return extractExpr(fileSrc, m.index + m[0].length);
}

function isPrefix(short: string[], long: string[]): boolean {
  if (short.length > long.length) return false;
  return short.every((s, i) => s === long[i]);
}

interface Collected {
  published: string[];
  invalidated: string[];
}

function classifyCalls(src: string): Collected {
  const published: string[] = [];
  const invalidated: string[] = [];

  function add(root: string[] | null, bucket: string[]) {
    if (root && root.length) bucket.push(JSON.stringify(root));
  }

  /**
   * From the object body following a call's `(`, extract the queryKey
   * expression. Handles both `queryKey: EXPR` and shorthand `queryKey,`
   * (whose value is the local var `queryKey`, resolved via resolveRoot).
   */
  function queryKeyFromBody(bodyStart: number, limit: number): void {
    // explicit `queryKey:` form
    const explicit = /\bqueryKey\s*:/.exec(src.slice(bodyStart, bodyStart + limit));
    if (explicit) {
      const abs = bodyStart + explicit.index + explicit[0].length;
      const expr = extractExpr(src, abs);
      if (expr) add(resolveRoot(expr, src), published);
      return;
    }
    // shorthand `queryKey,` / `queryKey }` form — value is the identifier itself
    if (new RegExp(`\\bqueryKey\\s*(,|})`).test(src.slice(bodyStart, bodyStart + limit))) {
      add(resolveRoot("queryKey", src), published);
    }
  }

  // 1. useQuery({ queryKey: EXPR | queryKey, ... }) — published
  const useQueryRe = /useQuery\s*(?:<[^>]*>)?\s*\(\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = useQueryRe.exec(src))) {
    const bodyStart = m.index + m[0].length;
    queryKeyFromBody(bodyStart, 400);
  }

  // 2. queryClient.invalidateQueries({ queryKey: EXPR }) — invalidated
  const invRe = /\.invalidateQueries\s*\(\s*\{/g;
  while ((m = invRe.exec(src))) {
    const bodyStart = m.index + m[0].length;
    const qk = src.indexOf("queryKey", bodyStart);
    const colon = src.indexOf(":", qk);
    if (qk === -1 || qk > bodyStart + 400 || colon === -1 || colon > bodyStart + 400) continue;
    const expr = extractExpr(src, colon + 1);
    if (!expr) continue;
    add(resolveRoot(expr, src), invalidated);
  }

  // 3. setQueryData(KEY, fn) / removeQueries(KEY) / setQueriesData({ queryKey })
  const setRe = /\.(setQueryData|removeQueries|setQueriesData)\s*(?:<[^>]*>)?\s*\(/g;
  while ((m = setRe.exec(src))) {
    const from = m.index + m[0].length;
    // setQueryData(KEY, ...) — first arg; setQueriesData({ queryKey }) — object form
    const peek = src.slice(from, from + 40);
    if (peek.trimStart().startsWith("{")) {
      const qk = src.indexOf("queryKey", from);
      if (qk !== -1 && qk < from + 400) {
        const colon = src.indexOf(":", qk);
        if (colon !== -1 && colon < from + 400) {
          const expr = extractExpr(src, colon + 1);
          if (expr) add(resolveRoot(expr, src), invalidated);
        }
      }
    } else {
      const expr = extractExpr(src, from);
      if (expr) add(resolveRoot(expr, src), invalidated);
    }
  }

  return {
    published: [...new Set(published)],
    invalidated: [...new Set(invalidated)],
  };
}

describe("query-key registry guard (issue #382)", () => {
  it("every invalidated query-key root is also a useQuery prefix", () => {
    const files = walk(SRC_ROOT);
    expect(files.length).toBeGreaterThan(0);

    const published: string[][] = [];
    const invalidated: string[][] = [];

    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      const { published: p, invalidated: inv } = classifyCalls(src);
      for (const r of p) published.push(JSON.parse(r));
      for (const r of inv) invalidated.push(JSON.parse(r));
    }

    const orphans: string[] = [];
    for (const invRoot of invalidated) {
      const hasPublisher = published.some((pub) => isPrefix(invRoot, pub));
      if (!hasPublisher) orphans.push(JSON.stringify(invRoot));
    }

    expect(orphans, `orphaned invalidation roots with no useQuery publisher:\n${orphans.join("\n")}`).toEqual([]);
  });
});