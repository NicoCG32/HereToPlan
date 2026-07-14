import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const restringirCapas = (capas, mensaje) => [
  "error",
  {
    patterns: capas.flatMap((capa) => [
      {
        group: [`**/${capa}`, `**/${capa}/**`],
        message: mensaje,
      },
    ]),
  },
];

export default tseslint.config(
  {
    ignores: ["coverage", "dist", "node_modules"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.node,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/dominio/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restringirCapas(
        ["aplicacion", "infraestructura", "presentacion", "app"],
        "El dominio debe permanecer independiente de aplicación y adaptadores.",
      ),
    },
  },
  {
    files: ["src/aplicacion/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restringirCapas(
        ["infraestructura", "presentacion", "app"],
        "La aplicación solo puede depender del dominio y de sus propios puertos.",
      ),
    },
  },
  {
    files: ["src/infraestructura/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restringirCapas(
        ["presentacion", "app"],
        "Infraestructura implementa puertos y no depende de presentación ni composición.",
      ),
    },
  },
  {
    files: ["src/presentacion/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restringirCapas(
        ["dominio", "infraestructura", "app"],
        "Presentación consume contratos de aplicación y no conoce dominio ni adaptadores de salida.",
      ),
    },
  },
);
