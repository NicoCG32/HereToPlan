import { describe, expect, it } from "vitest";
import {
  AjusteCompromiso,
  FechaLocal,
  Habito,
  Tarea,
  TransaccionPuntos,
} from "../src/dominio";
import { esperarErrorDominio } from "./esperarErrorDominio";

describe("valores compartidos y actividades", () => {
  it("normaliza los textos de una actividad", () => {
    const actividad = new Tarea({
      id: "actividad-1",
      titulo: "  Preparar evaluación  ",
      tipo: "TAREA_SIMPLE",
      descripcion: "  Repasar los capítulos uno y dos  ",
      tiempoNecesarioMinutos: 60,
      creadaEn: new Date("2026-07-20T10:00:00.000Z"),
    });

    expect(actividad.titulo).toBe("Preparar evaluación");
    expect(actividad.descripcion).toBe("Repasar los capítulos uno y dos");
  });

  it("rechaza identificadores y títulos vacíos", () => {
    esperarErrorDominio(
      "IDENTIFICADOR_INVALIDO",
      () =>
        new Tarea({
          id: " ",
          titulo: "Válida",
          tipo: "TAREA_SIMPLE",
          tiempoNecesarioMinutos: 30,
          creadaEn: new Date(),
        }),
    );
    esperarErrorDominio(
      "TITULO_ACTIVIDAD_VACIO",
      () =>
        new Tarea({
          id: "actividad-1",
          titulo: " ",
          tipo: "TAREA_SIMPLE",
          tiempoNecesarioMinutos: 30,
          creadaEn: new Date(),
        }),
    );
  });

  it("distingue tareas y hábitos sin asignarles una fecha", () => {
    const tarea = new Tarea({
      id: "tarea-1",
      titulo: "Tarea",
      tipo: "TAREA_COMPUESTA",
      tiempoNecesarioMinutos: 60,
      creadaEn: new Date("2026-07-20T10:00:00.000Z"),
    });
    const habito = new Habito({
      id: "habito-1",
      titulo: "Hábito",
      tiempoNecesarioMinutos: 20,
      frecuencia: "DIARIA",
      creadaEn: new Date("2026-07-20T10:00:00.000Z"),
    });

    expect([tarea.tipo, habito.tipo]).toEqual(["TAREA_COMPUESTA", "HABITO"]);
    expect("fecha" in tarea).toBe(false);
    expect("fecha" in habito).toBe(false);
  });

  it("valida formato, existencia, orden y día ISO de fechas locales", () => {
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
    expect(inicio.obtenerDiaSemanaIso()).toBe(1);
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
