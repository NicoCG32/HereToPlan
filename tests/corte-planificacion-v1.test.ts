import { describe, expect, it } from "vitest";
import {
  convertirCortePlanificacionEnV1,
  ErrorMapeoCortePlanificacionV1,
  rehidratarCortePlanificacionDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorCortePlanificacionV1";
import type { CortePlanificacionV1 } from "../src/infraestructura/persistencia/registros/CortePlanificacionV1";
import {
  CORTE_ASIGNADO_EN,
  CORTE_CONFIRMAR_EN,
  crearCorteEnGracia,
} from "./contratoRepositorioCortesPlanificacion";

describe("CortePlanificacionV1", () => {
  it("serializa la gracia como un registro plano, versionado e inmutable", () => {
    const registro = convertirCortePlanificacionEnV1(
      crearCorteEnGracia("corte-1"),
    );

    expect(registro).toMatchObject({
      versionEsquema: 1,
      id: "corte-1",
      estado: "EN_GRACIA",
      asignadaEn: CORTE_ASIGNADO_EN.toISOString(),
      confirmarAutomaticamenteEn: CORTE_CONFIRMAR_EN.toISOString(),
      bloques: [{ versionEsquema: 1, fecha: "2026-07-20" }],
    });
    expect(registro.confirmadaEn).toBeUndefined();
    expect(Object.isFrozen(registro)).toBe(true);
    expect(Object.isFrozen(registro.bloques)).toBe(true);
    expect(Object.isFrozen(registro.bloques[0])).toBe(true);
  });

  it("rehidrata los instantes sin reiniciar ni extender la gracia", () => {
    const original = convertirCortePlanificacionEnV1(
      crearCorteEnGracia("corte-1"),
    );
    const registroPlano = JSON.parse(
      JSON.stringify(original),
    ) as CortePlanificacionV1;

    const rehidratado = rehidratarCortePlanificacionDesdeV1(registroPlano);

    expect(rehidratado.asignadaEn?.toISOString()).toBe(
      CORTE_ASIGNADO_EN.toISOString(),
    );
    expect(rehidratado.confirmarAutomaticamenteEn?.toISOString()).toBe(
      CORTE_CONFIRMAR_EN.toISOString(),
    );
    expect(convertirCortePlanificacionEnV1(rehidratado)).toEqual(original);
  });

  it("conserva una confirmación materializada en el vencimiento previsto", () => {
    const corte = crearCorteEnGracia("corte-confirmado");
    corte.actualizarSegunReloj(new Date("2026-07-20T11:00:00.000Z"));

    const registro = convertirCortePlanificacionEnV1(corte);
    const rehidratado = rehidratarCortePlanificacionDesdeV1(registro);

    expect(registro.estado).toBe("CONFIRMADA");
    expect(registro.confirmadaEn).toBe(CORTE_CONFIRMAR_EN.toISOString());
    expect(rehidratado.confirmadaEn?.toISOString()).toBe(
      CORTE_CONFIRMAR_EN.toISOString(),
    );
  });

  it("rechaza versiones desconocidas del corte o de sus instantáneas", () => {
    const registro = convertirCortePlanificacionEnV1(
      crearCorteEnGracia("corte-1"),
    );
    const corteIncompatible = {
      ...registro,
      versionEsquema: 2,
    } as unknown as CortePlanificacionV1;
    const bloqueIncompatible = {
      ...registro,
      bloques: [{ ...registro.bloques[0]!, versionEsquema: 2 }],
    } as unknown as CortePlanificacionV1;

    esperarErrorMapeo("VERSION_CORTE_PLANIFICACION_NO_SOPORTADA", () =>
      rehidratarCortePlanificacionDesdeV1(corteIncompatible),
    );
    esperarErrorMapeo("REGISTRO_CORTE_PLANIFICACION_INVALIDO", () =>
      rehidratarCortePlanificacionDesdeV1(bloqueIncompatible),
    );
  });

  it("rechaza instantes no normalizados y ventanas incoherentes", () => {
    const registro = convertirCortePlanificacionEnV1(
      crearCorteEnGracia("corte-1"),
    );
    const noNormalizado = {
      ...registro,
      asignadaEn: "2026-07-20T06:00:00-04:00",
    };
    const ventanaExtendida = {
      ...registro,
      confirmarAutomaticamenteEn: "2026-07-20T10:11:00.000Z",
    };

    esperarErrorMapeo("REGISTRO_CORTE_PLANIFICACION_INVALIDO", () =>
      rehidratarCortePlanificacionDesdeV1(noNormalizado),
    );
    esperarErrorMapeo("REGISTRO_CORTE_PLANIFICACION_INVALIDO", () =>
      rehidratarCortePlanificacionDesdeV1(ventanaExtendida),
    );
  });
});

function esperarErrorMapeo(
  codigo: ErrorMapeoCortePlanificacionV1["codigo"],
  operacion: () => unknown,
): void {
  try {
    operacion();
    throw new Error(`Se esperaba el error de mapeo ${codigo}.`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ErrorMapeoCortePlanificacionV1);
    expect((error as ErrorMapeoCortePlanificacionV1).codigo).toBe(codigo);
  }
}
