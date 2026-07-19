import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { ContextoPlanificacion } from "../src/dominio";
import { RepositorioContextosPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioContextosPlanificacionIndexedDB";
import { ErrorMapeoContextoPlanificacionV1 } from "../src/infraestructura/persistencia/mapeadores/MapeadorContextoPlanificacionV1";
import { VERSION_BASE_DATOS } from "../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos";
import { verificarContratoRepositorioContextosPlanificacion } from "./contratoRepositorioContextosPlanificacion";

const NOMBRE_BASE_DATOS = "here-to-plan-contextos-pruebas";

verificarContratoRepositorioContextosPlanificacion(
  "adaptador IndexedDB",
  () =>
    new RepositorioContextosPlanificacionIndexedDB({
      fabricaIndexedDB: new IDBFactory(),
      nombreBaseDatos: NOMBRE_BASE_DATOS,
    }),
);

describe("RepositorioContextosPlanificacionIndexedDB", () => {
  it("recupera contextos desde una nueva instancia", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const primero = crearRepositorio(fabricaIndexedDB);
    await primero.guardar(
      ContextoPlanificacion.crearNombrado({
        id: "contexto-recargado",
        nombre: "Proyecto persistente",
        proposito: "Conservar decisiones editoriales",
        creadaEn: new Date("2026-07-20T10:00:00.000Z"),
      }),
    );
    await primero.cerrar();

    const trasRecarga = crearRepositorio(fabricaIndexedDB);

    await expect(
      trasRecarga.obtenerPorId("contexto-recargado"),
    ).resolves.toMatchObject({
      id: "contexto-recargado",
      nombre: "Proyecto persistente",
      proposito: "Conservar decisiones editoriales",
      tipo: "NOMBRADO",
    });
  });

  it("actualiza la base desde versión 2 sin alterar agendas ni actividades", async () => {
    const fabricaIndexedDB = new IDBFactory();
    await crearBaseVersionDos(fabricaIndexedDB);

    const repositorio = crearRepositorio(fabricaIndexedDB);
    await repositorio.guardar(
      ContextoPlanificacion.crearLibre(new Date("2026-07-20T10:00:00.000Z")),
    );
    await repositorio.cerrar();

    const baseDatos = await abrirBase(fabricaIndexedDB, VERSION_BASE_DATOS);
    await expect(
      leerRegistro(baseDatos, "agendas", "agenda-legada"),
    ).resolves.toMatchObject({
      nombre: "Agenda legada",
    });
    await expect(
      leerRegistro(baseDatos, "actividades", "actividad-legada"),
    ).resolves.toMatchObject({ titulo: "Actividad legada" });
    expect(baseDatos.objectStoreNames.contains("contextos-planificacion")).toBe(
      true,
    );
    expect(baseDatos.objectStoreNames.contains("bloques-planificacion")).toBe(
      true,
    );
    baseDatos.close();
  });

  it("rechaza un registro de contexto con versión desconocida", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const repositorio = crearRepositorio(fabricaIndexedDB);
    await repositorio.guardar(
      ContextoPlanificacion.crearLibre(new Date("2026-07-20T10:00:00.000Z")),
    );
    await repositorio.cerrar();
    const baseDatos = await abrirBase(fabricaIndexedDB, VERSION_BASE_DATOS);
    await reemplazarVersion(baseDatos, "contexto-libre", 2);
    baseDatos.close();

    const trasRecarga = crearRepositorio(fabricaIndexedDB);
    await expect(
      trasRecarga.obtenerPorId("contexto-libre"),
    ).rejects.toMatchObject({
      name: "ErrorMapeoContextoPlanificacionV1",
      codigo: "VERSION_CONTEXTO_NO_SOPORTADA",
    } satisfies Partial<ErrorMapeoContextoPlanificacionV1>);
  });
});

function crearRepositorio(
  fabricaIndexedDB: IDBFactory,
): RepositorioContextosPlanificacionIndexedDB {
  return new RepositorioContextosPlanificacionIndexedDB({
    fabricaIndexedDB,
    nombreBaseDatos: NOMBRE_BASE_DATOS,
  });
}

async function crearBaseVersionDos(
  fabricaIndexedDB: IDBFactory,
): Promise<void> {
  const baseDatos = await new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = fabricaIndexedDB.open(NOMBRE_BASE_DATOS, 2);
    solicitud.onupgradeneeded = () => {
      solicitud.result.createObjectStore("agendas", { keyPath: "id" });
      solicitud.result.createObjectStore("actividades", { keyPath: "id" });
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error("No fue posible crear la base v2."));
  });

  await new Promise<void>((resolve, reject) => {
    const transaccion = baseDatos.transaction(
      ["agendas", "actividades"],
      "readwrite",
    );
    transaccion.objectStore("agendas").add({
      id: "agenda-legada",
      nombre: "Agenda legada",
    });
    transaccion.objectStore("actividades").add({
      id: "actividad-legada",
      titulo: "Actividad legada",
    });
    transaccion.oncomplete = () => resolve();
    transaccion.onabort = () =>
      reject(
        transaccion.error ??
          new Error("No fue posible preparar los registros legados."),
      );
  });
  baseDatos.close();
}

function abrirBase(
  fabricaIndexedDB: IDBFactory,
  version: number,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = fabricaIndexedDB.open(NOMBRE_BASE_DATOS, version);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error("No fue posible abrir la base."));
  });
}

function leerRegistro(
  baseDatos: IDBDatabase,
  almacen: string,
  id: string,
): Promise<Record<string, unknown> | undefined> {
  return new Promise((resolve, reject) => {
    const solicitud = baseDatos
      .transaction(almacen)
      .objectStore(almacen)
      .get(id);
    solicitud.onsuccess = () =>
      resolve(solicitud.result as Record<string, unknown> | undefined);
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error("No fue posible leer el registro."));
  });
}

function reemplazarVersion(
  baseDatos: IDBDatabase,
  id: string,
  versionEsquema: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaccion = baseDatos.transaction(
      "contextos-planificacion",
      "readwrite",
    );
    const almacen = transaccion.objectStore("contextos-planificacion");
    const solicitud = almacen.get(id);
    solicitud.onsuccess = () => {
      almacen.put({
        ...(solicitud.result as Record<string, unknown>),
        versionEsquema,
      });
    };
    transaccion.oncomplete = () => resolve();
    transaccion.onabort = () =>
      reject(
        transaccion.error ??
          new Error("No fue posible reemplazar la versión del registro."),
      );
  });
}
