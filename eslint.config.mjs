import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";
import pluginPrettier from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // ✅ Konfigurasi bawaan Next.js
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // ✅ Prettier + Auto-Clean + Sort
  prettier,
  {
    plugins: {
      prettier: pluginPrettier,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      /* 🚀 Auto remove import / variabel tak terpakai */
      "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      /* ✨ Integrasi format Prettier */
      "prettier/prettier": "warn",

      /* 🧩 Auto-sort import (urutkan otomatis saat save) */
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
    },
  },

  // ✅ Abaikan folder build/output
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
