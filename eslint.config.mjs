import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noHardcodedJsxText from "./eslint-rules/no-hardcoded-jsx-text.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated OpenAPI types — never lint generated code.
    "src/types/api.generated.ts",
  ]),
  {
    // Typed rules such as @typescript-eslint/no-unsafe-assignment require
    // type information. Without projectService they crash ESLint at startup
    // ("rule which requires type information, but don't have parserOptions")
    // instead of reporting findings. Scope it to TS files that are covered
    // by tsconfig.json and keep it in sync with `npm run typecheck`.
    files: ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      // React Compiler rules surfaced after typed linting started working
      // (they could never run before — ESLint crashed at startup). All
      // flagged components have been refactored, so both rules are enforced.
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
    },
  },
  {
    // #548 — flag new hardcoded copy in JSX so localized sections (login,
    // register, settings/wallet/health/SLA) don't regress and new inline
    // strings don't creep back in. `warn`, not `error`: most of src/app and
    // src/components still has untranslated copy outside the areas fixed
    // in #545-#548, and erroring repo-wide would fail the build on
    // pre-existing, out-of-scope strings.
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    plugins: {
      local: { rules: { "no-hardcoded-jsx-text": noHardcodedJsxText } },
    },
    rules: {
      "local/no-hardcoded-jsx-text": "warn",
    },
  },
]);

export default eslintConfig;
