import { describe, expect, it, vi } from "vitest";
import {
  CasoDeUsoPrepararRestauracionRespaldo,
  CasoDeUsoRestaurarRespaldo,
  COLECCIONES_RESPALDO,
  COLECCIONES_RESPALDO_V1,
  ErrorConfirmacionRestauracionRespaldo,
  ErrorPreparacionRestauracionRespaldo,
  ErrorRestauracionRespaldo,
  RUTA_MIGRACION_RESPALDO_V1,
  RUTA_MIGRACION_RESPALDO_V2,
} from "../src/aplicacion";

describe("restauración de respaldos", () => {
  it("prepara la ruta V1 y congela el estado que será restaurado", () => {
    const documento = respaldoV1();
    documento.contenido["contextos-planificacion"] = [
      {
        versionEsquema: 1,
        id: "contexto-1",
        nombre: "Semestre",
        tipo: "NOMBRADO",
        creadaEn: "2026-07-01T10:00:00.000Z",
        configuracion: { dias: ["lunes", "martes"] },
      },
    ];

    const plan = new CasoDeUsoPrepararRestauracionRespaldo().ejecutar(
      JSON.stringify(documento),
    );

    expect(plan.rutaMigracion).toBe(RUTA_MIGRACION_RESPALDO_V1);
    expect(plan.totalRegistros).toBe(1);
    expect(plan.versionBaseDatosOrigen).toBe(10);
    expect(plan.estadoDestino.colecciones["perfil-usuario"]).toEqual([]);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.estadoDestino.colecciones)).toBe(true);
    expect(
      Object.isFrozen(
        plan.estadoDestino.colecciones["contextos-planificacion"][0]
          ?.configuracion,
      ),
    ).toBe(true);
  });

  it("prepara V2 conservando el perfil local respaldado", () => {
    const documento = respaldoV1();
    documento.versionFormato = 2;
    documento.contenido = Object.fromEntries(
      COLECCIONES_RESPALDO.map((coleccion) => [coleccion, []]),
    );
    documento.contenido["perfil-usuario"] = [
      {
        versionEsquema: 1,
        id: "perfil-local",
        nombreVisible: "Nicolás",
        creadoEn: "2026-07-21T10:00:00.000Z",
        actualizadoEn: "2026-07-21T10:00:00.000Z",
      },
    ];

    const plan = new CasoDeUsoPrepararRestauracionRespaldo().ejecutar(
      JSON.stringify(documento),
    );

    expect(plan.rutaMigracion).toBe(RUTA_MIGRACION_RESPALDO_V2);
    expect(plan.estadoDestino.colecciones["perfil-usuario"]).toHaveLength(1);
  });

  it("rechaza versiones futuras cuando no existe una ruta de migración", () => {
    const documento = respaldoV1();
    documento.versionFormato = 3;

    expect(() =>
      new CasoDeUsoPrepararRestauracionRespaldo().ejecutar(
        JSON.stringify(documento),
      ),
    ).toThrowError(ErrorPreparacionRestauracionRespaldo);
  });

  it("no toca la persistencia cuando la confirmación no coincide", async () => {
    const reemplazarEstadoCompleto = vi.fn();
    const plan = new CasoDeUsoPrepararRestauracionRespaldo().ejecutar(
      JSON.stringify(respaldoV1()),
    );

    await expect(
      new CasoDeUsoRestaurarRespaldo({ reemplazarEstadoCompleto }).ejecutar({
        plan,
        confirmacion: "restaurar",
      }),
    ).rejects.toBeInstanceOf(ErrorConfirmacionRestauracionRespaldo);
    expect(reemplazarEstadoCompleto).not.toHaveBeenCalled();
  });

  it("delega una sola sustitución y conserva la ruta en el resultado", async () => {
    const reemplazarEstadoCompleto = vi.fn().mockResolvedValue(undefined);
    const plan = new CasoDeUsoPrepararRestauracionRespaldo().ejecutar(
      JSON.stringify(respaldoV1()),
    );

    const resultado = await new CasoDeUsoRestaurarRespaldo({
      reemplazarEstadoCompleto,
    }).ejecutar({ plan, confirmacion: "RESTAURAR" });

    expect(reemplazarEstadoCompleto).toHaveBeenCalledOnce();
    expect(reemplazarEstadoCompleto).toHaveBeenCalledWith(plan.estadoDestino);
    expect(resultado).toEqual({
      totalRegistros: 0,
      rutaMigracion: RUTA_MIGRACION_RESPALDO_V1,
    });
  });

  it("expone el fallo del puerto como una restauración no aplicada", async () => {
    const causa = new Error("transacción abortada");
    const plan = new CasoDeUsoPrepararRestauracionRespaldo().ejecutar(
      JSON.stringify(respaldoV1()),
    );

    await expect(
      new CasoDeUsoRestaurarRespaldo({
        reemplazarEstadoCompleto: () => Promise.reject(causa),
      }).ejecutar({ plan, confirmacion: "RESTAURAR" }),
    ).rejects.toMatchObject({
      name: "ErrorRestauracionRespaldo",
      causa,
    } satisfies Partial<ErrorRestauracionRespaldo>);
  });
});

interface DocumentoRespaldoMutable {
  formato: string;
  versionFormato: number;
  creadoEn: string;
  origen: { aplicacion: string; versionBaseDatos: number };
  contenido: Record<string, unknown[]>;
}

function respaldoV1(): DocumentoRespaldoMutable {
  return {
    formato: "HereToPlan.respaldo",
    versionFormato: 1,
    creadoEn: "2026-07-20T15:30:00.000Z",
    origen: { aplicacion: "HereToPlan", versionBaseDatos: 10 },
    contenido: Object.fromEntries(
      COLECCIONES_RESPALDO_V1.map((coleccion) => [coleccion, []]),
    ),
  };
}
