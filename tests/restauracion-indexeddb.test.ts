import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  COLECCIONES_RESPALDO,
  type EstadoPersistenteRespaldable,
} from "../src/aplicacion";
import { LectorEstadoPersistenteIndexedDB } from "../src/infraestructura/persistencia/indexeddb/LectorEstadoPersistenteIndexedDB";
import { RestauradorEstadoPersistenteIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RestauradorEstadoPersistenteIndexedDB";
import {
  ALMACEN_CONTEXTOS,
  ALMACEN_TRANSACCIONES_PUNTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos";

const conexiones: IDBDatabase[] = [];
const nombres: string[] = [];

afterEach(async () => {
  conexiones.splice(0).forEach((conexion) => conexion.close());
  await Promise.all(nombres.splice(0).map(eliminarBase));
});

describe("restauración atómica en IndexedDB", () => {
  it("reemplaza el estado completo dentro de una sola operación", async () => {
    const nombre = crearNombre("exitosa");
    const baseDatos = await abrirBase(nombre);
    await agregar(baseDatos, ALMACEN_CONTEXTOS, contexto("anterior"));
    await agregar(
      baseDatos,
      ALMACEN_TRANSACCIONES_PUNTOS,
      transaccionPuntos("transaccion-anterior", "fuente-anterior"),
    );
    const restaurador = crearRestaurador(nombre);
    const lector = crearLector(nombre);
    const destino = estadoVacio();
    destino.colecciones[ALMACEN_CONTEXTOS] = [contexto("restaurado")];

    await restaurador.reemplazarEstadoCompleto(
      destino as unknown as EstadoPersistenteRespaldable,
    );
    const estado = await lector.leerEstadoCompleto();

    expect(estado.colecciones[ALMACEN_CONTEXTOS]).toEqual([
      contexto("restaurado"),
    ]);
    expect(estado.colecciones[ALMACEN_TRANSACCIONES_PUNTOS]).toEqual([]);
    expect(Object.keys(estado.colecciones)).toEqual(COLECCIONES_RESPALDO);
    await restaurador.cerrar();
    await lector.cerrar();
  });

  it("revierte todas las colecciones si un índice único rechaza un registro", async () => {
    const nombre = crearNombre("rollback");
    const baseDatos = await abrirBase(nombre);
    await agregar(baseDatos, ALMACEN_CONTEXTOS, contexto("anterior"));
    await agregar(
      baseDatos,
      ALMACEN_TRANSACCIONES_PUNTOS,
      transaccionPuntos("transaccion-anterior", "fuente-anterior"),
    );
    const restaurador = crearRestaurador(nombre);
    const lector = crearLector(nombre);
    const antes = await lector.leerEstadoCompleto();
    const destino = estadoVacio();
    destino.colecciones[ALMACEN_CONTEXTOS] = [contexto("nuevo")];
    destino.colecciones[ALMACEN_TRANSACCIONES_PUNTOS] = [
      transaccionPuntos("transaccion-1", "fuente-duplicada"),
      transaccionPuntos("transaccion-2", "fuente-duplicada"),
    ];

    await expect(
      restaurador.reemplazarEstadoCompleto(
        destino as unknown as EstadoPersistenteRespaldable,
      ),
    ).rejects.toMatchObject({ codigo: "REEMPLAZO_ATOMICO_FALLIDO" });
    const despues = await lector.leerEstadoCompleto();

    expect(despues).toEqual(antes);
    await restaurador.cerrar();
    await lector.cerrar();
  });
});

function crearRestaurador(nombreBaseDatos: string) {
  return new RestauradorEstadoPersistenteIndexedDB({
    fabricaIndexedDB: indexedDB,
    nombreBaseDatos,
  });
}

function crearLector(nombreBaseDatos: string) {
  return new LectorEstadoPersistenteIndexedDB({
    fabricaIndexedDB: indexedDB,
    nombreBaseDatos,
  });
}

function estadoVacio(): {
  versionBaseDatos: number;
  colecciones: Record<string, Record<string, unknown>[]>;
} {
  return {
    versionBaseDatos: VERSION_BASE_DATOS,
    colecciones: Object.fromEntries(
      COLECCIONES_RESPALDO.map((coleccion) => [coleccion, []]),
    ),
  };
}

function contexto(id: string): Record<string, unknown> {
  return {
    versionEsquema: 1,
    id,
    nombre: `Contexto ${id}`,
    tipo: "NOMBRADO",
    creadaEn: "2026-07-01T10:00:00.000Z",
  };
}

function transaccionPuntos(
  id: string,
  fuenteId: string,
): Record<string, unknown> {
  return {
    versionEsquema: 1,
    id,
    cantidad: 5,
    tipo: "ABONO",
    fuenteTipo: "BLOQUE_COMPLETADO",
    fuenteId,
    registradaEn: "2026-07-01T10:00:00.000Z",
  };
}

function crearNombre(sufijo: string): string {
  const nombre = `restauracion-${sufijo}-${crypto.randomUUID()}`;
  nombres.push(nombre);
  return nombre;
}

function abrirBase(nombre: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(nombre, VERSION_BASE_DATOS);
    solicitud.onupgradeneeded = () => asegurarAlmacenes(solicitud.result);
    solicitud.onsuccess = () => {
      conexiones.push(solicitud.result);
      resolve(solicitud.result);
    };
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error("No fue posible abrir la base."));
  });
}

function agregar(
  baseDatos: IDBDatabase,
  almacen: string,
  registro: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaccion = baseDatos.transaction(almacen, "readwrite");
    transaccion.objectStore(almacen).add(registro);
    transaccion.oncomplete = () => resolve();
    transaccion.onabort = () =>
      reject(transaccion.error ?? new Error("No fue posible agregar."));
  });
}

function eliminarBase(nombre: string): Promise<void> {
  return new Promise((resolve) => {
    const solicitud = indexedDB.deleteDatabase(nombre);
    solicitud.onsuccess = () => resolve();
    solicitud.onerror = () => resolve();
    solicitud.onblocked = () => resolve();
  });
}
