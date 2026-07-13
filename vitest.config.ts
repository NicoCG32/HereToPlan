import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/dominio/**/*.ts"],
      exclude: [
        "src/dominio/index.ts",
        "src/dominio/**/tipos.ts",
        "src/dominio/descripcionCapaDominio.ts",
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
