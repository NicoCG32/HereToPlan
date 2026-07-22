import {
  ErrorContextoDuplicado,
  ErrorContextoNoEncontrado,
  type RepositorioContextosPlanificacion,
} from "../../../aplicacion";
import type { ContextoPlanificacion, Identificador } from "../../../dominio";
import {
  convertirContextoEnV1,
  rehidratarContextoDesdeV1,
} from "../mapeadores/MapeadorContextoPlanificacionV1";
import type { ContextoPlanificacionV1 } from "../registros/ContextoPlanificacionV1";
import {
  ALMACEN_CONTEXTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorRepositorioContextosIndexedDB extends Error {
  constructor(
    public readonly codigo:
      | "INDEXEDDB_NO_DISPONIBLE"
      | "APERTURA_INDEXEDDB_FALLIDA"
      | "LECTURA_INDEXEDDB_FALLIDA"
      | "ESCRITURA_INDEXEDDB_FALLIDA",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorRepositorioContextosIndexedDB";
  }
}

export interface ConfiguracionRepositorioContextosIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioContextosPlanificacionIndexedDB implements RepositorioContextosPlanificacion {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(configuracion: ConfiguracionRepositorioContextosIndexedDB = {}) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioContextosIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async guardar(contexto: ContextoPlanificacion): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirContextoEnV1(contexto);
    return new Promise<void>((resolve, reject) => {
      const transaccion = baseDatos.transaction(ALMACEN_CONTEXTOS, "readwrite");
      const solicitud = transaccion
        .objectStore(ALMACEN_CONTEXTOS)
        .add(registro);
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (solicitud.error?.name === "ConstraintError") {
          reject(new ErrorContextoDuplicado(contexto.id));
          return;
        }
        reject(
          new ErrorRepositorioContextosIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible guardar el contexto ${contexto.id}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
      };
    });
  }

  public async obtenerPorId(
    id: Identificador,
  ): Promise<ContextoPlanificacion | undefined> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(ALMACEN_CONTEXTOS, "readonly");
      const solicitud = transaccion.objectStore(ALMACEN_CONTEXTOS).get(id);
      let registro: ContextoPlanificacionV1 | undefined;
      solicitud.onsuccess = () => {
        registro = solicitud.result as ContextoPlanificacionV1 | undefined;
      };
      transaccion.oncomplete = () => {
        try {
          resolve(registro ? rehidratarContextoDesdeV1(registro) : undefined);
        } catch (error: unknown) {
          reject(
            error instanceof Error
              ? error
              : new Error("La rehidratación del contexto falló.", {
                  cause: error,
                }),
          );
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioContextosIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            `No fue posible recuperar el contexto ${id}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
    });
  }

  public async actualizar(contexto: ContextoPlanificacion): Promise<void> {
    contexto.exigirEliminable();
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirContextoEnV1(contexto);
    return new Promise<void>((resolve, reject) => {
      const transaccion = baseDatos.transaction(ALMACEN_CONTEXTOS, "readwrite");
      const almacen = transaccion.objectStore(ALMACEN_CONTEXTOS);
      const lectura = almacen.get(contexto.id);
      let ausente = false;
      lectura.onsuccess = () => {
        if (lectura.result === undefined) {
          ausente = true;
          transaccion.abort();
          return;
        }
        almacen.put(registro);
      };
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (ausente) {
          reject(new ErrorContextoNoEncontrado(contexto.id));
          return;
        }
        reject(
          new ErrorRepositorioContextosIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible actualizar el contexto ${contexto.id}.`,
            transaccion.error,
          ),
        );
      };
    });
  }

  public async listar(): Promise<readonly ContextoPlanificacion[]> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(ALMACEN_CONTEXTOS, "readonly");
      const solicitud = transaccion.objectStore(ALMACEN_CONTEXTOS).getAll();
      let registros: readonly ContextoPlanificacionV1[] = [];
      solicitud.onsuccess = () => {
        registros = solicitud.result as readonly ContextoPlanificacionV1[];
      };
      transaccion.oncomplete = () => {
        try {
          resolve(registros.map(rehidratarContextoDesdeV1));
        } catch (error: unknown) {
          reject(
            error instanceof Error
              ? error
              : new Error("La rehidratación de los contextos falló.", {
                  cause: error,
                }),
          );
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioContextosIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            "No fue posible recuperar los contextos.",
            transaccion.error ?? solicitud.error,
          ),
        );
    });
  }

  public async eliminar(contexto: ContextoPlanificacion): Promise<void> {
    contexto.exigirEliminable();
    const baseDatos = await this.abrirBaseDatos();
    return new Promise<void>((resolve, reject) => {
      const transaccion = baseDatos.transaction(ALMACEN_CONTEXTOS, "readwrite");
      const almacen = transaccion.objectStore(ALMACEN_CONTEXTOS);
      const lectura = almacen.get(contexto.id);
      let ausente = false;
      lectura.onsuccess = () => {
        if (lectura.result === undefined) {
          ausente = true;
          transaccion.abort();
          return;
        }
        almacen.delete(contexto.id);
      };
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (ausente) {
          reject(new ErrorContextoNoEncontrado(contexto.id));
          return;
        }
        reject(
          new ErrorRepositorioContextosIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible eliminar el contexto ${contexto.id}.`,
            transaccion.error,
          ),
        );
      };
    });
  }

  public async cerrar(): Promise<void> {
    const conexionPendiente = this.conexionPendiente;
    this.conexionPendiente = undefined;
    (await conexionPendiente)?.close();
  }

  private abrirBaseDatos(): Promise<IDBDatabase> {
    this.conexionPendiente ??= new Promise((resolve, reject) => {
      const solicitud = this.fabricaIndexedDB.open(
        this.nombreBaseDatos,
        VERSION_BASE_DATOS,
      );
      solicitud.onupgradeneeded = () =>
        asegurarAlmacenes(solicitud.result, solicitud.transaction ?? undefined);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioContextosIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioContextosIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}
