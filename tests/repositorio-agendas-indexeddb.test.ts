import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { Agenda, FechaLocal } from "../src/dominio";
import { ErrorMapeoAgendaV1 } from "../src/infraestructura/persistencia/mapeadores/MapeadorAgendaV1";
import { RepositorioAgendasIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioAgendasIndexedDB";
import { VERSION_BASE_DATOS } from "../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos";
import { verificarContratoRepositorioAgendas } from "./contratoRepositorioAgendas";

const NOMBRE_BASE_DATOS = "here-to-plan-pruebas";
const ALMACEN_AGENDAS = "agendas";

verificarContratoRepositorioAgendas(
  "adaptador IndexedDB",
  () =>
    new RepositorioAgendasIndexedDB({
      fabricaIndexedDB: new IDBFactory(),
      nombreBaseDatos: NOMBRE_BASE_DATOS,
    }),
);

describe("RepositorioAgendasIndexedDB", () => {
  it("recupera una agenda desde una nueva instancia del repositorio", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const primerRepositorio = crearRepositorio(fabricaIndexedDB);
    const agenda = crearAgenda("agenda-recargada");

    await primerRepositorio.guardar(agenda);
    await primerRepositorio.cerrar();

    const repositorioTrasRecarga = crearRepositorio(fabricaIndexedDB);

    await expect(
      repositorioTrasRecarga.obtenerPorId("agenda-recargada"),
    ).resolves.toMatchObject({
      id: "agenda-recargada",
      nombre: "Agenda recuperada",
      estado: "BORRADOR",
    });
  });

  it("rechaza un esquema desconocido mediante un error de mapeo recuperable", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const repositorio = crearRepositorio(fabricaIndexedDB);
    const agenda = crearAgenda("agenda-incompatible");

    await repositorio.guardar(agenda);
    await repositorio.cerrar();
    await reemplazarVersionEsquema(fabricaIndexedDB, agenda.id, 2);

    const repositorioTrasRecarga = crearRepositorio(fabricaIndexedDB);
    await expect(
      repositorioTrasRecarga.obtenerPorId(agenda.id),
    ).rejects.toMatchObject({
      name: "ErrorMapeoAgendaV1",
      codigo: "VERSION_AGENDA_NO_SOPORTADA",
    } satisfies Partial<ErrorMapeoAgendaV1>);
  });

  it("resuelve escrituras simultáneas sin reemplazar el registro ganador", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const repositorio = crearRepositorio(fabricaIndexedDB);
    const primera = crearAgenda("agenda-concurrente", "Primera");
    const segunda = crearAgenda("agenda-concurrente", "Segunda");

    const resultados = await Promise.allSettled([
      repositorio.guardar(primera),
      repositorio.guardar(segunda),
    ]);

    expect(
      resultados.filter((resultado) => resultado.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      resultados.filter((resultado) => resultado.status === "rejected"),
    ).toHaveLength(1);
    await expect(
      repositorio.obtenerPorId("agenda-concurrente"),
    ).resolves.toMatchObject({ nombre: "Primera" });
  });
});

function crearRepositorio(
  fabricaIndexedDB: IDBFactory,
): RepositorioAgendasIndexedDB {
  return new RepositorioAgendasIndexedDB({
    fabricaIndexedDB,
    nombreBaseDatos: NOMBRE_BASE_DATOS,
  });
}

function crearAgenda(id: string, nombre = "Agenda recuperada"): Agenda {
  return new Agenda({
    id,
    nombre,
    fechaInicio: FechaLocal.crear("2026-07-20"),
    fechaFin: FechaLocal.crear("2026-07-21"),
    creadaEn: new Date("2026-07-19T20:00:00.000Z"),
  });
}

async function reemplazarVersionEsquema(
  fabricaIndexedDB: IDBFactory,
  id: string,
  versionEsquema: number,
): Promise<void> {
  const baseDatos = await abrirBaseDatos(fabricaIndexedDB);

  await new Promise<void>((resolve, reject) => {
    const transaccion = baseDatos.transaction(ALMACEN_AGENDAS, "readwrite");
    const almacen = transaccion.objectStore(ALMACEN_AGENDAS);
    const lectura = almacen.get(id);

    lectura.onsuccess = () => {
      almacen.put({
        ...(lectura.result as Record<string, unknown>),
        versionEsquema,
      });
    };
    transaccion.oncomplete = () => resolve();
    transaccion.onabort = () =>
      reject(
        transaccion.error ??
          new Error("La escritura del registro incompatible fue abortada."),
      );
  });

  baseDatos.close();
}

function abrirBaseDatos(fabricaIndexedDB: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = fabricaIndexedDB.open(
      NOMBRE_BASE_DATOS,
      VERSION_BASE_DATOS,
    );
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(
        solicitud.error ??
          new Error("No fue posible abrir la base de pruebas."),
      );
  });
}
