import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  COLECCIONES_RESPALDO,
  CasoDeUsoAnalizarImportacionRespaldo,
} from "../src/aplicacion";
import { LectorEstadoPersistenteIndexedDB } from "../src/infraestructura/persistencia/indexeddb/LectorEstadoPersistenteIndexedDB";
import {
  ALMACEN_CONTEXTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos";

const conexiones: IDBDatabase[] = [];
const nombres: string[] = [];

afterEach(async () => {
  conexiones.splice(0).forEach((conexion) => conexion.close());
  await Promise.all(nombres.splice(0).map(eliminarBase));
});

describe("instantánea de respaldo en IndexedDB", () => {
  it("lee los doce almacenes dentro de una única instantánea", async () => {
    const nombre = crearNombre("completo");
    const baseDatos = await abrirBase(nombre);
    await agregarContexto(baseDatos);
    const lector = new LectorEstadoPersistenteIndexedDB({
      fabricaIndexedDB: indexedDB,
      nombreBaseDatos: nombre,
    });

    const estado = await lector.leerEstadoCompleto();

    expect(estado.versionBaseDatos).toBe(VERSION_BASE_DATOS);
    expect(Object.keys(estado.colecciones)).toEqual(COLECCIONES_RESPALDO);
    expect(estado.colecciones["contextos-planificacion"]).toEqual([
      expect.objectContaining({ id: "contexto-respaldado" }),
    ]);
    expect(estado.colecciones["transacciones-puntos"]).toEqual([]);
    await lector.cerrar();
  });

  it("analiza un archivo sin modificar el estado existente", async () => {
    const nombre = crearNombre("no-destructivo");
    const baseDatos = await abrirBase(nombre);
    await agregarContexto(baseDatos);
    const lector = new LectorEstadoPersistenteIndexedDB({
      fabricaIndexedDB: indexedDB,
      nombreBaseDatos: nombre,
    });
    const antes = await lector.leerEstadoCompleto();
    const documento = {
      formato: "HereToPlan.respaldo",
      versionFormato: 1,
      creadoEn: "2026-07-20T15:30:00.000Z",
      origen: { aplicacion: "HereToPlan", versionBaseDatos: 10 },
      contenido: Object.fromEntries(
        COLECCIONES_RESPALDO.map((coleccion) => [coleccion, []]),
      ),
    };

    const resultado = new CasoDeUsoAnalizarImportacionRespaldo().ejecutar(
      JSON.stringify(documento),
    );
    const despues = await lector.leerEstadoCompleto();

    expect(resultado.estado).toBe("VALIDO");
    expect(despues).toEqual(antes);
    await lector.cerrar();
  });
});

function crearNombre(sufijo: string): string {
  const nombre = `respaldo-${sufijo}-${crypto.randomUUID()}`;
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

function agregarContexto(baseDatos: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaccion = baseDatos.transaction(ALMACEN_CONTEXTOS, "readwrite");
    transaccion.objectStore(ALMACEN_CONTEXTOS).add({
      versionEsquema: 1,
      id: "contexto-respaldado",
      nombre: "Proyecto",
      tipo: "NOMBRADO",
      creadaEn: "2026-07-01T10:00:00.000Z",
    });
    transaccion.oncomplete = () => resolve();
    transaccion.onabort = () =>
      reject(
        transaccion.error ?? new Error("No fue posible agregar el contexto."),
      );
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
