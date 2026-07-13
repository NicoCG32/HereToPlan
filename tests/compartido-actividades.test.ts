import { describe, expect, it } from "vitest";
import {
  Actividad,
  AjusteCompromiso,
  FechaLocal,
  TransaccionPuntos,
} from "../src/dominio";
import { esperarErrorDominio } from "./esperarErrorDominio";

describe("valores compartidos y actividades", () => {
  it("normaliza los textos de una actividad", () => {
    const actividad = new Actividad({
      id: "actividad-1",
      titulo: "  Preparar evaluación  ",
      tipo: "TAREA",
      descripcion: "  Repasar los capítulos uno y dos  ",
    });

    expect(actividad.titulo).toBe("Preparar evaluación");
    expect(actividad.descripcion).toBe("Repasar los capítulos uno y dos");
  });

  it("rechaza identificadores y títulos vacíos", () => {
    esperarErrorDominio(
      "IDENTIFICADOR_INVALIDO",
      () => new Actividad({ id: " ", titulo: "Válida", tipo: "TAREA" }),
    );
    esperarErrorDominio(
      "TITULO_ACTIVIDAD_VACIO",
      () => new Actividad({ id: "actividad-1", titulo: " ", tipo: "TAREA" }),
    );
  });

  it("valida formato, existencia y orden de las fechas locales", () => {
    esperarErrorDominio("FECHA_LOCAL_INVALIDA", () =>
      FechaLocal.crear("20-07-2026"),
    );
    esperarErrorDominio("FECHA_LOCAL_INEXISTENTE", () =>
      FechaLocal.crear("2026-02-30"),
    );

    const inicio = FechaLocal.crear("2026-07-20");
    const fin = FechaLocal.crear("2026-07-21");
    expect(inicio.esAnteriorA(fin)).toBe(true);
    expect(fin.esPosteriorA(inicio)).toBe(true);
    expect(inicio.esIgualA(FechaLocal.crear("2026-07-20"))).toBe(true);
    expect(inicio.toString()).toBe("2026-07-20");
  });

  it("rechaza cantidades y fechas históricas inválidas", () => {
    esperarErrorDominio(
      "CANTIDAD_PUNTOS_INVALIDA",
      () =>
        new TransaccionPuntos({
          id: "movimiento-1",
          tipo: "INGRESO",
          cantidad: 0,
          fuenteTipo: "COMPROMISO_COMPLETADO",
          fuenteId: "bloque-1",
          descripcion: "Ingreso inválido",
          ocurridaEn: new Date(),
        }),
    );
    esperarErrorDominio(
      "FECHA_INVALIDA",
      () =>
        new AjusteCompromiso({
          id: "ajuste-1",
          bloqueId: "bloque-1",
          canjeRecompensaId: "canje-1",
          tipo: "EXCUSAR",
          aplicadoEn: new Date("fecha inválida"),
        }),
    );
  });

  it("protege los instantes históricos mediante copias", () => {
    const ocurridaEn = new Date("2026-07-20T10:00:00.000Z");
    const transaccion = new TransaccionPuntos({
      id: "movimiento-1",
      tipo: "INGRESO",
      cantidad: 10,
      fuenteTipo: "COMPROMISO_COMPLETADO",
      fuenteId: "bloque-1",
      descripcion: "Ingreso verificable",
      ocurridaEn,
    });

    ocurridaEn.setUTCFullYear(2030);
    const vista = transaccion.ocurridaEn;
    vista.setUTCFullYear(2031);

    expect(transaccion.ocurridaEn.toISOString()).toBe(
      "2026-07-20T10:00:00.000Z",
    );
    expect(transaccion.obtenerVariacion()).toBe(10);
  });
});
