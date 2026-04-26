import { dirname } from "path";
import { fileURLToPath } from "url";
import { includeIgnoreFile } from "@eslint/compat";
import globals from "globals";
import eslintPluginNext from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import ts from "typescript-eslint";

const __dirname = dirname(fileURLToPath(import.meta.url));
const gitignorePath = includeIgnoreFile(`${__dirname}/.gitignore`);

export default ts.config(
  gitignorePath,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  ...ts.configs.recommended,
  {
    plugins: {
      "@next/next": eslintPluginNext,
    },
    rules: {
      ...eslintPluginNext.configs.recommended.rules,
      ...eslintPluginNext.configs["core-web-vitals"].rules,
    },
  },
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "lib/generated/**", "src/__tests__/setup.ts", ".kilo/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);
