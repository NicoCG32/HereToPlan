import { describe, expect, it } from "vitest";
import {
  Actividad,
  FechaLocal,
  Habito,
  PoliticaCompromiso,
  Tarea,
} from "../src/dominio";
import {
  convertirActividadEnV1,
  ErrorMapeoActividadV1,
  rehidratarActividadDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorActividadV1";
import type { ActividadV1 } from "../src/infraestructura/persistencia/registros/ActividadV1";

const CREADA_EN = new Date("2026-07-20T10:00:00.000Z");

describe("ActividadV1", () => {
  it("serializa y rehidrata una tarea resuelta con todos sus metadatos", () => {
    const tarea = new Tarea({
      id: "proyecto-1",
      titulo: "Preparar publicación",
      tipo: "PROYECTO",
      descripcion: "Coordinar la entrega completa",
      tiempoNecesarioMinutos: 240,
      fechaLimite: FechaLocal.crear("2026-08-15"),
      subtareasIds: ["tarea-1", "tarea-2"],
      creadaEn: CREADA_EN,
      politicaPredeterminada: new PoliticaCompromiso({
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: ["EXCUSAR", "EXTENDER_PLAZO"],
      }),
    });
    tarea.marcarNoCompletada(new Date("2026-08-16T09:00:00.000Z"));

    const registro = convertirActividadEnV1(tarea);
    const rehidratada = rehidratarActividadDesdeV1(clonarRegistro(registro));

    expect(registro).toEqual({
      versionEsquema: 1,
      id: "proyecto-1",
      titulo: "Preparar publicación",
      tipo: "PROYECTO",
      descripcion: "Coordinar la entrega completa",
      tiempoNecesarioMinutos: 240,
      fechaLimite: "2026-08-15",
      subtareasIds: ["tarea-1", "tarea-2"],
      creadaEn: "2026-07-20T10:00:00.000Z",
      politicaPredeterminada: {
        versionEsquema: 1,
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: ["EXCUSAR", "EXTENDER_PLAZO"],
      },
      estado: "NO_COMPLETADA",
      resueltaEn: "2026-08-16T09:00:00.000Z",
    });
    expect(rehidratada).toBeInstanceOf(Tarea);
    expect(convertirActividadEnV1(rehidratada)).toEqual(registro);
  });

  it("serializa y rehidrata un hábito personalizado", () => {
    const habito = new Habito({
      id: "habito-1",
      titulo: "Practicar escritura",
      descripcion: "Mantener una práctica semanal",
      tiempoNecesarioMinutos: 30,
      frecuencia: "PERSONALIZADA",
      diasSemana: [5, 1, 3],
      creadaEn: CREADA_EN,
      politicaPredeterminada: new PoliticaCompromiso({
        rigidez: "ESTRICTO",
        autoridadPlazo: "PERSONAL",
      }),
    });

    const registro = convertirActividadEnV1(habito);
    const rehidratada = rehidratarActividadDesdeV1(clonarRegistro(registro));

    expect(registro).toMatchObject({
      tipo: "HABITO",
      frecuencia: "PERSONALIZADA",
      diasSemana: [1, 3, 5],
    });
    expect(rehidratada).toBeInstanceOf(Habito);
    expect(convertirActividadEnV1(rehidratada)).toEqual(registro);
  });

  it("rechaza versiones futuras sin intentar rehidratarlas", () => {
    const registro = {
      ...convertirActividadEnV1(crearTareaPendiente()),
      versionEsquema: 2,
    } as unknown as ActividadV1;

    esperarErrorMapeo("VERSION_ACTIVIDAD_NO_SOPORTADA", () =>
      rehidratarActividadDesdeV1(registro),
    );
  });

  it("rechaza instantes no normalizados e invariantes incoherentes", () => {
    const base = convertirActividadEnV1(crearTareaPendiente());
    const instanteInvalido = {
      ...base,
      creadaEn: "20-07-2026",
    } as ActividadV1;
    const resolucionIncoherente = {
      ...base,
      estado: "PENDIENTE",
      resueltaEn: "2026-07-21T10:00:00.000Z",
    } as ActividadV1;

    esperarErrorMapeo("REGISTRO_ACTIVIDAD_INVALIDO", () =>
      rehidratarActividadDesdeV1(instanteInvalido),
    );
    esperarErrorMapeo("REGISTRO_ACTIVIDAD_INVALIDO", () =>
      rehidratarActividadDesdeV1(resolucionIncoherente),
    );
  });

  it("rechaza subtipos de actividad sin contrato persistido", () => {
    const actividad = new ActividadSinRegistro();

    esperarErrorMapeo("REGISTRO_ACTIVIDAD_INVALIDO", () =>
      convertirActividadEnV1(actividad),
    );
  });
});

class ActividadSinRegistro extends Actividad {
  constructor() {
    super({
      id: "actividad-sin-registro",
      titulo: "Actividad sin representación persistida",
      tipo: "HABITO",
      creadaEn: CREADA_EN,
    });
  }
}

function crearTareaPendiente(): Tarea {
  return new Tarea({
    id: "tarea-1",
    titulo: "Tarea pendiente",
    tipo: "TAREA_SIMPLE",
    tiempoNecesarioMinutos: 45,
    creadaEn: CREADA_EN,
  });
}

function clonarRegistro(registro: ActividadV1): ActividadV1 {
  return JSON.parse(JSON.stringify(registro)) as ActividadV1;
}

function esperarErrorMapeo(
  codigo: ErrorMapeoActividadV1["codigo"],
  operacion: () => unknown,
): void {
  try {
    operacion();
    throw new Error(`Se esperaba el error de mapeo ${codigo}.`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ErrorMapeoActividadV1);
    expect((error as ErrorMapeoActividadV1).codigo).toBe(codigo);
  }
}
