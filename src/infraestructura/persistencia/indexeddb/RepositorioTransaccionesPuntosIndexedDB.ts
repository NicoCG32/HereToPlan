import {
  ErrorTransaccionPuntosDuplicada,
  type RepositorioTransaccionesPuntos,
} from "../../../aplicacion";
import type { TransaccionPuntos } from "../../../dominio";
import {
  convertirTransaccionPuntosEnV1,
  rehidratarTransaccionPuntosDesdeV1,
} from "../mapeadores/MapeadorTransaccionPuntosV1";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";
import {
  ALMACEN_TRANSACCIONES_PUNTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorRepositorioTransaccionesPuntosIndexedDB extends Error {
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
    this.name = "ErrorRepositorioTransaccionesPuntosIndexedDB";
  }
}

export interface ConfiguracionRepositorioTransaccionesPuntosIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioTransaccionesPuntosIndexedDB implements RepositorioTransaccionesPuntos {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionRepositorioTransaccionesPuntosIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioTransaccionesPuntosIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async guardar(transaccionPuntos: TransaccionPuntos): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirTransaccionPuntosEnV1(transaccionPuntos);
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_TRANSACCIONES_PUNTOS,
        "readwrite",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_TRANSACCIONES_PUNTOS)
        .add(registro);
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (solicitud.error?.name === "ConstraintError") {
          reject(
            new ErrorTransaccionPuntosDuplicada(
              transaccionPuntos.id,
              transaccionPuntos.fuenteTipo,
              transaccionPuntos.fuenteId,
              solicitud.error,
            ),
          );
          return;
        }
        reject(
          new ErrorRepositorioTransaccionesPuntosIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible guardar la transacción de puntos ${transaccionPuntos.id}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
      };
    });
  }

  public async listar(): Promise<readonly TransaccionPuntos[]> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_TRANSACCIONES_PUNTOS,
        "readonly",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_TRANSACCIONES_PUNTOS)
        .getAll();
      let registros: readonly TransaccionPuntosV1[] = [];
      solicitud.onsuccess = () => {
        registros = solicitud.result as readonly TransaccionPuntosV1[];
      };
      transaccion.oncomplete = () => {
        try {
          resolve(registros.map(rehidratarTransaccionPuntosDesdeV1));
        } catch (error: unknown) {
          reject(normalizarError(error));
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioTransaccionesPuntosIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            "No fue posible recuperar las transacciones de puntos.",
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
          new ErrorRepositorioTransaccionesPuntosIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioTransaccionesPuntosIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}

function normalizarError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("La rehidratación de transacciones de puntos falló.", {
        cause: error,
      });
}
