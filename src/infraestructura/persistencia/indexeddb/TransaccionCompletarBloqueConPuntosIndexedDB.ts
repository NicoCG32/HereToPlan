import {
  ErrorConfirmacionBloqueConPuntosDuplicada,
  type TransaccionCompletarBloqueConPuntos,
} from "../../../aplicacion";
import type {
  ResolucionBloquePlanificacion,
  TransaccionPuntos,
} from "../../../dominio";
import { convertirResolucionBloquePlanificacionEnV1 } from "../mapeadores/MapeadorResolucionBloquePlanificacionV1";
import { convertirTransaccionPuntosEnV1 } from "../mapeadores/MapeadorTransaccionPuntosV1";
import {
  ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
  ALMACEN_TRANSACCIONES_PUNTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorTransaccionCompletarBloqueConPuntosIndexedDB extends Error {
  constructor(
    public readonly codigo:
      | "INDEXEDDB_NO_DISPONIBLE"
      | "APERTURA_INDEXEDDB_FALLIDA"
      | "TRANSACCION_INDEXEDDB_FALLIDA",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorTransaccionCompletarBloqueConPuntosIndexedDB";
  }
}

export interface ConfiguracionTransaccionCompletarBloqueConPuntosIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class TransaccionCompletarBloqueConPuntosIndexedDB implements TransaccionCompletarBloqueConPuntos {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionTransaccionCompletarBloqueConPuntosIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorTransaccionCompletarBloqueConPuntosIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async confirmar(
    resolucion: ResolucionBloquePlanificacion,
    ingreso: TransaccionPuntos,
  ): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [
          ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
          ALMACEN_TRANSACCIONES_PUNTOS,
        ],
        "readwrite",
      );
      const solicitudResolucion = transaccion
        .objectStore(ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION)
        .add(convertirResolucionBloquePlanificacionEnV1(resolucion));
      const solicitudIngreso = transaccion
        .objectStore(ALMACEN_TRANSACCIONES_PUNTOS)
        .add(convertirTransaccionPuntosEnV1(ingreso));

      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        const causa =
          solicitudResolucion.error ??
          solicitudIngreso.error ??
          transaccion.error;
        if (causa?.name === "ConstraintError") {
          reject(new ErrorConfirmacionBloqueConPuntosDuplicada(causa));
          return;
        }
        reject(
          new ErrorTransaccionCompletarBloqueConPuntosIndexedDB(
            "TRANSACCION_INDEXEDDB_FALLIDA",
            "No fue posible confirmar juntos el cumplimiento y su ingreso de puntos.",
            causa,
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
      solicitud.onupgradeneeded = () => asegurarAlmacenes(solicitud.result);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorTransaccionCompletarBloqueConPuntosIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorTransaccionCompletarBloqueConPuntosIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}
