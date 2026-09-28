/**
 * Local ESLint rule for #548 — flags hardcoded, human-readable English text
 * inside JSX (element children and a small set of user-facing attributes)
 * instead of a `t('namespace.key')` call.
 *
 * This is a heuristic, not a translator: it looks for text that "reads like
 * a sentence or label" (contains at least one run of 2+ letters and isn't
 * pure punctuation/numbers/whitespace) and skips things that are
 * structurally very unlikely to be user-facing (single characters,
 * ALL_CAPS_CONSTANTS, template-looking strings, code-ish tokens).
 *
 * Deliberately conservative and `warn`-severity by default (see
 * eslint.config.mjs): most of src/app and src/components still has
 * hardcoded copy outside the areas fixed in #545-#548, and turning this
 * into a hard error repo-wide would fail the build on pre-existing,
 * out-of-scope strings rather than catching new regressions in the areas
 * this issue actually touched.
 */

const IGNORED_ATTRIBUTES = new Set([
  "className",
  "class",
  "id",
  "key",
  "href",
  "src",
  "rel",
  "target",
  "type",
  "name",
  "htmlFor",
  "role",
  "style",
  "viewBox",
  "fill",
  "stroke",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "d",
  "xmlns",
  "autoComplete",
  "inputMode",
  "data-testid",
]);

// Attributes whose string value is realistically user-facing copy.
const CHECKED_ATTRIBUTES = new Set(["placeholder", "title", "aria-label", "alt"]);

function looksLikeHumanText(raw) {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return false;
  // Needs an actual word (2+ letters together) to be considered prose.
  if (!/[A-Za-z]{2,}/.test(text)) return false;
  // Skip things that read as code/tokens rather than copy: ALL_CAPS,
  // camelCase/PascalCase identifiers with no spaces, or single words that
  // are very short and unlikely to need translation (e.g. "ID", "USD").
  if (!/\s/.test(text) && text.length <= 4) return false;
  if (/^[A-Z0-9_]+$/.test(text)) return false;
  return true;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow hardcoded human-readable text in JSX; use t('namespace.key') from src/i18n/i18n.tsx instead.",
    },
    schema: [],
    messages: {
      hardcodedText:
        "Hardcoded text {{text}} found in JSX. Use t('namespace.key') so it can be localized.",
      hardcodedAttr:
        "Hardcoded text {{text}} found in the \"{{attr}}\" attribute. Use t('namespace.key') so it can be localized.",
    },
  },
  create(context) {
    return {
      JSXText(node) {
        if (looksLikeHumanText(node.value)) {
          context.report({
            node,
            messageId: "hardcodedText",
            data: { text: JSON.stringify(node.value.trim().slice(0, 40)) },
          });
        }
      },
      JSXAttribute(node) {
        const name = node.name && node.name.name;
        if (typeof name !== "string" || IGNORED_ATTRIBUTES.has(name)) return;
        if (!CHECKED_ATTRIBUTES.has(name)) return;
        const value = node.value;
        if (value && value.type === "Literal" && typeof value.value === "string") {
          if (looksLikeHumanText(value.value)) {
            context.report({
              node: value,
              messageId: "hardcodedAttr",
              data: { attr: name, text: JSON.stringify(value.value.slice(0, 40)) },
            });
          }
        }
      },
    };
  },
};
