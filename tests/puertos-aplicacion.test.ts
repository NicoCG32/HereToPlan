import { describe, expect, it } from "vitest";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
  RepositorioAgendasEnMemoriaParaPruebas,
} from "./doblesAplicacion";
import { verificarContratoRepositorioAgendas } from "./contratoRepositorioAgendas";

describe("dobles controlables de los puertos de aplicación", () => {
  it("entrega copias del instante configurado", () => {
    const instante = new Date("2026-07-20T10:00:00.000Z");
    const reloj = new RelojFijo(instante);

    const primeraLectura = reloj.ahora();
    primeraLectura.setUTCFullYear(2030);

    expect(reloj.ahora().toISOString()).toBe("2026-07-20T10:00:00.000Z");

    reloj.establecer(new Date("2026-07-21T11:00:00.000Z"));
    expect(reloj.ahora().toISOString()).toBe("2026-07-21T11:00:00.000Z");
  });

  it("genera la secuencia de identificadores definida por la prueba", () => {
    const generador = new GeneradorIdentificadoresPredefinidos([
      "agenda-1",
      "agenda-2",
    ]);

    expect(generador.generar()).toBe("agenda-1");
    expect(generador.generar()).toBe("agenda-2");
    expect(() => generador.generar()).toThrow(
      "No quedan identificadores predefinidos.",
    );
  });
});

verificarContratoRepositorioAgendas(
  "doble en memoria",
  () => new RepositorioAgendasEnMemoriaParaPruebas(),
);
