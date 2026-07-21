import type {
  ContenidoRespaldo,
  LectorEstadoPersistente,
  NombreColeccionRespaldo,
  RegistroRespaldable,
  EstadoPersistenteRespaldable,
} from "../../../aplicacion";
import {
  ALMACENES_RESPALDABLES,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export type CodigoErrorLectorEstadoIndexedDB =
  "INDEXEDDB_NO_DISPONIBLE" | "APERTURA_FALLIDA" | "LECTURA_FALLIDA";

export class ErrorLectorEstadoIndexedDB extends Error {
  constructor(
    public readonly codigo: CodigoErrorLectorEstadoIndexedDB,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorLectorEstadoIndexedDB";
  }
}

export interface ConfiguracionLectorEstadoIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class LectorEstadoPersistenteIndexedDB implements LectorEstadoPersistente {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(configuracion: ConfiguracionLectorEstadoIndexedDB = {}) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorLectorEstadoIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async leerEstadoCompleto(): Promise<EstadoPersistenteRespaldable> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise<EstadoPersistenteRespaldable>((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [...ALMACENES_RESPALDABLES],
        "readonly",
      );
      const resultados = new Map<
        NombreColeccionRespaldo,
        readonly RegistroRespaldable[]
      >();

      for (const nombre of ALMACENES_RESPALDABLES) {
        const solicitud = transaccion.objectStore(nombre).getAll();
        solicitud.onsuccess = () => {
          resultados.set(
            nombre,
            Object.freeze(solicitud.result as readonly RegistroRespaldable[]),
          );
        };
      }

      transaccion.oncomplete = () => {
        const pares = ALMACENES_RESPALDABLES.map(
          (nombre) =>
            [nombre, resultados.get(nombre) ?? Object.freeze([])] as const,
        );
        resolve(
          Object.freeze({
            versionBaseDatos: baseDatos.version,
            colecciones: Object.freeze(
              Object.fromEntries(pares),
            ) as ContenidoRespaldo,
          }),
        );
      };
      transaccion.onabort = () =>
        reject(
          new ErrorLectorEstadoIndexedDB(
            "LECTURA_FALLIDA",
            "No fue posible tomar una instantánea consistente de los datos.",
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
          new ErrorLectorEstadoIndexedDB(
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
