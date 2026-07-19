import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { RepositorioCortesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioCortesPlanificacionIndexedDB";
import {
  ALMACEN_CORTES_PLANIFICACION,
  ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
  VERSION_BASE_DATOS,
} from "../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos";
import type { ErrorMapeoCortePlanificacionV1 } from "../src/infraestructura/persistencia/mapeadores/MapeadorCortePlanificacionV1";
import {
  CORTE_ASIGNADO_EN,
  CORTE_CONFIRMAR_EN,
  crearCorteEnGracia,
  verificarContratoRepositorioCortesPlanificacion,
} from "./contratoRepositorioCortesPlanificacion";

const NOMBRE_BASE_DATOS = "here-to-plan-cortes-pruebas";

verificarContratoRepositorioCortesPlanificacion("adaptador IndexedDB", () =>
  crearRepositorio(new IDBFactory()),
);

describe("RepositorioCortesPlanificacionIndexedDB", () => {
  it("recupera la misma ventana temporal desde una instancia nueva", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const primero = crearRepositorio(fabricaIndexedDB);
    await primero.guardar(crearCorteEnGracia("corte-recargado"));
    await primero.cerrar();

    const trasRecarga = crearRepositorio(fabricaIndexedDB);
    const recuperado = await trasRecarga.obtenerPorId("corte-recargado");

    expect(recuperado?.estado).toBe("EN_GRACIA");
    expect(recuperado?.asignadaEn?.toISOString()).toBe(
      CORTE_ASIGNADO_EN.toISOString(),
    );
    expect(recuperado?.confirmarAutomaticamenteEn?.toISOString()).toBe(
      CORTE_CONFIRMAR_EN.toISOString(),
    );
  });

  it("rechaza un registro con versión desconocida", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const repositorio = crearRepositorio(fabricaIndexedDB);
    await repositorio.guardar(crearCorteEnGracia("corte-incompatible"));
    await repositorio.cerrar();
    const baseDatos = await abrirBase(fabricaIndexedDB);
    await reemplazarVersion(baseDatos, "corte-incompatible", 2);
    baseDatos.close();

    const trasRecarga = crearRepositorio(fabricaIndexedDB);
    await expect(
      trasRecarga.obtenerPorId("corte-incompatible"),
    ).rejects.toMatchObject({
      name: "ErrorMapeoCortePlanificacionV1",
      codigo: "VERSION_CORTE_PLANIFICACION_NO_SOPORTADA",
    } satisfies Partial<ErrorMapeoCortePlanificacionV1>);
  });

  it("actualiza desde versión 4 sin alterar los almacenes existentes", async () => {
    const fabricaIndexedDB = new IDBFactory();
    await crearBaseVersionCuatro(fabricaIndexedDB);

    const repositorio = crearRepositorio(fabricaIndexedDB);
    await repositorio.guardar(crearCorteEnGracia("corte-migrado"));
    await repositorio.cerrar();

    const baseDatos = await abrirBase(fabricaIndexedDB);
    for (const [almacen, id] of [
      ["agendas", "agenda-legada"],
      ["actividades", "actividad-legada"],
      ["contextos-planificacion", "contexto-legado"],
      ["bloques-planificacion", "bloque-legado"],
    ] as const) {
      await expect(leerRegistro(baseDatos, almacen, id)).resolves.toBeDefined();
    }
    expect(
      baseDatos.objectStoreNames.contains(ALMACEN_CORTES_PLANIFICACION),
    ).toBe(true);
    expect(
      baseDatos.objectStoreNames.contains(
        ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
      ),
    ).toBe(true);
    await expect(
      leerRegistro(baseDatos, ALMACEN_CORTES_PLANIFICACION, "corte-migrado"),
    ).resolves.toMatchObject({
      estado: "EN_GRACIA",
      confirmarAutomaticamenteEn: CORTE_CONFIRMAR_EN.toISOString(),
    });
    baseDatos.close();
  });

  it("resuelve escrituras simultáneas sin reemplazar el registro ganador", async () => {
    const repositorio = crearRepositorio(new IDBFactory());

    const resultados = await Promise.allSettled([
      repositorio.guardar(crearCorteEnGracia("corte-concurrente")),
      repositorio.guardar(crearCorteEnGracia("corte-concurrente")),
    ]);

    expect(
      resultados.filter((resultado) => resultado.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      resultados.filter((resultado) => resultado.status === "rejected"),
    ).toHaveLength(1);
    await expect(
      repositorio.obtenerPorId("corte-concurrente"),
    ).resolves.toMatchObject({ estado: "EN_GRACIA" });
  });
});

function crearRepositorio(
  fabricaIndexedDB: IDBFactory,
): RepositorioCortesPlanificacionIndexedDB {
  return new RepositorioCortesPlanificacionIndexedDB({
    fabricaIndexedDB,
    nombreBaseDatos: NOMBRE_BASE_DATOS,
  });
}

async function crearBaseVersionCuatro(
  fabricaIndexedDB: IDBFactory,
): Promise<void> {
  const baseDatos = await new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = fabricaIndexedDB.open(NOMBRE_BASE_DATOS, 4);
    solicitud.onupgradeneeded = () => {
      for (const almacen of [
        "agendas",
        "actividades",
        "contextos-planificacion",
        "bloques-planificacion",
      ]) {
        solicitud.result.createObjectStore(almacen, { keyPath: "id" });
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error("No fue posible crear la base v4."));
  });

  await new Promise<void>((resolve, reject) => {
    const almacenes = [
      "agendas",
      "actividades",
      "contextos-planificacion",
      "bloques-planificacion",
    ];
    const transaccion = baseDatos.transaction(almacenes, "readwrite");
    transaccion.objectStore("agendas").add({ id: "agenda-legada" });
    transaccion.objectStore("actividades").add({ id: "actividad-legada" });
    transaccion
      .objectStore("contextos-planificacion")
      .add({ id: "contexto-legado" });
    transaccion
      .objectStore("bloques-planificacion")
      .add({ id: "bloque-legado" });
    transaccion.oncomplete = () => resolve();
    transaccion.onabort = () =>
      reject(
        transaccion.error ??
          new Error("No fue posible preparar los registros de la base v4."),
      );
  });
  baseDatos.close();
}

function abrirBase(fabricaIndexedDB: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = fabricaIndexedDB.open(
      NOMBRE_BASE_DATOS,
      VERSION_BASE_DATOS,
    );
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
      ALMACEN_CORTES_PLANIFICACION,
      "readwrite",
    );
    const almacen = transaccion.objectStore(ALMACEN_CORTES_PLANIFICACION);
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
        transaccion.error ?? new Error("No fue posible reemplazar la versión."),
      );
  });
}
