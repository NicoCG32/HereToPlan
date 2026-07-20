import {
  ErrorConflictoPersistenciaSesionCronometro,
  type RepositorioSesionesCronometro,
} from "../../../aplicacion";
import type { Identificador, SesionCronometro } from "../../../dominio";
import {
  convertirSesionCronometroEnV1,
  rehidratarSesionCronometroDesdeV1,
} from "../mapeadores/MapeadorSesionCronometroV1";
import type { SesionCronometroV1 } from "../registros/SesionCronometroV1";
import {
  ALMACEN_SESIONES_CRONOMETRO,
  asegurarAlmacenes,
  INDICE_SESION_ABIERTA,
  INDICE_SESIONES_POR_BLOQUE,
  INDICE_SESIONES_POR_OPERACION,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorRepositorioSesionesCronometroIndexedDB extends Error {
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
    this.name = "ErrorRepositorioSesionesCronometroIndexedDB";
  }
}

export interface ConfiguracionRepositorioSesionesCronometroIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioSesionesCronometroIndexedDB implements RepositorioSesionesCronometro {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionRepositorioSesionesCronometroIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioSesionesCronometroIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async guardar(
    sesion: SesionCronometro,
    revisionEsperada: number,
  ): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    const registro = convertirSesionCronometroEnV1(sesion);
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_SESIONES_CRONOMETRO,
        "readwrite",
      );
      const almacen = transaccion.objectStore(ALMACEN_SESIONES_CRONOMETRO);
      const lectura = almacen.get(sesion.id);
      let escritura: IDBRequest<IDBValidKey> | undefined;
      let conflicto: unknown;
      lectura.onsuccess = () => {
        const actual = lectura.result as SesionCronometroV1 | undefined;
        if (
          (actual && actual.revision !== revisionEsperada) ||
          (!actual && revisionEsperada !== 0)
        ) {
          conflicto = new Error("La revisión esperada ya no es vigente.");
          transaccion.abort();
          return;
        }
        escritura = almacen.put(registro);
      };
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        const causa = conflicto ?? escritura?.error ?? transaccion.error;
        if (
          conflicto ||
          (causa instanceof DOMException && causa.name === "ConstraintError")
        ) {
          reject(new ErrorConflictoPersistenciaSesionCronometro(causa));
          return;
        }
        reject(
          new ErrorRepositorioSesionesCronometroIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            `No fue posible guardar la sesión ${sesion.id}.`,
            causa,
          ),
        );
      };
    });
  }

  public obtenerPorId(
    id: Identificador,
  ): Promise<SesionCronometro | undefined> {
    return this.leer((almacen) => almacen.get(id));
  }

  public obtenerPorOperacionId(
    operacionId: Identificador,
  ): Promise<SesionCronometro | undefined> {
    return this.leer((almacen) =>
      almacen.index(INDICE_SESIONES_POR_OPERACION).get(operacionId),
    );
  }

  public obtenerAbierta(): Promise<SesionCronometro | undefined> {
    return this.leer((almacen) =>
      almacen.index(INDICE_SESION_ABIERTA).get("ABIERTA"),
    );
  }

  public async listarPorBloque(
    bloqueId: Identificador,
  ): Promise<readonly SesionCronometro[]> {
    const registros = await this.listar((almacen) =>
      almacen.index(INDICE_SESIONES_POR_BLOQUE).getAll(bloqueId),
    );
    return registros.map(rehidratarSesionCronometroDesdeV1);
  }

  public async cerrar(): Promise<void> {
    const conexionPendiente = this.conexionPendiente;
    this.conexionPendiente = undefined;
    (await conexionPendiente)?.close();
  }

  private async leer(
    solicitar: (almacen: IDBObjectStore) => IDBRequest,
  ): Promise<SesionCronometro | undefined> {
    const registros = await this.listar((almacen) => solicitar(almacen));
    const registro = registros[0];
    return registro ? rehidratarSesionCronometroDesdeV1(registro) : undefined;
  }

  private async listar(
    solicitar: (almacen: IDBObjectStore) => IDBRequest,
  ): Promise<readonly SesionCronometroV1[]> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_SESIONES_CRONOMETRO,
        "readonly",
      );
      const solicitud = solicitar(
        transaccion.objectStore(ALMACEN_SESIONES_CRONOMETRO),
      );
      transaccion.oncomplete = () => {
        const resultado = solicitud.result as
          SesionCronometroV1 | readonly SesionCronometroV1[] | undefined;
        resolve(
          resultado === undefined
            ? []
            : Array.isArray(resultado)
              ? resultado
              : [resultado as SesionCronometroV1],
        );
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioSesionesCronometroIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            "No fue posible recuperar las sesiones del cronómetro.",
            transaccion.error,
          ),
        );
    });
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
          new ErrorRepositorioSesionesCronometroIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioSesionesCronometroIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}
