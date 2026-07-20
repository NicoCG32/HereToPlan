import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  CasoDeUsoConsultarBilletera,
  ErrorTransaccionPuntosDuplicada,
} from "../src/aplicacion";
import { BilleteraPuntos, TransaccionPuntos } from "../src/dominio";
import { RepositorioTransaccionesPuntosIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioTransaccionesPuntosIndexedDB";
import { RepositorioTransaccionesPuntosEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioTransaccionesPuntosEnMemoria";
import {
  ErrorMapeoTransaccionPuntosV1,
  rehidratarTransaccionPuntosDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorTransaccionPuntosV1";

describe("persistencia y rehidratación de la billetera", () => {
  it("recarga movimientos versionados y deriva el saldo en orden histórico", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const configuracion = {
      fabricaIndexedDB,
      nombreBaseDatos: "billetera-recarga",
    };
    const primeraCarga = new RepositorioTransaccionesPuntosIndexedDB(
      configuracion,
    );
    await primeraCarga.guardar(
      crearMovimiento(
        "gasto-1",
        "GASTO",
        1,
        "canje-1",
        "2026-07-20T11:00:00.000Z",
      ),
    );
    await primeraCarga.guardar(
      crearMovimiento(
        "ingreso-1",
        "INGRESO",
        4,
        "bloque-1",
        "2026-07-20T10:00:00.000Z",
      ),
    );
    await primeraCarga.cerrar();

    const segundaCarga = new RepositorioTransaccionesPuntosIndexedDB(
      configuracion,
    );
    const billetera = await new CasoDeUsoConsultarBilletera(
      segundaCarga,
    ).ejecutar();

    expect(billetera.saldo).toBe(3);
    expect(billetera.movimientos.map((movimiento) => movimiento.id)).toEqual([
      "gasto-1",
      "ingreso-1",
    ]);
    expect(billetera.movimientos[0]).toMatchObject({
      tipo: "GASTO",
      variacion: -1,
      fuente: { tipo: "CANJE_RECOMPENSA", id: "canje-1" },
    });
    await segundaCarga.cerrar();
  });

  it("mantiene la unicidad semántica después de reconstruir el adaptador", async () => {
    const configuracion = {
      fabricaIndexedDB: new IDBFactory(),
      nombreBaseDatos: "billetera-unicidad",
    };
    const primero = new RepositorioTransaccionesPuntosIndexedDB(configuracion);
    await primero.guardar(
      crearMovimiento(
        "ingreso-1",
        "INGRESO",
        2,
        "bloque-1",
        "2026-07-20T10:00:00.000Z",
      ),
    );
    await primero.cerrar();
    const segundo = new RepositorioTransaccionesPuntosIndexedDB(configuracion);

    await expect(
      segundo.guardar(
        crearMovimiento(
          "ingreso-2",
          "INGRESO",
          3,
          "bloque-1",
          "2026-07-21T10:00:00.000Z",
        ),
      ),
    ).rejects.toBeInstanceOf(ErrorTransaccionPuntosDuplicada);
    await expect(segundo.listar()).resolves.toHaveLength(1);
    await segundo.cerrar();
  });

  it("mantiene en memoria el mismo contrato de listado y unicidad", async () => {
    const repositorio = new RepositorioTransaccionesPuntosEnMemoria();
    const ingreso = crearMovimiento(
      "ingreso-1",
      "INGRESO",
      2,
      "bloque-1",
      "2026-07-20T10:00:00.000Z",
    );
    await repositorio.guardar(ingreso);

    const movimientos = await repositorio.listar();
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0]).not.toBe(ingreso);
    await expect(repositorio.guardar(ingreso)).rejects.toBeInstanceOf(
      ErrorTransaccionPuntosDuplicada,
    );
    await expect(
      repositorio.guardar(
        crearMovimiento(
          "ingreso-2",
          "INGRESO",
          3,
          "bloque-1",
          "2026-07-21T10:00:00.000Z",
        ),
      ),
    ).rejects.toBeInstanceOf(ErrorTransaccionPuntosDuplicada);
  });

  it("rehidrata una copia independiente y vuelve a validar las invariantes", () => {
    const ingreso = crearMovimiento(
      "ingreso-1",
      "INGRESO",
      2,
      "bloque-1",
      "2026-07-20T10:00:00.000Z",
    );
    const billetera = BilleteraPuntos.rehidratar([ingreso]);
    const vista = billetera.listarTransacciones() as TransaccionPuntos[];
    vista.pop();

    expect(billetera.saldo).toBe(2);
    expect(() => BilleteraPuntos.rehidratar([ingreso, ingreso])).toThrowError(
      /ya fue registrada/,
    );
  });

  it("rechaza registros con versión, enumeraciones o instante inválidos", () => {
    const base = {
      versionEsquema: 1 as const,
      id: "ingreso-1",
      tipo: "INGRESO" as const,
      cantidad: 2,
      fuenteTipo: "COMPROMISO_COMPLETADO" as const,
      fuenteId: "bloque-1",
      descripcion: "Cumplimiento",
      ocurridaEn: "2026-07-20T10:00:00.000Z",
    };

    for (const registro of [
      { ...base, versionEsquema: 2 },
      { ...base, tipo: "AJUSTE" },
      { ...base, fuenteTipo: "DESCONOCIDA" },
      { ...base, ocurridaEn: "20-07-2026" },
    ]) {
      expect(() =>
        rehidratarTransaccionPuntosDesdeV1(
          registro as Parameters<typeof rehidratarTransaccionPuntosDesdeV1>[0],
        ),
      ).toThrowError(ErrorMapeoTransaccionPuntosV1);
    }
  });
});

function crearMovimiento(
  id: string,
  tipo: "INGRESO" | "GASTO",
  cantidad: number,
  fuenteId: string,
  ocurridaEn: string,
): TransaccionPuntos {
  return new TransaccionPuntos({
    id,
    tipo,
    cantidad,
    fuenteTipo:
      tipo === "INGRESO" ? "COMPROMISO_COMPLETADO" : "CANJE_RECOMPENSA",
    fuenteId,
    descripcion: `Movimiento ${id}`,
    ocurridaEn: new Date(ocurridaEn),
  });
}
