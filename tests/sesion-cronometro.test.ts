import { describe, expect, it } from "vitest";
import { ErrorDominio, SesionCronometro } from "../src/dominio";

const inicio = new Date("2026-07-20T10:00:00.000Z");

describe("SesionCronometro", () => {
  it("deriva la duración de intervalos activos separados por pausas", () => {
    const sesion = SesionCronometro.iniciar({
      id: "sesion-1",
      bloqueId: "bloque-1",
      operacionId: "operacion-iniciar",
      iniciadaEn: inicio,
    });

    expect(
      sesion.duracionMilisegundos(new Date("2026-07-20T10:10:00.000Z")),
    ).toBe(10 * 60 * 1000);
    sesion.pausar("operacion-pausar", new Date("2026-07-20T10:10:00.000Z"));
    expect(
      sesion.duracionMilisegundos(new Date("2026-07-20T10:30:00.000Z")),
    ).toBe(10 * 60 * 1000);
    sesion.reanudar("operacion-reanudar", new Date("2026-07-20T10:30:00.000Z"));
    sesion.detener("operacion-detener", new Date("2026-07-20T10:50:00.000Z"));

    expect(sesion.estado).toBe("FINALIZADA");
    expect(sesion.duracionMilisegundos(new Date("2030-01-01"))).toBe(
      30 * 60 * 1000,
    );
    expect(sesion.listarIntervalos()).toHaveLength(2);
  });

  it("hace idempotente una orden idéntica y rechaza su reutilización", () => {
    const sesion = crearSesion();
    const instante = new Date("2026-07-20T10:10:00.000Z");

    expect(sesion.pausar("operacion-pausar", instante)).toBe(true);
    expect(sesion.pausar("operacion-pausar", instante)).toBe(false);
    esperarCodigo("OPERACION_CRONOMETRO_CONFLICTIVA", () =>
      sesion.reanudar("operacion-pausar", instante),
    );
    expect(sesion.revision).toBe(2);
  });

  it("rechaza transiciones imposibles, retrocesos y reapertura", () => {
    const sesion = crearSesion();

    esperarCodigo("TRANSICION_CRONOMETRO_INVALIDA", () =>
      sesion.reanudar("operacion-reanudar", inicio),
    );
    esperarCodigo("ORDEN_TEMPORAL_CRONOMETRO_INVALIDO", () =>
      sesion.pausar("operacion-pausar", new Date("2026-07-20T09:59:59.999Z")),
    );
    sesion.detener("operacion-detener", inicio);
    esperarCodigo("TRANSICION_CRONOMETRO_INVALIDA", () =>
      sesion.reanudar("operacion-reabrir", inicio),
    );
  });
});

function crearSesion(): SesionCronometro {
  return SesionCronometro.iniciar({
    id: "sesion-1",
    bloqueId: "bloque-1",
    operacionId: "operacion-iniciar",
    iniciadaEn: inicio,
  });
}

function esperarCodigo(codigo: string, operacion: () => unknown): void {
  try {
    operacion();
    throw new Error(`Se esperaba ${codigo}.`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ErrorDominio);
    expect((error as ErrorDominio).codigo).toBe(codigo);
  }
}
