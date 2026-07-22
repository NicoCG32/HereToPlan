import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { Tarea } from "../src/dominio";
import { RepositorioActividadesIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioActividadesIndexedDB";
import { RepositorioAgendasIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioAgendasIndexedDB";
import { verificarContratoRepositorioActividades } from "./contratoRepositorioActividades";

const NOMBRE_BASE_DATOS = "here-to-plan-actividades-pruebas";

verificarContratoRepositorioActividades(
  "adaptador IndexedDB",
  () =>
    new RepositorioActividadesIndexedDB({
      fabricaIndexedDB: new IDBFactory(),
      nombreBaseDatos: NOMBRE_BASE_DATOS,
    }),
);

describe("RepositorioActividadesIndexedDB", () => {
  it("recupera el catálogo desde una nueva instancia", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const primero = crearRepositorio(fabricaIndexedDB);
    await primero.guardar(crearActividad("actividad-recargada"));
    await primero.cerrar();

    const trasRecarga = crearRepositorio(fabricaIndexedDB);
    await expect(
      trasRecarga.obtenerPorId("actividad-recargada"),
    ).resolves.toMatchObject({
      id: "actividad-recargada",
      tipo: "PROYECTO",
      modoSeguimiento: "CRONOMETRADO",
      tiempoNecesarioMinutos: 120,
      creadaEn: new Date("2026-07-20T10:00:00.000Z"),
    });
  });

  it("actualiza la base desde versión 1 sin eliminar las agendas", async () => {
    const fabricaIndexedDB = new IDBFactory();
    await crearBaseVersionUnoConAgenda(fabricaIndexedDB);

    const actividades = crearRepositorio(fabricaIndexedDB);
    await actividades.guardar(crearActividad("actividad-nueva"));
    await actividades.cerrar();

    const agendas = new RepositorioAgendasIndexedDB({
      fabricaIndexedDB,
      nombreBaseDatos: NOMBRE_BASE_DATOS,
    });
    await expect(agendas.obtenerPorId("agenda-legada")).resolves.toMatchObject({
      id: "agenda-legada",
      nombre: "Agenda legada",
      estado: "BORRADOR",
    });
  });
});

describe("migración del modo de seguimiento", () => {
  it("convierte registros V1 a modo manual", async () => {
    const fabricaIndexedDB = new IDBFactory();
    await crearBaseVersionDoceConActividad(fabricaIndexedDB);

    const repositorio = crearRepositorio(fabricaIndexedDB);
    await expect(
      repositorio.obtenerPorId("actividad-legada"),
    ).resolves.toMatchObject({
      id: "actividad-legada",
      tipo: "TAREA_SIMPLE",
      modoSeguimiento: "MANUAL",
    });
    await repositorio.cerrar();

    await expect(
      leerRegistroActividad(fabricaIndexedDB, "actividad-legada"),
    ).resolves.toMatchObject({
      versionEsquema: 2,
      modoSeguimiento: "MANUAL",
      estado: "PENDIENTE",
    });
  });
});

function crearRepositorio(
  fabricaIndexedDB: IDBFactory,
): RepositorioActividadesIndexedDB {
  return new RepositorioActividadesIndexedDB({
    fabricaIndexedDB,
    nombreBaseDatos: NOMBRE_BASE_DATOS,
  });
}

function crearActividad(id: string): Tarea {
  return new Tarea({
    id,
    titulo: "Proyecto persistente",
    tipo: "PROYECTO",
    modoSeguimiento: "CRONOMETRADO",
    tiempoNecesarioMinutos: 120,
    descripcion: "Se conserva después de recargar",
    creadaEn: new Date("2026-07-20T10:00:00.000Z"),
  });
}

async function crearBaseVersionDoceConActividad(
  fabricaIndexedDB: IDBFactory,
): Promise<void> {
  const baseDatos = await new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = fabricaIndexedDB.open(NOMBRE_BASE_DATOS, 12);
    solicitud.onupgradeneeded = () => {
      solicitud.result.createObjectStore("actividades", { keyPath: "id" });
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error("Falló la apertura de IndexedDB."));
  });
  await new Promise<void>((resolve, reject) => {
    const transaccion = baseDatos.transaction("actividades", "readwrite");
    transaccion.objectStore("actividades").add({
      versionEsquema: 1,
      id: "actividad-legada",
      titulo: "Actividad legada",
      tipo: "TAREA_SIMPLE",
      tiempoNecesarioMinutos: 30,
      subtareasIds: [],
      estado: "PENDIENTE",
      creadaEn: "2026-07-20T10:00:00.000Z",
    });
    transaccion.oncomplete = () => resolve();
    transaccion.onabort = () =>
      reject(transaccion.error ?? new Error("Falló la escritura legada."));
  });
  baseDatos.close();
}

async function leerRegistroActividad(
  fabricaIndexedDB: IDBFactory,
  id: string,
): Promise<unknown> {
  const baseDatos = await new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = fabricaIndexedDB.open(NOMBRE_BASE_DATOS, 13);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error("Falló la apertura de IndexedDB."));
  });
  const registro = await new Promise<unknown>((resolve, reject) => {
    const transaccion = baseDatos.transaction("actividades", "readonly");
    const solicitud = transaccion.objectStore("actividades").get(id);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error("Falló la lectura de IndexedDB."));
  });
  baseDatos.close();
  return registro;
}

async function crearBaseVersionUnoConAgenda(
  fabricaIndexedDB: IDBFactory,
): Promise<void> {
  const baseDatos = await new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = fabricaIndexedDB.open(NOMBRE_BASE_DATOS, 1);
    solicitud.onupgradeneeded = () => {
      solicitud.result.createObjectStore("agendas", { keyPath: "id" });
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(
        solicitud.error ?? new Error("No fue posible abrir la base legada."),
      );
  });

  await new Promise<void>((resolve, reject) => {
    const transaccion = baseDatos.transaction("agendas", "readwrite");
    transaccion.objectStore("agendas").add({
      versionEsquema: 1,
      id: "agenda-legada",
      nombre: "Agenda legada",
      fechaInicio: "2026-07-20",
      fechaFin: "2026-07-21",
      creadaEn: "2026-07-19T20:00:00.000Z",
      estado: "BORRADOR",
      bloques: [],
      ajustes: [],
    });
    transaccion.oncomplete = () => resolve();
    transaccion.onabort = () =>
      reject(transaccion.error ?? new Error("Falló la base legada."));
  });
  baseDatos.close();
}
