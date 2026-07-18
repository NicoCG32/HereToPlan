import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "src/dominio/**/*.ts",
        "src/aplicacion/**/*.ts",
        "src/infraestructura/persistencia/**/*.ts",
      ],
      exclude: [
        "src/dominio/index.ts",
        "src/dominio/**/tipos.ts",
        "src/aplicacion/index.ts",
        "src/aplicacion/puertos/GeneradorIdentificadores.ts",
        "src/aplicacion/puertos/Reloj.ts",
        "src/infraestructura/persistencia/registros/**/*.ts",
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
