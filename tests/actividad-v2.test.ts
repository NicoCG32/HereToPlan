import { describe, expect, it } from "vitest";
import { Tarea } from "../src/dominio";
import {
  convertirActividadEnV2,
  ErrorMapeoActividadV2,
  migrarActividadV1AV2,
  rehidratarActividadDesdeV2,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorActividadV2";
import type { ActividadV1 } from "../src/infraestructura/persistencia/registros/ActividadV1";
import type { ActividadV2 } from "../src/infraestructura/persistencia/registros/ActividadV2";

describe("ActividadV2", () => {
  it("persiste y rehidrata el modo sin inferirlo desde el tipo", () => {
    const registro = convertirActividadEnV2(crearTareaCronometrada());
    const rehidratada = rehidratarActividadDesdeV2(clonar(registro));

    expect(registro).toMatchObject({
      versionEsquema: 2,
      tipo: "TAREA_SIMPLE",
      modoSeguimiento: "CRONOMETRADO",
    });
    expect(rehidratada.modoSeguimiento).toBe("CRONOMETRADO");
  });

  it("migra una actividad heredada a manual sin alterar sus demás datos", () => {
    const legado: ActividadV1 = {
      versionEsquema: 1,
      id: "legada",
      titulo: "Actividad legada",
      tipo: "PROYECTO",
      tiempoNecesarioMinutos: 90,
      subtareasIds: ["paso-1"],
      estado: "NO_COMPLETADA",
      resueltaEn: "2026-07-21T10:00:00.000Z",
      creadaEn: "2026-07-20T10:00:00.000Z",
      politicaPredeterminada: {
        versionEsquema: 1,
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: ["REPROGRAMAR"],
      },
    };

    expect(migrarActividadV1AV2(legado)).toEqual({
      ...legado,
      versionEsquema: 2,
      modoSeguimiento: "MANUAL",
    });
  });

  it("rechaza modos desconocidos antes de construir una entidad parcial", () => {
    const invalido = {
      ...convertirActividadEnV2(crearTareaCronometrada()),
      modoSeguimiento: "AUTOMATICO",
    } as unknown as ActividadV2;

    try {
      rehidratarActividadDesdeV2(invalido);
      throw new Error("Se esperaba rechazar el modo desconocido.");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ErrorMapeoActividadV2);
      expect((error as ErrorMapeoActividadV2).codigo).toBe(
        "MODO_SEGUIMIENTO_INVALIDO",
      );
    }
  });
});

function crearTareaCronometrada(): Tarea {
  return new Tarea({
    id: "tarea-cronometrada",
    titulo: "Redactar informe",
    tipo: "TAREA_SIMPLE",
    modoSeguimiento: "CRONOMETRADO",
    tiempoNecesarioMinutos: 45,
    creadaEn: new Date("2026-07-20T10:00:00.000Z"),
  });
}

function clonar(registro: ActividadV2): ActividadV2 {
  return JSON.parse(JSON.stringify(registro)) as ActividadV2;
}
