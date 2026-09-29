#!/usr/bin/env node
/**
 * Issue #633 — per-route bundle budget.
 *
 * Route-level code splitting only stays in place if something notices when it
 * regresses. This reads the App Router build manifest produced by `next build`
 * and compares each route's first-load JS against the accepted size recorded in
 * `bundle-budget.json`, failing when a route grows by more than the configured
 * tolerance (10% by default).
 *
 * Usage:
 *   npm run build && npm run check:bundle      # verify
 *   npm run check:bundle -- --update           # record the current sizes
 *
 * Routes without a recorded baseline are reported as warnings rather than
 * failures, so the check can be adopted before every route is budgeted.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = join(ROOT, ".next");
const MANIFEST_FILE = join(NEXT_DIR, "app-build-manifest.json");
const BUDGET_FILE = join(ROOT, "bundle-budget.json");
const DEFAULT_TOLERANCE_PERCENT = 10;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

if (!existsSync(MANIFEST_FILE)) {
  fail(
    `No build manifest at .next/app-build-manifest.json. Run \`npm run build\` before checking the bundle budget.`,
  );
}

const budget = existsSync(BUDGET_FILE)
  ? JSON.parse(readFileSync(BUDGET_FILE, "utf8"))
  : {};
const tolerancePercent = budget.tolerancePercent ?? DEFAULT_TOLERANCE_PERCENT;

const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
const pages = manifest.pages ?? {};

/** Total on-disk size of every chunk a route loads. */
function routeBytes(chunks) {
  let total = 0;
  for (const chunk of chunks ?? []) {
    const file = join(NEXT_DIR, chunk);
    if (existsSync(file)) {
      total += statSync(file).size;
    }
  }
  return total;
}

const sizes = Object.fromEntries(
  Object.entries(pages).map(([route, chunks]) => [route, routeBytes(chunks)]),
);

if (process.argv.includes("--update")) {
  const sorted = Object.fromEntries(
    Object.entries(sizes).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(
    BUDGET_FILE,
    `${JSON.stringify({ tolerancePercent, routes: sorted }, null, 2)}\n`,
  );
  console.log(
    `✔ Recorded budgets for ${Object.keys(sorted).length} route(s) in bundle-budget.json`,
  );
  process.exit(0);
}

const baselines = budget.routes ?? {};
const regressions = [];

for (const [route, bytes] of Object.entries(sizes)) {
  const baseline = baselines[route];

  if (typeof baseline !== "number") {
    console.warn(
      `• unbudgeted route ${route} (${kb(bytes)}) — run \`npm run check:bundle -- --update\` to record it`,
    );
    continue;
  }

  const allowed = baseline * (1 + tolerancePercent / 100);
  if (bytes > allowed) {
    regressions.push({ route, baseline, bytes, allowed });
  }
}

if (regressions.length > 0) {
  console.error(
    `\n✖ ${regressions.length} route(s) grew past their bundle budget (tolerance ${tolerancePercent}%):\n`,
  );
  for (const { route, baseline, bytes, allowed } of regressions) {
    console.error(
      `  ${route}: ${kb(bytes)} vs budget ${kb(baseline)} (allowed up to ${kb(allowed)})`,
    );
  }
  process.exit(1);
}

console.log(
  `✔ bundle budget OK — ${Object.keys(sizes).length} route(s), tolerance ${tolerancePercent}%`,
);
