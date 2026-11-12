import eslint from "@eslint/js";
import { tanstackConfig } from "@tanstack/eslint-config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tanstackConfig,
  ...tseslint.configs.recommended,
  eslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    settings: {
      react: {
        version: "19.2"
      }
    },
    languageOptions: {
      globals: {
        process: "readonly",
        window: "readonly",
        document: "readonly",
        console: "readonly"
      }
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./*", "../*"],
              message: "Use the ~/ alias for project imports."
            }
          ]
        }
      ],
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "jsx-a11y/no-autofocus": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/no-explicit-any": [
        "warn",
        {
          ignoreRestArgs: true
        }
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "typeParameter",
          format: ["PascalCase"],
          leadingUnderscore: "forbid",
          trailingUnderscore: "forbid",
          custom: {
            regex: "^([A-Z]|T[A-Z][A-Za-z]+)$",
            match: true
          }
        }
      ]
    }
  },
  {
    files: ["**/*.{jsx,tsx}"],
    rules: {
      "no-console": "warn"
    }
  },
  // Vite loads its config before the ~/ alias exists, so the config imports
  // project files by relative path.
  {
    files: ["vite.config.ts"],
    rules: {
      "no-restricted-imports": "off"
    }
  },
  {
    files: ["components/ui/**"],
    rules: {
      "jsx-a11y/label-has-associated-control": "off"
    }
  },
  {
    files: ["components/invoice-canvas.tsx"],
    rules: {
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/click-events-have-key-events": "off"
    }
  },
  {
    files: ["e2e/**/*.ts", "playwright.config.ts"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        indexedDB: "readonly",
        Buffer: "readonly"
      },
      parserOptions: {
        project: "./e2e/tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "no-restricted-imports": "off",
      "@typescript-eslint/no-floating-promises": "error",
      // Playwright fixtures take a callback param named `use`; it is not the
      // React `use` hook, so the hooks linter does not apply to this directory.
      "react-hooks/rules-of-hooks": "off"
    }
  },
  globalIgnores([
    "build/**",
    "dist/**",
    "**/node_modules/",
    "**/*.js",
    "test-results/**",
    "playwright-report/**",
    "blob-report/**"
  ])
]);
