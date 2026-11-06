import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PerfilUsuario } from "../src/dominio";
import {
  ErrorRepositorioPerfilIndexedDB,
  RepositorioPerfilUsuarioIndexedDB,
} from "../src/infraestructura/persistencia/indexeddb/RepositorioPerfilUsuarioIndexedDB";
import { ALMACEN_PERFIL_USUARIO } from "../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos";
import { convertirPerfilUsuarioEnV1 } from "../src/infraestructura/persistencia/mapeadores/MapeadorPerfilUsuarioV1";

const NOMBRE_BASE = "perfil-fallos-transaccionales";
const conexiones: RepositorioPerfilUsuarioIndexedDB[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(conexiones.splice(0).map((conexion) => conexion.cerrar()));
});

describe("fallos transaccionales del perfil local", () => {
  it("rechaza una lectura abortada después de obtener los datos y permite reintentar", async () => {
    const { fabrica, repositorio, perfil } = crearEntorno();
    await repositorio.guardarNuevo(perfil);
    const lecturaInterceptada = vi.spyOn(IDBObjectStore.prototype, "getAll");
    lecturaInterceptada.mockImplementationOnce(function (
      this: IDBObjectStore,
      ...argumentos
    ) {
      lecturaInterceptada.mockRestore();
      const solicitud = this.getAll(...argumentos);
      solicitud.addEventListener("success", () => this.transaction.abort(), {
        once: true,
      });
      return solicitud;
    });

    await expect(repositorio.obtener()).rejects.toMatchObject({
      codigo: "LECTURA_INDEXEDDB_FALLIDA",
    });
    await expect(repositorio.obtener()).resolves.toEqual(perfil);
    await repositorio.cerrar();
    await expect(crearRepositorio(fabrica).obtener()).resolves.toEqual(perfil);
  });

  it("no confirma una creación cuyo add tuvo éxito pero cuya transacción abortó", async () => {
    const { fabrica, repositorio, perfil } = crearEntorno();
    const altaInterceptada = vi.spyOn(IDBObjectStore.prototype, "add");
    altaInterceptada.mockImplementationOnce(function (
      this: IDBObjectStore,
      ...argumentos
    ) {
      altaInterceptada.mockRestore();
      const solicitud = this.add(...argumentos);
      solicitud.addEventListener("success", () => this.transaction.abort(), {
        once: true,
      });
      return solicitud;
    });

    await expect(repositorio.guardarNuevo(perfil)).rejects.toBeInstanceOf(
      ErrorRepositorioPerfilIndexedDB,
    );
    await repositorio.cerrar();
    const trasRecarga = crearRepositorio(fabrica);
    await expect(trasRecarga.obtener()).resolves.toBeUndefined();
    await trasRecarga.guardarNuevo(perfil);
    await expect(trasRecarga.obtener()).resolves.toEqual(perfil);
  });

  it("revierte una actualización después del éxito de put y permite guardar de nuevo", async () => {
    const { fabrica, repositorio, perfil } = crearEntorno();
    await repositorio.guardarNuevo(perfil);
    const actualizado = perfil.actualizarNombre(
      "Nombre actualizado",
      new Date("2026-11-05T12:00:00.000Z"),
    );
    const actualizacionInterceptada = vi.spyOn(IDBObjectStore.prototype, "put");
    actualizacionInterceptada.mockImplementationOnce(function (
      this: IDBObjectStore,
      ...argumentos
    ) {
      actualizacionInterceptada.mockRestore();
      const solicitud = this.put(...argumentos);
      solicitud.addEventListener("success", () => this.transaction.abort(), {
        once: true,
      });
      return solicitud;
    });

    await expect(repositorio.actualizar(actualizado)).rejects.toMatchObject({
      codigo: "ESCRITURA_INDEXEDDB_FALLIDA",
    });
    await repositorio.cerrar();
    const trasRecarga = crearRepositorio(fabrica);
    await expect(trasRecarga.obtener()).resolves.toEqual(perfil);
    await trasRecarga.actualizar(actualizado);
    await expect(trasRecarga.obtener()).resolves.toEqual(actualizado);
  });

  it("conserva la causa nativa de una escritura fallida y revierte todo lo escrito", async () => {
    const { fabrica, repositorio, perfil } = crearEntorno();
    const altaInterceptada = vi.spyOn(IDBObjectStore.prototype, "add");
    altaInterceptada.mockImplementationOnce(function (
      this: IDBObjectStore,
      ...argumentos
    ) {
      altaInterceptada.mockRestore();
      const solicitud = this.add(...argumentos);
      solicitud.addEventListener("success", () => this.add(...argumentos), {
        once: true,
      });
      return solicitud;
    });

    await expect(repositorio.guardarNuevo(perfil)).rejects.toMatchObject({
      codigo: "ESCRITURA_INDEXEDDB_FALLIDA",
      causa: { name: "ConstraintError" },
    });
    await repositorio.cerrar();
    const trasRecarga = crearRepositorio(fabrica);
    await expect(trasRecarga.obtener()).resolves.toBeUndefined();
    await trasRecarga.guardarNuevo(perfil);
    await expect(trasRecarga.obtener()).resolves.toEqual(perfil);
  });

  it("informa perfiles múltiples y conserva ambos registros sin elegir uno", async () => {
    const { fabrica, repositorio, perfil } = crearEntorno();
    const primero = convertirPerfilUsuarioEnV1(perfil);
    const segundo = { ...primero, id: "segundo-perfil", nombreVisible: "Otro" };
    await repositorio.guardarNuevo(perfil);
    await escribirRegistro(fabrica, segundo);

    await expect(repositorio.obtener()).rejects.toMatchObject({
      codigo: "MULTIPLES_PERFILES_PERSISTIDOS",
    });
    await repositorio.cerrar();
    await expect(leerRegistros(fabrica)).resolves.toEqual([primero, segundo]);
  });

  it.each([
    {
      nombre: "versión futura",
      cambios: { versionEsquema: 2 },
      codigo: "VERSION_PERFIL_NO_SOPORTADA",
    },
    {
      nombre: "fecha inválida",
      cambios: { creadoEn: "sin fecha" },
      codigo: "REGISTRO_PERFIL_INVALIDO",
    },
    {
      nombre: "nombre vacío",
      cambios: { nombreVisible: "   " },
      codigo: "REGISTRO_PERFIL_INVALIDO",
    },
  ])(
    "rechaza $nombre sin sustituir el perfil almacenado",
    async ({ cambios, codigo }) => {
      const { fabrica, repositorio, perfil } = crearEntorno();
      await repositorio.obtener();
      const registro = { ...convertirPerfilUsuarioEnV1(perfil), ...cambios };
      await escribirRegistro(fabrica, registro);

      await expect(repositorio.obtener()).rejects.toMatchObject({ codigo });
      await expect(repositorio.guardarNuevo(perfil)).rejects.toMatchObject({
        codigo: "PERFIL_YA_EXISTE",
      });
      await repositorio.cerrar();
      await expect(leerRegistros(fabrica)).resolves.toEqual([registro]);
    },
  );
});

