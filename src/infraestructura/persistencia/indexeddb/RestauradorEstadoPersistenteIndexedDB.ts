import type {
  EstadoPersistenteRespaldable,
  RestauradorEstadoPersistente,
} from "../../../aplicacion";
import {
  ALMACENES_RESPALDABLES,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export type CodigoErrorRestauradorEstadoIndexedDB =
  "INDEXEDDB_NO_DISPONIBLE" | "APERTURA_FALLIDA" | "REEMPLAZO_ATOMICO_FALLIDO";

export class ErrorRestauradorEstadoIndexedDB extends Error {
  constructor(
    public readonly codigo: CodigoErrorRestauradorEstadoIndexedDB,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorRestauradorEstadoIndexedDB";
  }
}

export interface ConfiguracionRestauradorEstadoIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RestauradorEstadoPersistenteIndexedDB implements RestauradorEstadoPersistente {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(configuracion: ConfiguracionRestauradorEstadoIndexedDB = {}) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRestauradorEstadoIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async reemplazarEstadoCompleto(
    estado: EstadoPersistenteRespaldable,
  ): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise<void>((resolve, reject) => {
      let transaccion: IDBTransaction | undefined;
      try {
        transaccion = baseDatos.transaction(
          [...ALMACENES_RESPALDABLES],
          "readwrite",
        );
        transaccion.oncomplete = () => resolve();
        transaccion.onabort = () =>
          reject(
            new ErrorRestauradorEstadoIndexedDB(
              "REEMPLAZO_ATOMICO_FALLIDO",
              "IndexedDB abortó la restauración y conservó el estado anterior.",
              transaccion?.error,
            ),
          );

        for (const nombre of ALMACENES_RESPALDABLES) {
          const almacen = transaccion.objectStore(nombre);
          almacen.clear();
          for (const registro of estado.colecciones[nombre]) {
            almacen.add(registro);
          }
        }
      } catch (causa: unknown) {
        try {
          transaccion?.abort();
        } catch (errorAlAbortar: unknown) {
          void errorAlAbortar;
        }
        reject(
          new ErrorRestauradorEstadoIndexedDB(
            "REEMPLAZO_ATOMICO_FALLIDO",
            "No fue posible preparar el reemplazo atómico del estado.",
            causa,
          ),
        );
        return;
      }
    });
  }

  public async cerrar(): Promise<void> {
    const conexionPendiente = this.conexionPendiente;
    this.conexionPendiente = undefined;
    (await conexionPendiente)?.close();
  }

  private abrirBaseDatos(): Promise<IDBDatabase> {
    this.conexionPendiente ??= new Promise<IDBDatabase>((resolve, reject) => {
      const solicitud = this.fabricaIndexedDB.open(
        this.nombreBaseDatos,
        VERSION_BASE_DATOS,
      );
      solicitud.onupgradeneeded = () => asegurarAlmacenes(solicitud.result);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRestauradorEstadoIndexedDB(
            "APERTURA_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}
