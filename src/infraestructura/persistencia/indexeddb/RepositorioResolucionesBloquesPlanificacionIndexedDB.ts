import {
  ErrorResolucionBloquePlanificacionDuplicada,
  type RepositorioResolucionesBloquesPlanificacion,
} from "../../../aplicacion";
import type {
  Identificador,
  ResolucionBloquePlanificacion,
} from "../../../dominio";
import {
  convertirResolucionBloquePlanificacionEnV1,
  rehidratarResolucionBloquePlanificacionDesdeV1,
} from "../mapeadores/MapeadorResolucionBloquePlanificacionV1";
import type { ResolucionBloquePlanificacionV1 } from "../registros/ResolucionBloquePlanificacionV1";
import {
  ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
  asegurarAlmacenes,
  INDICE_RESOLUCIONES_POR_OPERACION,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorRepositorioResolucionesBloquesIndexedDB extends Error {
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
    this.name = "ErrorRepositorioResolucionesBloquesIndexedDB";
  }
}

export interface ConfiguracionRepositorioResolucionesBloquesIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioResolucionesBloquesPlanificacionIndexedDB implements RepositorioResolucionesBloquesPlanificacion {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionRepositorioResolucionesBloquesIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioResolucionesBloquesIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async guardar(
    resolucion: ResolucionBloquePlanificacion,
  ): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirResolucionBloquePlanificacionEnV1(resolucion);
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
        "readwrite",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION)
        .add(registro);
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (solicitud.error?.name === "ConstraintError") {
          reject(
            new ErrorResolucionBloquePlanificacionDuplicada(
              resolucion.bloqueId,
              resolucion.operacionId,
            ),
          );
          return;
        }
        reject(
          new ErrorRepositorioResolucionesBloquesIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible guardar la resolución del bloque ${resolucion.bloqueId}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
      };
    });
  }

  public obtenerPorBloqueId(
    bloqueId: Identificador,
  ): Promise<ResolucionBloquePlanificacion | undefined> {
    return this.leer((almacen) => almacen.get(bloqueId));
  }

  public obtenerPorOperacionId(
    operacionId: Identificador,
  ): Promise<ResolucionBloquePlanificacion | undefined> {
    return this.leer((almacen) =>
      almacen.index(INDICE_RESOLUCIONES_POR_OPERACION).get(operacionId),
    );
  }

  public async listar(): Promise<readonly ResolucionBloquePlanificacion[]> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
        "readonly",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION)
        .getAll();
      let registros: readonly ResolucionBloquePlanificacionV1[] = [];
      solicitud.onsuccess = () => {
        registros =
          solicitud.result as readonly ResolucionBloquePlanificacionV1[];
      };
      transaccion.oncomplete = () => {
        try {
          resolve(
            registros.map(rehidratarResolucionBloquePlanificacionDesdeV1),
          );
        } catch (error: unknown) {
          reject(normalizarErrorMapeo(error));
        }
      };
      transaccion.onabort = () => reject(this.errorLectura(transaccion.error));
    });
  }

  public async cerrar(): Promise<void> {
    const conexionPendiente = this.conexionPendiente;
    this.conexionPendiente = undefined;
    (await conexionPendiente)?.close();
  }

  private async leer(
    solicitar: (almacen: IDBObjectStore) => IDBRequest<unknown>,
  ): Promise<ResolucionBloquePlanificacion | undefined> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
        "readonly",
      );
      const solicitud = solicitar(
        transaccion.objectStore(ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION),
      );
      let registro: ResolucionBloquePlanificacionV1 | undefined;
      solicitud.onsuccess = () => {
        registro = solicitud.result as
          ResolucionBloquePlanificacionV1 | undefined;
      };
      transaccion.oncomplete = () => {
        try {
          resolve(
            registro
              ? rehidratarResolucionBloquePlanificacionDesdeV1(registro)
              : undefined,
          );
        } catch (error: unknown) {
          reject(normalizarErrorMapeo(error));
        }
      };
      transaccion.onabort = () => reject(this.errorLectura(transaccion.error));
    });
  }

  private errorLectura(
    causa: unknown,
  ): ErrorRepositorioResolucionesBloquesIndexedDB {
    return new ErrorRepositorioResolucionesBloquesIndexedDB(
      "LECTURA_INDEXEDDB_FALLIDA",
      "No fue posible recuperar las resoluciones de bloques.",
      causa,
    );
  }

  private abrirBaseDatos(): Promise<IDBDatabase> {
    this.conexionPendiente ??= new Promise((resolve, reject) => {
      const solicitud = this.fabricaIndexedDB.open(
        this.nombreBaseDatos,
        VERSION_BASE_DATOS,
      );
      solicitud.onupgradeneeded = () => asegurarAlmacenes(solicitud.result);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioResolucionesBloquesIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioResolucionesBloquesIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}

function normalizarErrorMapeo(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("La rehidratación de la resolución del bloque falló.", {
        cause: error,
      });
}
