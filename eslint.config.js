import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import typescript from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "simple-import-sort": simpleImportSort,
      "@typescript-eslint": typescript,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // core
      "no-unused-vars": "off", // replaced by TS rule
      "prefer-const": "error",

      // react
      "react/react-in-jsx-scope": "off", // not needed in React 17+
      "react/prop-types": "off", // disable if you use TS
      "react/jsx-uses-react": "off",

      // hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // sorting
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-module-boundary-types": "off", // optional for React projects
      "@typescript-eslint/no-explicit-any": "warn", // avoid using `any`
      "@typescript-eslint/consistent-type-imports": "error", // enforce consistent type imports
      "@typescript-eslint/no-empty-function": "warn", // avoid empty functions
      "@typescript-eslint/no-inferrable-types": "warn", // avoid unnecessary type annotations
      "@typescript-eslint/ban-ts-comment": "warn", // avoid unnecessary `@ts-ignore` comments
    },
  },
  prettier,
];
