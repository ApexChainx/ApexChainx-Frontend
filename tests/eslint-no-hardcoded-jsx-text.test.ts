import { RuleTester } from "eslint";
import rule from "../eslint-rules/no-hardcoded-jsx-text.js";

/**
 * #548 acceptance criteria: "a lint check rejects a sample new inline
 * string". Exercises the rule in isolation (not against the whole repo,
 * which still has plenty of pre-existing, out-of-scope hardcoded copy —
 * see eslint.config.mjs for why the rule is `warn`, not `error`, there).
 *
 * RuleTester drives its own describe/it calls (vitest's `globals: true`
 * exposes the same globals it expects), so `.run(...)` is called directly
 * at module scope rather than nested inside a vitest `it()`.
 */

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run("no-hardcoded-jsx-text", rule, {
      valid: [
        // Localized text and interpolation are fine.
        { code: "const el = <h1>{t('settings.slaContractId')}</h1>;" },
        { code: "const el = <p>{t('settings.horizonHealthCheck', { network })}</p>;" },
        // Non-prose attributes are ignored even with letters in them.
        { code: '<input className="w-full text-sm" type="password" />;' },
        // Short, code-ish, or ALL_CAPS tokens are not flagged.
        { code: "const el = <span>{value}</span>;" },
        { code: "const el = <span>USD</span>;" },
        { code: "const el = <code>{walletStatus.public_key}</code>;" },
      ],
      invalid: [
        {
          // A brand-new hardcoded label, exactly the regression this rule
          // exists to catch — e.g. someone adding a new wallet action
          // button without wiring it through t().
          code: 'const el = <button title="Create wallet">Create wallet</button>;',
          errors: [{ messageId: "hardcodedAttr" }, { messageId: "hardcodedText" }],
        },
        {
          code: '<input placeholder="Public key" />;',
          errors: [{ messageId: "hardcodedAttr" }],
        },
        {
          code: "const el = <p>No wallet loaded yet.</p>;",
          errors: [{ messageId: "hardcodedText" }],
        },
      ],
});
