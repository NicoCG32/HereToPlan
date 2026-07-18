import { describe, expect, it } from "vitest";
import {
  Agenda,
  FechaLocal,
  PoliticaCompromiso,
  Tarea,
  resolverPoliticaEfectiva,
} from "../src/dominio";
import {
  convertirAgendaEnV1,
  rehidratarAgendaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorAgendaV1";
import {
  convertirActividadEnV1,
  rehidratarActividadDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorActividadV1";
import type { AgendaV1 } from "../src/infraestructura/persistencia/registros/AgendaV1";
import { esperarErrorDominio } from "./esperarErrorDominio";

const CREADA_EN = new Date("2026-07-20T10:00:00.000Z");

describe("políticas efectivas", () => {
  it("resuelve precedencia explícita, actividad y agenda mediante copias", () => {
    const agenda = flexible(["EXCUSAR"]);
    const actividad = flexible(["REPROGRAMAR"]);
    const explicita = estricta();

    expect(
      resolverPoliticaEfectiva({ agenda, actividad, explicita }).obtenerVista(),
    ).toMatchObject({ rigidez: "ESTRICTO", ajustesPermitidos: [] });
    expect(
      resolverPoliticaEfectiva({ agenda, actividad }).obtenerVista(),
    ).toMatchObject({
      rigidez: "FLEXIBLE",
      ajustesPermitidos: ["REPROGRAMAR"],
    });
    expect(resolverPoliticaEfectiva({ agenda }).obtenerVista()).toMatchObject({
      ajustesPermitidos: ["EXCUSAR"],
    });
    esperarErrorDominio("POLITICA_EFECTIVA_AUSENTE", () =>
      resolverPoliticaEfectiva({}),
    );
  });

  it("permite que agenda y actividad propongan valores predeterminados", () => {
    const politicaAgenda = flexible(["EXCUSAR"]);
    const politicaActividad = estricta();
    const agenda = crearAgenda(politicaAgenda);
    const tarea = new Tarea({
      id: "tarea-1",
      titulo: "Entrega externa",
      tipo: "TAREA_SIMPLE",
      tiempoNecesarioMinutos: 60,
      politicaPredeterminada: politicaActividad,
      creadaEn: CREADA_EN,
    });

    expect(agenda.obtenerPoliticaPredeterminada()).toMatchObject({
      rigidez: "FLEXIBLE",
    });
    expect(tarea.obtenerPoliticaPredeterminada()).toMatchObject({
      rigidez: "ESTRICTO",
    });
    expect(
      rehidratarActividadDesdeV1(
        convertirActividadEnV1(tarea),
      ).obtenerPoliticaPredeterminada(),
    ).toMatchObject({ versionEsquema: 1, rigidez: "ESTRICTO" });
  });

  it("conserva una instantánea versionada al confirmar y persistir", () => {
    const ajustes = ["EXCUSAR"] as const;
    const politica = flexible(ajustes);
    const agenda = crearAgenda();
    agenda.agregarBloque({
      id: "bloque-1",
      actividadId: "actividad-1",
      titulo: "Bloque",
      fecha: FechaLocal.crear("2026-07-21"),
      minutosPlanificados: 60,
      politica,
    });
    agenda.confirmar(new Date("2026-07-20T12:00:00.000Z"));

    const registro = convertirAgendaEnV1(agenda);
    expect(registro.bloques[0]?.politica).toEqual({
      versionEsquema: 1,
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["EXCUSAR"],
    });
    expect(
      rehidratarAgendaDesdeV1(registro).listarBloques()[0]?.politica,
    ).toEqual(registro.bloques[0]?.politica);
  });

  it("rehidrata instantáneas legadas sin versión y rechaza versiones futuras", () => {
    const agenda = crearAgenda();
    agenda.agregarBloque({
      id: "bloque-1",
      actividadId: "actividad-1",
      titulo: "Bloque",
      fecha: FechaLocal.crear("2026-07-21"),
      minutosPlanificados: 30,
      politica: estricta(),
    });
    const registro = convertirAgendaEnV1(agenda);
    const politica = { ...registro.bloques[0]!.politica } as Record<
      string,
      unknown
    >;
    delete politica.versionEsquema;
    const legado = {
      ...registro,
      bloques: [{ ...registro.bloques[0]!, politica }],
    } as unknown as AgendaV1;

    expect(
      rehidratarAgendaDesdeV1(legado).listarBloques()[0]?.politica,
    ).toMatchObject({ versionEsquema: 1, rigidez: "ESTRICTO" });

    const futura = {
      ...registro,
      bloques: [
        {
          ...registro.bloques[0]!,
          politica: { ...registro.bloques[0]!.politica, versionEsquema: 2 },
        },
      ],
    } as unknown as AgendaV1;
    expect(() => rehidratarAgendaDesdeV1(futura)).toThrow(
      "La versión 2 de la política no está soportada.",
    );
  });
});

function crearAgenda(politicaPredeterminada?: PoliticaCompromiso): Agenda {
  return new Agenda({
    id: "agenda-1",
    nombre: "Agenda",
    fechaInicio: FechaLocal.crear("2026-07-20"),
    fechaFin: FechaLocal.crear("2026-07-31"),
    creadaEn: CREADA_EN,
    ...(politicaPredeterminada ? { politicaPredeterminada } : {}),
  });
}

function estricta(): PoliticaCompromiso {
  return new PoliticaCompromiso({
    rigidez: "ESTRICTO",
    autoridadPlazo: "EXTERNA",
  });
}

function flexible(
  ajustesPermitidos: readonly (
    "EXCUSAR" | "REPROGRAMAR" | "EXTENDER_PLAZO" | "REDUCIR_CARGA"
  )[] = [],
): PoliticaCompromiso {
  return new PoliticaCompromiso({
    rigidez: "FLEXIBLE",
    autoridadPlazo: "PERSONAL",
    ajustesPermitidos,
  });
}
