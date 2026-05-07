// @ts-check
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // Ignore build output and code-generated files
  {
    ignores: [
      "**/dist/**",
      "**/generated/**",
      "**/node_modules/**",
    ],
  },

  // ── All TypeScript/TSX files — parser setup + rules that need no type info ──
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
    },
    languageOptions: { parser: tseslint.parser },
    rules: {
      // Warn on new `as any` / `: any` — use a typed assertion or unknown instead.
      "@typescript-eslint/no-explicit-any": "warn",

      // JSON.parse safety: both previously unsafe call sites (messages.ts, objectAcl.ts)
      // are wrapped in try/catch. No lint rule enforces this — audit manually on PR review.

      // Register react-hooks rules so eslint-disable comments referencing them
      // are recognised and don't produce "rule not found" errors.
      // Set to "warn" so brownfield violations don't block CI on day one.
      // Harden to "error" once the conditional-hook call-sites are refactored.
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // ── API server — type-aware rule requires tsconfig resolution ───────────────
  {
    files: ["artifacts/api-server/src/**/*.ts"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Unhandled async = silent failure. Either await, chain .catch(), or
      // prefix with void to mark a deliberate fire-and-forget.
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
);