function crearEntorno() {
  const fabrica = new IDBFactory();
  return {
    fabrica,
    repositorio: crearRepositorio(fabrica),
    perfil: PerfilUsuario.crear({
      id: "perfil-local",
      nombreVisible: "Perfil de prueba",
      creadoEn: new Date("2026-11-05T10:00:00.000Z"),
    }),
  };
}

function crearRepositorio(fabrica: IDBFactory) {
  const repositorio = new RepositorioPerfilUsuarioIndexedDB({
    fabricaIndexedDB: fabrica,
    nombreBaseDatos: NOMBRE_BASE,
  });
  conexiones.push(repositorio);
  return repositorio;
}

async function escribirRegistro(fabrica: IDBFactory, registro: unknown) {
  const base = await abrirBase(fabrica);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaccion = base.transaction(ALMACEN_PERFIL_USUARIO, "readwrite");
      transaccion.objectStore(ALMACEN_PERFIL_USUARIO).put(registro);
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () =>
        reject(
          transaccion.error ??
            new Error("No se pudo preparar el registro de prueba."),
        );
    });
  } finally {
    base.close();
  }
}

async function leerRegistros(fabrica: IDBFactory): Promise<unknown[]> {
  const base = await abrirBase(fabrica);
  try {
    return await new Promise((resolve, reject) => {
      const transaccion = base.transaction(ALMACEN_PERFIL_USUARIO, "readonly");
      const solicitud = transaccion
        .objectStore(ALMACEN_PERFIL_USUARIO)
        .getAll();
      transaccion.oncomplete = () => resolve(solicitud.result as unknown[]);
      transaccion.onabort = () =>
        reject(
          transaccion.error ??
            new Error("No se pudieron leer los registros de prueba."),
        );
    });
  } finally {
    base.close();
  }
}

function abrirBase(fabrica: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = fabrica.open(NOMBRE_BASE);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(
        solicitud.error ?? new Error("No se pudo abrir la base de prueba."),
      );
  });
}
