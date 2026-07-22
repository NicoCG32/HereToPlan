import {
  ErrorBloquePlanificacionDuplicado,
  ErrorBloquePlanificacionNoEncontrado,
  type RepositorioBloquesPlanificacion,
} from "../../../aplicacion";
import type { BloquePlanificacion, Identificador } from "../../../dominio";
import {
  convertirBloquePlanificacionEnV1,
  rehidratarBloquePlanificacionDesdeV1,
} from "../mapeadores/MapeadorBloquePlanificacionV1";
import type { BloquePlanificacionV1 } from "../registros/BloquePlanificacionV1";
import {
  ALMACEN_BLOQUES_PLANIFICACION,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorRepositorioBloquesPlanificacionIndexedDB extends Error {
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
    this.name = "ErrorRepositorioBloquesPlanificacionIndexedDB";
  }
}

export interface ConfiguracionRepositorioBloquesPlanificacionIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioBloquesPlanificacionIndexedDB implements RepositorioBloquesPlanificacion {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionRepositorioBloquesPlanificacionIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioBloquesPlanificacionIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async guardar(bloque: BloquePlanificacion): Promise<void> {
    return this.escribir(bloque, "add");
  }

  public async guardarTodos(
    bloques: readonly BloquePlanificacion[],
  ): Promise<void> {
    if (bloques.length === 0) return;
    const baseDatos = await this.abrirBaseDatos();
    const registros = bloques.map(convertirBloquePlanificacionEnV1);
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_BLOQUES_PLANIFICACION,
        "readwrite",
      );
      const almacen = transaccion.objectStore(ALMACEN_BLOQUES_PLANIFICACION);
      const solicitudes = registros.map((registro) => almacen.add(registro));
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        const indiceDuplicado = solicitudes.findIndex(
          (solicitud) => solicitud.error?.name === "ConstraintError",
        );
        if (indiceDuplicado >= 0) {
          reject(
            new ErrorBloquePlanificacionDuplicado(bloques[indiceDuplicado]!.id),
          );
          return;
        }
        reject(
          new ErrorRepositorioBloquesPlanificacionIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            "No fue posible guardar la asignación recurrente del hábito.",
            transaccion.error,
          ),
        );
      };
    });
  }

  public async actualizar(bloque: BloquePlanificacion): Promise<void> {
    const existente = await this.obtenerPorId(bloque.id);
    if (!existente) {
      throw new ErrorBloquePlanificacionNoEncontrado(bloque.id);
    }
    return this.escribir(bloque, "put");
  }

  public async obtenerPorId(
    id: Identificador,
  ): Promise<BloquePlanificacion | undefined> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_BLOQUES_PLANIFICACION,
        "readonly",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_BLOQUES_PLANIFICACION)
        .get(id);
      let registro: BloquePlanificacionV1 | undefined;
      solicitud.onsuccess = () => {
        registro = solicitud.result as BloquePlanificacionV1 | undefined;
      };
      transaccion.oncomplete = () => {
        try {
          resolve(
            registro
              ? rehidratarBloquePlanificacionDesdeV1(registro)
              : undefined,
          );
        } catch (error: unknown) {
          reject(normalizarErrorMapeo(error));
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioBloquesPlanificacionIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            `No fue posible recuperar el bloque ${id}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
    });
  }

  public async listar(): Promise<readonly BloquePlanificacion[]> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_BLOQUES_PLANIFICACION,
        "readonly",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_BLOQUES_PLANIFICACION)
        .getAll();
      let registros: readonly BloquePlanificacionV1[] = [];
      solicitud.onsuccess = () => {
        registros = solicitud.result as readonly BloquePlanificacionV1[];
      };
      transaccion.oncomplete = () => {
        try {
          resolve(registros.map(rehidratarBloquePlanificacionDesdeV1));
        } catch (error: unknown) {
          reject(normalizarErrorMapeo(error));
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioBloquesPlanificacionIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            "No fue posible recuperar los bloques de planificación.",
            transaccion.error ?? solicitud.error,
          ),
        );
    });
  }

  public async eliminar(id: Identificador): Promise<void> {
    if (!(await this.obtenerPorId(id))) {
      throw new ErrorBloquePlanificacionNoEncontrado(id);
    }
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_BLOQUES_PLANIFICACION,
        "readwrite",
      );
      transaccion.objectStore(ALMACEN_BLOQUES_PLANIFICACION).delete(id);
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioBloquesPlanificacionIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible eliminar el bloque ${id}.`,
            transaccion.error,
          ),
        );
    });
  }

  public async cerrar(): Promise<void> {
    const conexionPendiente = this.conexionPendiente;
    this.conexionPendiente = undefined;
    (await conexionPendiente)?.close();
  }

  private async escribir(
    bloque: BloquePlanificacion,
    operacion: "add" | "put",
  ): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirBloquePlanificacionEnV1(bloque);
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_BLOQUES_PLANIFICACION,
        "readwrite",
      );
      const almacen = transaccion.objectStore(ALMACEN_BLOQUES_PLANIFICACION);
      const solicitud =
        operacion === "add" ? almacen.add(registro) : almacen.put(registro);
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (solicitud.error?.name === "ConstraintError") {
          reject(new ErrorBloquePlanificacionDuplicado(bloque.id));
          return;
        }
        reject(
          new ErrorRepositorioBloquesPlanificacionIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible guardar el bloque ${bloque.id}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
      };
    });
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
          new ErrorRepositorioBloquesPlanificacionIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioBloquesPlanificacionIndexedDB(
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
    : new Error("La rehidratación del bloque de planificación falló.", {
        cause: error,
      });
}
