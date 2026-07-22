import {
  ErrorCortePlanificacionDuplicado,
  ErrorCortePlanificacionNoEncontrado,
  type RepositorioCortesPlanificacion,
} from "../../../aplicacion";
import type { CortePlanificacion, Identificador } from "../../../dominio";
import {
  convertirCortePlanificacionEnV1,
  rehidratarCortePlanificacionDesdeV1,
} from "../mapeadores/MapeadorCortePlanificacionV1";
import type { CortePlanificacionV1 } from "../registros/CortePlanificacionV1";
import {
  ALMACEN_CORTES_PLANIFICACION,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorRepositorioCortesPlanificacionIndexedDB extends Error {
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
    this.name = "ErrorRepositorioCortesPlanificacionIndexedDB";
  }
}

export interface ConfiguracionRepositorioCortesPlanificacionIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioCortesPlanificacionIndexedDB implements RepositorioCortesPlanificacion {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionRepositorioCortesPlanificacionIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioCortesPlanificacionIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async guardar(corte: CortePlanificacion): Promise<void> {
    return this.escribir(corte, "add");
  }

  public async actualizar(corte: CortePlanificacion): Promise<void> {
    if (!(await this.obtenerPorId(corte.id))) {
      throw new ErrorCortePlanificacionNoEncontrado(corte.id);
    }
    return this.escribir(corte, "put");
  }

  public async obtenerPorId(
    id: Identificador,
  ): Promise<CortePlanificacion | undefined> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_CORTES_PLANIFICACION,
        "readonly",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_CORTES_PLANIFICACION)
        .get(id);
      let registro: CortePlanificacionV1 | undefined;
      solicitud.onsuccess = () => {
        registro = solicitud.result as CortePlanificacionV1 | undefined;
      };
      transaccion.oncomplete = () => {
        try {
          resolve(
            registro
              ? rehidratarCortePlanificacionDesdeV1(registro)
              : undefined,
          );
        } catch (error: unknown) {
          reject(normalizarErrorMapeo(error));
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioCortesPlanificacionIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            `No fue posible recuperar el corte ${id}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
    });
  }

  public async listar(): Promise<readonly CortePlanificacion[]> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_CORTES_PLANIFICACION,
        "readonly",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_CORTES_PLANIFICACION)
        .getAll();
      let registros: readonly CortePlanificacionV1[] = [];
      solicitud.onsuccess = () => {
        registros = solicitud.result as readonly CortePlanificacionV1[];
      };
      transaccion.oncomplete = () => {
        try {
          resolve(registros.map(rehidratarCortePlanificacionDesdeV1));
        } catch (error: unknown) {
          reject(normalizarErrorMapeo(error));
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioCortesPlanificacionIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            "No fue posible recuperar los cortes de planificación.",
            transaccion.error ?? solicitud.error,
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
    corte: CortePlanificacion,
    operacion: "add" | "put",
  ): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirCortePlanificacionEnV1(corte);
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_CORTES_PLANIFICACION,
        "readwrite",
      );
      const almacen = transaccion.objectStore(ALMACEN_CORTES_PLANIFICACION);
      const solicitud =
        operacion === "add" ? almacen.add(registro) : almacen.put(registro);
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (solicitud.error?.name === "ConstraintError") {
          reject(new ErrorCortePlanificacionDuplicado(corte.id));
          return;
        }
        reject(
          new ErrorRepositorioCortesPlanificacionIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible guardar el corte ${corte.id}.`,
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
          new ErrorRepositorioCortesPlanificacionIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioCortesPlanificacionIndexedDB(
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
    : new Error("La rehidratación del corte de planificación falló.", {
        cause: error,
      });
}
