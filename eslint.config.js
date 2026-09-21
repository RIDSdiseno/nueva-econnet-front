// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "playwright-report/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["error", { allow: ["error"] }],
      eqeqeq: ["error", "smart"]
    }
  },
  {
    /* Los guiones de build hablan por consola: es su salida, no un olvido. */
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" }
  },
  {
    /* La entrada del prerenderizado corre en Node y nunca pasa por Fast
       Refresh, así que puede exportar funciones además de componentes. */
    files: ["src/entry-servidor.tsx"],
    rules: { "react-refresh/only-export-components": "off" }
  }
);
