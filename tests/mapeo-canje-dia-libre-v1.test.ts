import { describe, expect, it } from "vitest";
import { AjusteCompromiso, CanjeRecompensa, FechaLocal } from "../src/dominio";
import {
  convertirAjusteCompromisoEnV1,
  ErrorMapeoAjusteCompromisoV1,
  rehidratarAjusteCompromisoDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorAjusteCompromisoV1";
import {
  convertirCanjeRecompensaEnV1,
  ErrorMapeoCanjeRecompensaV1,
  rehidratarCanjeRecompensaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorCanjeRecompensaV1";
import type { AjusteCompromisoV1 } from "../src/infraestructura/persistencia/registros/AjusteCompromisoV1";
import type { CanjeRecompensaV1 } from "../src/infraestructura/persistencia/registros/CanjeRecompensaV1";

const INSTANTE = new Date("2026-07-20T12:30:00.000Z");

describe("persistencia V1 del canje de día libre", () => {
  it("serializa y rehidrata el canje como un registro plano e inmutable", () => {
    const original = new CanjeRecompensa({
      id: "canje-1",
      recompensaId: "dia-libre",
      puntosGastados: 1500,
      canjeadoEn: INSTANTE,
      fechaObjetivo: FechaLocal.crear("2026-07-21"),
      bloquesAfectados: ["bloque-1", "bloque-2"],
    });

    const registro = convertirCanjeRecompensaEnV1(original);
    const rehidratado = rehidratarCanjeRecompensaDesdeV1(registro);

    expect(registro).toEqual({
      versionEsquema: 1,
      id: "canje-1",
      recompensaId: "dia-libre",
      puntosGastados: 1500,
      canjeadoEn: INSTANTE.toISOString(),
      fechaObjetivo: "2026-07-21",
      bloquesAfectados: ["bloque-1", "bloque-2"],
    });
    expect(Object.isFrozen(registro)).toBe(true);
    expect(Object.isFrozen(registro.bloquesAfectados)).toBe(true);
    expect(convertirCanjeRecompensaEnV1(rehidratado)).toEqual(registro);
  });

  it("rechaza versiones, instantes y datos de dominio inválidos del canje", () => {
    const registro = convertirCanjeRecompensaEnV1(
      new CanjeRecompensa({
        id: "canje-1",
        recompensaId: "dia-libre",
        puntosGastados: 1500,
        canjeadoEn: INSTANTE,
        fechaObjetivo: FechaLocal.crear("2026-07-21"),
        bloquesAfectados: ["bloque-1"],
      }),
    );

    esperarErrorCanje(
      () =>
        rehidratarCanjeRecompensaDesdeV1({
          ...registro,
          versionEsquema: 2,
        } as unknown as CanjeRecompensaV1),
      "versión 2",
    );
    esperarErrorCanje(() =>
      rehidratarCanjeRecompensaDesdeV1({
        ...registro,
        canjeadoEn: "2026-07-20T08:30:00-04:00",
      }),
    );
    esperarErrorCanje(() =>
      rehidratarCanjeRecompensaDesdeV1({
        ...registro,
        bloquesAfectados: [],
      }),
    );
  });

  it("serializa y rehidrata el ajuste que vincula bloque y canje", () => {
    const original = new AjusteCompromiso({
      id: "ajuste-1",
      bloqueId: "bloque-1",
      canjeRecompensaId: "canje-1",
      tipo: "EXCUSAR",
      aplicadoEn: INSTANTE,
    });

    const registro = convertirAjusteCompromisoEnV1(original);
    const rehidratado = rehidratarAjusteCompromisoDesdeV1(registro);

    expect(registro).toEqual({
      versionEsquema: 1,
      id: "ajuste-1",
      bloqueId: "bloque-1",
      canjeRecompensaId: "canje-1",
      tipo: "EXCUSAR",
      aplicadoEn: INSTANTE.toISOString(),
    });
    expect(Object.isFrozen(registro)).toBe(true);
    expect(convertirAjusteCompromisoEnV1(rehidratado)).toEqual(registro);
  });

  it("rechaza versiones, instantes y tipos inválidos del ajuste", () => {
    const registro = convertirAjusteCompromisoEnV1(
      new AjusteCompromiso({
        id: "ajuste-1",
        bloqueId: "bloque-1",
        canjeRecompensaId: "canje-1",
        tipo: "EXCUSAR",
        aplicadoEn: INSTANTE,
      }),
    );

    esperarErrorAjuste(
      () =>
        rehidratarAjusteCompromisoDesdeV1({
          ...registro,
          versionEsquema: 2,
        } as unknown as AjusteCompromisoV1),
      "versión 2",
    );
    esperarErrorAjuste(() =>
      rehidratarAjusteCompromisoDesdeV1({
        ...registro,
        aplicadoEn: "fecha-inválida",
      }),
    );
    esperarErrorAjuste(() =>
      rehidratarAjusteCompromisoDesdeV1({
        ...registro,
        tipo: "DESCONOCIDO",
      } as unknown as AjusteCompromisoV1),
    );
  });
});

function esperarErrorCanje(operacion: () => unknown, mensaje?: string): void {
  expect(operacion).toThrow(ErrorMapeoCanjeRecompensaV1);
  if (mensaje !== undefined) {
    expect(operacion).toThrow(mensaje);
  }
}

function esperarErrorAjuste(operacion: () => unknown, mensaje?: string): void {
  expect(operacion).toThrow(ErrorMapeoAjusteCompromisoV1);
  if (mensaje !== undefined) {
    expect(operacion).toThrow(mensaje);
  }
}
