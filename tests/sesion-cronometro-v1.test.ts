import { describe, expect, it } from "vitest";
import { SesionCronometro } from "../src/dominio";
import {
  convertirSesionCronometroEnV1,
  ErrorMapeoSesionCronometroV1,
  rehidratarSesionCronometroDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorSesionCronometroV1";
import type { SesionCronometroV1 } from "../src/infraestructura/persistencia/registros/SesionCronometroV1";

const inicio = new Date("2026-07-20T10:00:00.000Z");

describe("SesionCronometroV1", () => {
  it("serializa operaciones, revisión e índice como datos inmutables", () => {
    const sesion = crearSesion();
    sesion.pausar("operacion-pausar", new Date("2026-07-20T10:15:00.000Z"));

    const registro = convertirSesionCronometroEnV1(sesion);
    const rehidratada = rehidratarSesionCronometroDesdeV1(registro);

    expect(registro).toMatchObject({
      versionEsquema: 1,
      estado: "PAUSADA",
      revision: 2,
      claveAbierta: "ABIERTA",
      operacionesIds: ["operacion-iniciar", "operacion-pausar"],
    });
    expect(registro.operaciones[1]).toEqual({
      id: "operacion-pausar",
      tipo: "PAUSAR",
      ocurridaEn: "2026-07-20T10:15:00.000Z",
    });
    expect(Object.isFrozen(registro)).toBe(true);
    expect(Object.isFrozen(registro.operaciones)).toBe(true);
    expect(Object.isFrozen(registro.operaciones[0])).toBe(true);
    expect(convertirSesionCronometroEnV1(rehidratada)).toEqual(registro);
  });

  it("elimina la clave abierta cuando la sesión finaliza", () => {
    const sesion = crearSesion();
    sesion.detener("operacion-detener", new Date("2026-07-20T10:20:00.000Z"));

    const registro = convertirSesionCronometroEnV1(sesion);

    expect(registro.estado).toBe("FINALIZADA");
    expect(registro.claveAbierta).toBeUndefined();
    expect(rehidratarSesionCronometroDesdeV1(registro).estado).toBe(
      "FINALIZADA",
    );
  });

  it("rechaza versión, instante, índice, tipo y estado incoherentes", () => {
    const registro = convertirSesionCronometroEnV1(crearSesion());

    esperarError(() =>
      rehidratarSesionCronometroDesdeV1({
        ...registro,
        versionEsquema: 2,
      } as unknown as SesionCronometroV1),
    );
    esperarError(() =>
      rehidratarSesionCronometroDesdeV1({
        ...registro,
        operaciones: [
          {
            ...registro.operaciones[0]!,
            ocurridaEn: "2026-07-20T06:00:00-04:00",
          },
        ],
      }),
    );
    esperarError(() =>
      rehidratarSesionCronometroDesdeV1({
        ...registro,
        operacionesIds: ["otra-operacion"],
      }),
    );
    esperarError(() =>
      rehidratarSesionCronometroDesdeV1({
        ...registro,
        operaciones: [{ ...registro.operaciones[0]!, tipo: "DESCONOCIDA" }],
      } as unknown as SesionCronometroV1),
    );
    esperarError(() =>
      rehidratarSesionCronometroDesdeV1({
        ...registro,
        estado: "PAUSADA",
      }),
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

function esperarError(operacion: () => unknown): void {
  expect(operacion).toThrow(ErrorMapeoSesionCronometroV1);
}
