import { describe, expect, it } from "vitest";
import {
  Agenda,
  EstructuraTareas,
  FechaLocal,
  PoliticaCompromiso,
  Tarea,
} from "../src/dominio";
import { esperarErrorDominio } from "./esperarErrorDominio";

const CREADA_EN = new Date("2026-07-20T10:00:00.000Z");

describe("tareas y proyectos", () => {
  it("impide subtareas en una tarea simple y autorreferencias", () => {
    esperarErrorDominio(
      "TAREA_SIMPLE_CON_SUBTAREAS",
      () =>
        new Tarea({
          id: "simple",
          titulo: "Simple",
          tipo: "TAREA_SIMPLE",
          tiempoNecesarioMinutos: 30,
          subtareasIds: ["otra"],
          creadaEn: CREADA_EN,
        }),
    );
    esperarErrorDominio(
      "TAREA_SE_CONTIENE_A_SI_MISMA",
      () =>
        new Tarea({
          id: "proyecto",
          titulo: "Proyecto",
          tipo: "PROYECTO",
          tiempoNecesarioMinutos: 120,
          subtareasIds: ["proyecto"],
          creadaEn: CREADA_EN,
        }),
    );
  });

  it("rechaza referencias ausentes y ciclos en toda la estructura", () => {
    const a = crearCompuesta("a", ["b"]);
    const b = crearCompuesta("b", ["a"]);

    esperarErrorDominio("CICLO_ENTRE_TAREAS", () =>
      EstructuraTareas.validar([a, b]),
    );
    esperarErrorDominio("SUBTAREA_NO_ENCONTRADA", () =>
      EstructuraTareas.validar([crearCompuesta("raiz", ["ausente"])]),
    );
  });

  it("acepta una composición acíclica compartida por tarea y proyecto", () => {
    const hoja = crearSimple("hoja");
    const compuesta = crearCompuesta("compuesta", ["hoja"]);
    const proyecto = new Tarea({
      id: "proyecto",
      titulo: "Proyecto",
      tipo: "PROYECTO",
      tiempoNecesarioMinutos: 180,
      subtareasIds: ["compuesta", "hoja"],
      creadaEn: CREADA_EN,
    });

    expect(() =>
      EstructuraTareas.validar([proyecto, compuesta, hoja]),
    ).not.toThrow();
  });

  it("mantiene estimación y fecha límite separadas del bloque calendarizado", () => {
    const tarea = new Tarea({
      id: "tarea-1",
      titulo: "Entregar informe",
      tipo: "TAREA_SIMPLE",
      tiempoNecesarioMinutos: 240,
      fechaLimite: FechaLocal.crear("2026-07-31"),
      creadaEn: CREADA_EN,
    });
    const agenda = new Agenda({
      id: "agenda-1",
      nombre: "Julio",
      fechaInicio: FechaLocal.crear("2026-07-20"),
      fechaFin: FechaLocal.crear("2026-07-31"),
      creadaEn: CREADA_EN,
    });
    agenda.agregarBloque({
      id: "bloque-1",
      actividadId: tarea.id,
      titulo: tarea.titulo,
      fecha: FechaLocal.crear("2026-07-22"),
      minutosPlanificados: 60,
      politica: new PoliticaCompromiso({
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
      }),
    });

    expect(tarea.tiempoNecesarioMinutos).toBe(240);
    expect(tarea.fechaLimite?.toString()).toBe("2026-07-31");
    expect(agenda.listarBloques()[0]).toMatchObject({
      actividadId: "tarea-1",
      minutosPlanificados: 60,
    });
    expect(agenda.listarBloques()[0]?.fecha.toString()).toBe("2026-07-22");
  });

  it("solo completa una compuesta mediante decisión explícita y una vez", () => {
    const compuesta = crearCompuesta("compuesta", ["hoja"]);
    expect(compuesta.estado).toBe("PENDIENTE");

    esperarErrorDominio("SUBTAREAS_PENDIENTES", () =>
      compuesta.confirmarComplecion(
        new Date("2026-07-21T10:00:00.000Z"),
        false,
      ),
    );
    expect(compuesta.estado).toBe("PENDIENTE");

    compuesta.confirmarComplecion(new Date("2026-07-21T10:00:00.000Z"), true);
    expect(compuesta.estado).toBe("COMPLETADA");
    expect(compuesta.resueltaEn?.toISOString()).toBe(
      "2026-07-21T10:00:00.000Z",
    );
    esperarErrorDominio("ACTIVIDAD_YA_RESUELTA", () =>
      compuesta.marcarNoCompletada(new Date()),
    );
  });
});

function crearSimple(id: string): Tarea {
  return new Tarea({
    id,
    titulo: `Simple ${id}`,
    tipo: "TAREA_SIMPLE",
    tiempoNecesarioMinutos: 30,
    creadaEn: CREADA_EN,
  });
}

function crearCompuesta(id: string, subtareasIds: readonly string[]): Tarea {
  return new Tarea({
    id,
    titulo: `Compuesta ${id}`,
    tipo: "TAREA_COMPUESTA",
    tiempoNecesarioMinutos: 60,
    subtareasIds,
    creadaEn: CREADA_EN,
  });
}
