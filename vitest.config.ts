import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "src/dominio/**/*.ts",
        "src/aplicacion/**/*.ts",
        "src/infraestructura/persistencia/memoria/**/*.ts",
      ],
      exclude: [
        "src/dominio/index.ts",
        "src/dominio/**/tipos.ts",
        "src/dominio/descripcionCapaDominio.ts",
        "src/aplicacion/index.ts",
        "src/aplicacion/descripcionCapaAplicacion.ts",
        "src/aplicacion/puertos/GeneradorIdentificadores.ts",
        "src/aplicacion/puertos/Reloj.ts",
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
