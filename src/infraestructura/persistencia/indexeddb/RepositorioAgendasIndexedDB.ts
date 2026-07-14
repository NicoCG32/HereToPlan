import {
  ErrorAgendaDuplicada,
  type RepositorioAgendas,
} from "../../../aplicacion";
import type { Agenda, Identificador } from "../../../dominio";
import {
  convertirAgendaEnV1,
  rehidratarAgendaDesdeV1,
} from "../mapeadores/MapeadorAgendaV1";
import type { AgendaV1 } from "../registros/AgendaV1";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";
const VERSION_BASE_DATOS = 1;
const ALMACEN_AGENDAS = "agendas";

export type CodigoErrorRepositorioAgendasIndexedDB =
  | "INDEXEDDB_NO_DISPONIBLE"
  | "APERTURA_INDEXEDDB_FALLIDA"
  | "LECTURA_INDEXEDDB_FALLIDA"
  | "ESCRITURA_INDEXEDDB_FALLIDA";

export class ErrorRepositorioAgendasIndexedDB extends Error {
  constructor(
    public readonly codigo: CodigoErrorRepositorioAgendasIndexedDB,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorRepositorioAgendasIndexedDB";
  }
}

export interface ConfiguracionRepositorioAgendasIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioAgendasIndexedDB implements RepositorioAgendas {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(configuracion: ConfiguracionRepositorioAgendasIndexedDB = {}) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;

    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioAgendasIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }

    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async guardar(agenda: Agenda): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirAgendaEnV1(agenda);

    return new Promise<void>((resolve, reject) => {
      const transaccion = baseDatos.transaction(ALMACEN_AGENDAS, "readwrite");
      const solicitud = transaccion.objectStore(ALMACEN_AGENDAS).add(registro);

      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (solicitud.error?.name === "ConstraintError") {
          reject(new ErrorAgendaDuplicada(agenda.id));
          return;
        }

        reject(
          new ErrorRepositorioAgendasIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible guardar la agenda ${agenda.id}.`,
            transaccion.error ?? solicitud.error,
          ),
        );
      };
    });
  }

  public async obtenerPorId(id: Identificador): Promise<Agenda | undefined> {
    const baseDatos = await this.abrirBaseDatos();

    return new Promise<Agenda | undefined>((resolve, reject) => {
      const transaccion = baseDatos.transaction(ALMACEN_AGENDAS, "readonly");
      const solicitud = transaccion.objectStore(ALMACEN_AGENDAS).get(id);
      let registro: AgendaV1 | undefined;

      solicitud.onsuccess = () => {
        registro = solicitud.result as AgendaV1 | undefined;
      };
      transaccion.oncomplete = () => {
        try {
          resolve(registro ? rehidratarAgendaDesdeV1(registro) : undefined);
        } catch (error: unknown) {
          reject(
            error instanceof Error
              ? error
              : new Error("La rehidratación de la agenda falló.", {
                  cause: error,
                }),
          );
        }
      };
      transaccion.onabort = () => {
        reject(
          new ErrorRepositorioAgendasIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            `No fue posible recuperar la agenda ${id}.`,
            transaccion.error ?? solicitud.error,
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

      solicitud.onupgradeneeded = () => {
        const baseDatos = solicitud.result;
        if (!baseDatos.objectStoreNames.contains(ALMACEN_AGENDAS)) {
          baseDatos.createObjectStore(ALMACEN_AGENDAS, { keyPath: "id" });
        }
      };
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioAgendasIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioAgendasIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos de HereToPlan está bloqueada por otra conexión.",
          ),
        );
      };
    });

    return this.conexionPendiente;
  }
}
