#!/usr/bin/env node
/**
 * Scripted WCAG contrast check for tertiary text colours (#546).
 *
 * Scans src/app and src/components for Tailwind `text-slate-*` utility
 * classes used on light (white/slate-50) card backgrounds and fails the
 * check if any resolve below the WCAG AA thresholds:
 *   - 4.5:1 for normal/small text
 *   - 3:1 for large text (>=24px, or >=19px bold)
 *
 * This intentionally only checks the light-mode token (never a `dark:`
 * variant, which pairs against a dark background and is out of scope for
 * this check). It is not a full page-rendered contrast audit — it is a
 * fast, CI-friendly guard against regressing the tertiary text colours
 * fixed in #546. The full page-rendered scan lives in the axe-core suite
 * at tests/e2e/a11y.spec.ts.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOTS = ["src/app", "src/components"];
const EXTENSIONS = new Set([".tsx", ".jsx"]);

// Tailwind's default slate palette (hex values), the only colours this
// codebase's tailwind.config.js exposes (no custom token overrides).
const SLATE = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
};

const BACKGROUND = "#ffffff"; // cards render on white or slate-50; white is the stricter (lower-contrast) case
const AA_SMALL = 4.5;
const AA_LARGE = 3.0;

function relativeLuminance(hex) {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full, out);
    } else if (EXTENSIONS.has(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

// Matches the specific tertiary-text shades flagged in #546
// (`text-slate-400` / `text-slate-500`), but not the `dark:` variant, which
// pairs against a dark background and is a separate contrast problem.
// Deliberately scoped to these two shades rather than the whole palette:
// this is a regression guard for the #546 fix, not a general-purpose
// contrast linter, and lighter shades (e.g. text-slate-300) are also used
// on decorative/non-text elements (icons) where the text-contrast formula
// does not apply.
const TOKEN_RE = /(?<!dark:)text-slate-(400|500)\b/g;
// A rough "large text" signal: text-lg/xl/2xl.../ or explicit bold + text-base+
const LARGE_TEXT_HINT_RE = /\btext-(lg|xl|2xl|3xl|4xl|5xl)\b/;

let failures = [];
let checked = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      let match;
      TOKEN_RE.lastIndex = 0;
      while ((match = TOKEN_RE.exec(line))) {
        const shade = Number(match[1]);
        const hex = SLATE[shade];
        if (!hex) continue;
        checked += 1;
        const ratio = contrastRatio(hex, BACKGROUND);
        const isLarge = LARGE_TEXT_HINT_RE.test(line);
        const threshold = isLarge ? AA_LARGE : AA_SMALL;
        if (ratio < threshold) {
          failures.push({
            file,
            line: idx + 1,
            token: match[0],
            ratio: ratio.toFixed(2),
            threshold,
            text: line.trim(),
          });
        }
      }
    });
  }
}

if (failures.length > 0) {
  console.error(`\nContrast check failed: ${failures.length} selector(s) below WCAG AA.\n`);
  for (const f of failures) {
    console.error(
      `  ${f.file}:${f.line}  ${f.token}  ratio=${f.ratio}:1 (needs >=${f.threshold}:1)\n    ${f.text}`,
    );
  }
  console.error("");
  process.exit(1);
}

console.log(`Contrast check passed: ${checked} text-slate-* selector(s) checked, 0 failures.`);
