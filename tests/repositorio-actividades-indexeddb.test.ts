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
    tiempoNecesarioMinutos: 120,
    descripcion: "Se conserva después de recargar",
    creadaEn: new Date("2026-07-20T10:00:00.000Z"),
  });
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
