/**
 * ApexChain Frontend Test Suite
 *
 * Issue #623 — mechanical alarm against literal query keys.
 *
 * `src/lib/query-keys.ts` is the canonical query-key factory: every
 * useQuery/useMutation/invalidateQueries call must build its key from
 * `slaEventKeys`/`sessionKeys` so prefix-matching invalidation can reach it.
 * A literal array key is a future desync between readers and invalidators,
 * and code review alone kept missing them — hence this scan.
 *
 * The scan walks every .ts/.tsx file under src/ (excluding colocated test
 * files) and fails when it finds a literal array passed directly as a
 * `queryKey:` property or as the direct argument of useQuery/useMutation.
 *
 * Known limits (documented in docs/query-keys.md): the scan targets those
 * call-site patterns only. A literal returned by a key-builder function and
 * passed indirectly (e.g. `queryKey: someKeyBuilder()`) is not flagged —
 * prefer extending the factory over adding local key builders.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = path.resolve(__dirname, "../../src");

/** A literal array passed directly as the `queryKey` property of a
 * useQuery/useMutation options object or an invalidation filters object. */
const QUERY_KEY_LITERAL = /queryKey:\s*\[/;

/** A literal array passed directly as the first argument of
 * useQuery(["..."]) or useMutation(["..."]). */
const HOOK_DIRECT_LITERAL =
  /use(?:Query|Mutation)\(\s*\[\s*["'][^"']*["']\s*[,\]]/;

function isTestFile(file: string): boolean {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (/\.[cm]?[jt]sx?$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function findViolations(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  const violations: string[] = [];
  lines.forEach((line, index) => {
    if (QUERY_KEY_LITERAL.test(line) || HOOK_DIRECT_LITERAL.test(line)) {
      violations.push(`${path.relative(SRC_DIR, file)}:${index + 1}: ${line.trim()}`);
    }
  });
  return violations;
}

describe("query key literal scan (issue #623)", () => {
  it("reports zero literal query keys in src", () => {
    const files = walk(SRC_DIR).filter((file) => !isTestFile(file));
    const violations = files.flatMap(findViolations);
    expect(violations).toEqual([]);
  });

  it("catches a deliberate literal-key fixture (proves the alarm fires)", () => {
    const fixture = path.resolve(
      __dirname,
      "fixtures/query-keys-literal-violation.ts",
    );
    expect(findViolations(fixture).length).toBeGreaterThan(0);
  });
});
