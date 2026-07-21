import {
  ErrorPerfilNoExiste,
  ErrorPerfilYaExiste,
  type RepositorioPerfilUsuario,
} from "../../../aplicacion";
import type { PerfilUsuario } from "../../../dominio";
import {
  convertirPerfilUsuarioEnV1,
  rehidratarPerfilUsuarioDesdeV1,
} from "../mapeadores/MapeadorPerfilUsuarioV1";
import type { PerfilUsuarioV1 } from "../registros/PerfilUsuarioV1";
import {
  ALMACEN_PERFIL_USUARIO,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorRepositorioPerfilIndexedDB extends Error {
  constructor(
    public readonly codigo:
      | "INDEXEDDB_NO_DISPONIBLE"
      | "APERTURA_INDEXEDDB_FALLIDA"
      | "LECTURA_INDEXEDDB_FALLIDA"
      | "ESCRITURA_INDEXEDDB_FALLIDA"
      | "MULTIPLES_PERFILES_PERSISTIDOS",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorRepositorioPerfilIndexedDB";
  }
}

export interface ConfiguracionRepositorioPerfilIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioPerfilUsuarioIndexedDB implements RepositorioPerfilUsuario {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(configuracion: ConfiguracionRepositorioPerfilIndexedDB = {}) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioPerfilIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async obtener(): Promise<PerfilUsuario | undefined> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_PERFIL_USUARIO,
        "readonly",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_PERFIL_USUARIO)
        .getAll();
      let registros: readonly PerfilUsuarioV1[] = [];
      solicitud.onsuccess = () => {
        registros = solicitud.result as readonly PerfilUsuarioV1[];
      };
      transaccion.oncomplete = () => {
        try {
          if (registros.length > 1) {
            throw new ErrorRepositorioPerfilIndexedDB(
              "MULTIPLES_PERFILES_PERSISTIDOS",
              "El almacenamiento contiene más de un perfil local.",
            );
          }
          resolve(
            registros[0]
              ? rehidratarPerfilUsuarioDesdeV1(registros[0])
              : undefined,
          );
        } catch (error: unknown) {
          reject(
            error instanceof Error
              ? error
              : new Error("La rehidratación del perfil falló.", {
                  cause: error,
                }),
          );
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorRepositorioPerfilIndexedDB(
            "LECTURA_INDEXEDDB_FALLIDA",
            "No fue posible recuperar el perfil local.",
            transaccion.error ?? solicitud.error,
          ),
        );
    });
  }

  public async guardarNuevo(perfil: PerfilUsuario): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_PERFIL_USUARIO,
        "readwrite",
      );
      const almacen = transaccion.objectStore(ALMACEN_PERFIL_USUARIO);
      const lectura = almacen.count();
      let duplicado = false;
      lectura.onsuccess = () => {
        if (lectura.result > 0) {
          duplicado = true;
          transaccion.abort();
          return;
        }
        almacen.add(convertirPerfilUsuarioEnV1(perfil));
      };
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (duplicado) {
          reject(new ErrorPerfilYaExiste());
          return;
        }
        reject(
          new ErrorRepositorioPerfilIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            "No fue posible guardar el perfil local.",
            transaccion.error,
          ),
        );
      };
    });
  }

  public async actualizar(perfil: PerfilUsuario): Promise<void> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_PERFIL_USUARIO,
        "readwrite",
      );
      const almacen = transaccion.objectStore(ALMACEN_PERFIL_USUARIO);
      const lectura = almacen.get(perfil.id);
      let ausente = false;
      lectura.onsuccess = () => {
        if (lectura.result === undefined) {
          ausente = true;
          transaccion.abort();
          return;
        }
        almacen.put(convertirPerfilUsuarioEnV1(perfil));
      };
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (ausente) {
          reject(new ErrorPerfilNoExiste());
          return;
        }
        reject(
          new ErrorRepositorioPerfilIndexedDB(
            "ESCRITURA_INDEXEDDB_FALLIDA",
            "No fue posible actualizar el perfil local.",
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
          new ErrorRepositorioPerfilIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioPerfilIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}
