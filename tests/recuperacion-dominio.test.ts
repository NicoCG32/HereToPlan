import { describe, expect, it } from "vitest";
import {
  BancoRecuperacion,
  ConfiguracionRecuperacion,
  FechaLocal,
  MovimientoRecuperacion,
  ReduccionCarga,
} from "../src/dominio";
import {
  convertirMovimientoRecuperacionEnV1,
  ErrorMapeoMovimientoRecuperacionV1,
  rehidratarMovimientoRecuperacionDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorMovimientoRecuperacionV1";
import {
  convertirReduccionCargaEnV1,
  ErrorMapeoReduccionCargaV1,
  rehidratarReduccionCargaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorReduccionCargaV1";

describe("economía de recuperación", () => {
  it("calcula una tasa racional y aplica los topes disponibles", () => {
    const configuracion = new ConfiguracionRecuperacion({
      numeradorTasa: 1,
      denominadorTasa: 2,
      maximoDiarioMinutos: 120,
      maximoSemanalMinutos: 300,
    });

    expect(configuracion.calcularAcreditacion(101, 0, 0)).toBe(50);
    expect(configuracion.calcularAcreditacion(100, 90, 90)).toBe(30);
    expect(configuracion.calcularAcreditacion(100, 0, 280)).toBe(20);
    expect(configuracion.calcularAcreditacion(20, 120, 120)).toBe(0);
    configuracion.exigirCapacidadParaAcreditar(30, 90, 200);
    esperarCodigo("TOPE_RECUPERACION_EXCEDIDO", () =>
      configuracion.exigirCapacidadParaAcreditar(31, 90, 200),
    );
  });

  it.each([
    [
      {
        numeradorTasa: 0,
        denominadorTasa: 2,
        maximoDiarioMinutos: 1,
        maximoSemanalMinutos: 1,
      },
      "NUMERADOR_TASA_RECUPERACION_INVALIDO",
    ],
    [
      {
        numeradorTasa: 2,
        denominadorTasa: 1,
        maximoDiarioMinutos: 1,
        maximoSemanalMinutos: 1,
      },
      "TASA_RECUPERACION_EXCESIVA",
    ],
    [
      {
        numeradorTasa: 1,
        denominadorTasa: 2,
        maximoDiarioMinutos: 3,
        maximoSemanalMinutos: 2,
      },
      "TOPES_RECUPERACION_INCOHERENTES",
    ],
  ])("rechaza configuración incoherente", (datos, codigo) => {
    esperarCodigo(codigo, () => new ConfiguracionRecuperacion(datos));
  });

  it("mantiene saldo no negativo e impide duplicar operación o fuente", () => {
    const banco = new BancoRecuperacion();
    banco.registrar(crearMovimiento("m-1", "op-1", "ACREDITACION", 45, "b-1"));
    banco.registrar(crearMovimiento("m-2", "op-2", "CONSUMO", 20, "b-2"));
    expect(banco.saldoMinutos).toBe(25);
    expect(banco.listarMovimientos()).toHaveLength(2);
    esperarCodigo("OPERACION_RECUPERACION_DUPLICADA", () =>
      banco.registrar(crearMovimiento("m-3", "op-1", "CONSUMO", 1, "b-3")),
    );
    esperarCodigo("FUENTE_RECUPERACION_DUPLICADA", () =>
      banco.registrar(crearMovimiento("m-4", "op-4", "ACREDITACION", 1, "b-1")),
    );
    esperarCodigo("SALDO_RECUPERACION_INSUFICIENTE", () =>
      banco.registrar(crearMovimiento("m-5", "op-5", "CONSUMO", 30, "b-5")),
    );
  });

  it("rehidrata movimientos y reducciones versionados", () => {
    const movimiento = crearMovimiento("m-1", "op-1", "CONSUMO", 15, "b-1");
    const reduccion = new ReduccionCarga({
      id: "r-1",
      operacionId: "op-1",
      movimientoId: "m-1",
      bloqueId: "b-1",
      minutosReducidos: 15,
      aplicadaEn: new Date("2026-07-20T12:00:00.000Z"),
    });

    expect(
      rehidratarMovimientoRecuperacionDesdeV1(
        convertirMovimientoRecuperacionEnV1(movimiento),
      ),
    ).toMatchObject({ id: "m-1", minutos: 15, tipo: "CONSUMO" });
    expect(
      rehidratarReduccionCargaDesdeV1(convertirReduccionCargaEnV1(reduccion)),
    ).toMatchObject({ id: "r-1", minutosReducidos: 15 });
  });

  it("rechaza registros incompatibles o con instantes no normalizados", () => {
    expect(() =>
      rehidratarMovimientoRecuperacionDesdeV1({
        ...convertirMovimientoRecuperacionEnV1(
          crearMovimiento("m-1", "op-1", "ACREDITACION", 10, "b-1"),
        ),
        versionEsquema: 2 as 1,
      }),
    ).toThrow(ErrorMapeoMovimientoRecuperacionV1);
    expect(() =>
      rehidratarReduccionCargaDesdeV1({
        versionEsquema: 1,
        id: "r-1",
        operacionId: "op-1",
        movimientoId: "m-1",
        bloqueId: "b-1",
        minutosReducidos: 10,
        aplicadaEn: "ayer",
      }),
    ).toThrow(ErrorMapeoReduccionCargaV1);
  });
});

function crearMovimiento(
  id: string,
  operacionId: string,
  tipo: "ACREDITACION" | "CONSUMO",
  minutos: number,
  bloqueFuenteId: string,
): MovimientoRecuperacion {
  return new MovimientoRecuperacion({
    id,
    operacionId,
    tipo,
    minutos,
    bloqueFuenteId,
    fechaFuente: FechaLocal.crear("2026-07-20"),
    descripcion: "Movimiento verificable",
    ocurridoEn: new Date("2026-07-20T12:00:00.000Z"),
  });
}

function esperarCodigo(codigo: string, operacion: () => unknown): void {
  try {
    operacion();
    throw new Error(`Se esperaba ${codigo}.`);
  } catch (error: unknown) {
    expect(error).toMatchObject({ codigo });
  }
}
