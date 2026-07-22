import {
  ErrorActividadDuplicada,
  ErrorActividadNoEncontrada,
  type RepositorioActividades,
} from "../../../aplicacion";
import type { Actividad, Identificador } from "../../../dominio";
import {
  convertirActividadEnV1,
  rehidratarActividadDesdeV1,
} from "../mapeadores/MapeadorActividadV1";
import type { ActividadV1 } from "../registros/ActividadV1";
import {
  ALMACEN_ACTIVIDADES,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export type CodigoErrorRepositorioActividadesIndexedDB =
  | "INDEXEDDB_NO_DISPONIBLE"
  | "APERTURA_INDEXEDDB_FALLIDA"
  | "LECTURA_INDEXEDDB_FALLIDA"
  | "ESCRITURA_INDEXEDDB_FALLIDA";

export class ErrorRepositorioActividadesIndexedDB extends Error {
  constructor(
    public readonly codigo: CodigoErrorRepositorioActividadesIndexedDB,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorRepositorioActividadesIndexedDB";
  }
}

export interface ConfiguracionRepositorioActividadesIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioActividadesIndexedDB implements RepositorioActividades {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionRepositorioActividadesIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioActividadesIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async guardar(actividad: Actividad): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirActividadEnV1(actividad);

    return new Promise<void>((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_ACTIVIDADES,
        "readwrite",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_ACTIVIDADES)
        .add(registro);
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (solicitud.error?.name === "ConstraintError") {
          reject(new ErrorActividadDuplicada(actividad.id));
          return;
        }
        reject(
          new ErrorRepositorioActividadesIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible guardar la actividad ${actividad.id}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
      };
    });
  }

  public async obtenerPorId(id: Identificador): Promise<Actividad | undefined> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise<Actividad | undefined>((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_ACTIVIDADES,
        "readonly",
      );
      const solicitud = transaccion.objectStore(ALMACEN_ACTIVIDADES).get(id);
      let registro: ActividadV1 | undefined;
      solicitud.onsuccess = () => {
        registro = solicitud.result as ActividadV1 | undefined;
      };
      transaccion.oncomplete = () => {
        try {
          resolve(registro ? rehidratarActividadDesdeV1(registro) : undefined);
        } catch (error: unknown) {
          reject(
            error instanceof Error
              ? error
              : new Error("La rehidratación de la actividad falló.", {
                  cause: error,
                }),
          );
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioActividadesIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            `No fue posible recuperar la actividad ${id}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
    });
  }

  public async actualizar(actividad: Actividad): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirActividadEnV1(actividad);
    return new Promise<void>((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_ACTIVIDADES,
        "readwrite",
      );
      const almacen = transaccion.objectStore(ALMACEN_ACTIVIDADES);
      const lectura = almacen.get(actividad.id);
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
          reject(new ErrorActividadNoEncontrada(actividad.id));
          return;
        }
        reject(
          new ErrorRepositorioActividadesIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible actualizar la actividad ${actividad.id}.`,
            transaccion.error,
          ),
        );
      };
    });
  }

  public async listar(): Promise<readonly Actividad[]> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise<readonly Actividad[]>((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_ACTIVIDADES,
        "readonly",
      );
      const solicitud = transaccion.objectStore(ALMACEN_ACTIVIDADES).getAll();
      let registros: readonly ActividadV1[] = [];
      solicitud.onsuccess = () => {
        registros = solicitud.result as readonly ActividadV1[];
      };
      transaccion.oncomplete = () => {
        try {
          resolve(registros.map(rehidratarActividadDesdeV1));
        } catch (error: unknown) {
          reject(
            error instanceof Error
              ? error
              : new Error("La rehidratación de las actividades falló.", {
                  cause: error,
                }),
          );
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioActividadesIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            "No fue posible recuperar las actividades.",
            transaccion.error ?? solicitud.error,
          ),
        );
    });
  }

  public async eliminar(id: Identificador): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise<void>((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_ACTIVIDADES,
        "readwrite",
      );
      const almacen = transaccion.objectStore(ALMACEN_ACTIVIDADES);
      const lectura = almacen.get(id);
      let ausente = false;
      lectura.onsuccess = () => {
        if (lectura.result === undefined) {
          ausente = true;
          transaccion.abort();
          return;
        }
        almacen.delete(id);
      };
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (ausente) {
          reject(new ErrorActividadNoEncontrada(id));
          return;
        }
        reject(
          new ErrorRepositorioActividadesIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible eliminar la actividad ${id}.`,
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
    this.conexionPendiente ??= new Promise<IDBDatabase>((resolve, reject) => {
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
          new ErrorRepositorioActividadesIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioActividadesIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos de HereToPlan está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}
