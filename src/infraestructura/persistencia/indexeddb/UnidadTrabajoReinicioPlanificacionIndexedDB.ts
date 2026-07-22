import {
  ErrorImpactoReinicioDesactualizado,
  aplicarPoliticaReinicioPlanificacion,
  calcularImpactoReinicioPlanificacion,
  type ComandoTransaccionReinicioPlanificacion,
  type ContenidoRespaldo,
  type ImpactoReinicioPlanificacion,
  type LectorImpactoReinicioPlanificacion,
  type NombreColeccionRespaldo,
  type RegistroRespaldable,
  type ResultadoTransaccionReinicioPlanificacion,
  type UnidadTrabajoReinicioPlanificacion,
} from "../../../aplicacion";
import {
  ALMACENES_RESPALDABLES,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export type CodigoErrorReinicioPlanificacionIndexedDB =
  | "INDEXEDDB_NO_DISPONIBLE"
  | "APERTURA_FALLIDA"
  | "CONSULTA_IMPACTO_FALLIDA"
  | "REINICIO_ATOMICO_FALLIDO";

export class ErrorReinicioPlanificacionIndexedDB extends Error {
  constructor(
    public readonly codigo: CodigoErrorReinicioPlanificacionIndexedDB,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorReinicioPlanificacionIndexedDB";
  }
}

export interface ConfiguracionReinicioPlanificacionIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
  readonly antesDePublicar?: () => void;
}

export class UnidadTrabajoReinicioPlanificacionIndexedDB
  implements
    LectorImpactoReinicioPlanificacion,
    UnidadTrabajoReinicioPlanificacion
{
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private readonly antesDePublicar: (() => void) | undefined;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(configuracion: ConfiguracionReinicioPlanificacionIndexedDB = {}) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorReinicioPlanificacionIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
    this.antesDePublicar = configuracion.antesDePublicar;
  }

  public async consultarImpacto(): Promise<ImpactoReinicioPlanificacion> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise<ImpactoReinicioPlanificacion>((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [...ALMACENES_RESPALDABLES],
        "readonly",
      );
      const lectura = leerColecciones(transaccion);
      transaccion.oncomplete = () => {
        try {
          resolve(calcularImpactoReinicioPlanificacion(lectura.construir()));
        } catch (causa: unknown) {
          reject(
            new ErrorReinicioPlanificacionIndexedDB(
              "CONSULTA_IMPACTO_FALLIDA",
              "No fue posible interpretar el impacto del reinicio.",
              causa,
            ),
          );
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorReinicioPlanificacionIndexedDB(
            "CONSULTA_IMPACTO_FALLIDA",
            "No fue posible obtener una instantánea consistente del impacto.",
            transaccion.error,
          ),
        );
    });
  }

  public async reiniciar(
    comando: ComandoTransaccionReinicioPlanificacion,
  ): Promise<ResultadoTransaccionReinicioPlanificacion> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise<ResultadoTransaccionReinicioPlanificacion>(
      (resolve, reject) => {
        const transaccion = baseDatos.transaction(
          [...ALMACENES_RESPALDABLES],
          "readwrite",
        );
        const lectura = leerColecciones(transaccion);
        let resultado: ResultadoTransaccionReinicioPlanificacion | undefined;
        let impactoDesactualizado = false;
        lectura.alCompletar(() => {
          try {
            const colecciones = lectura.construir();
            const impacto = calcularImpactoReinicioPlanificacion(colecciones);
            if (impacto.totalEliminaciones === 0) {
              resultado = Object.freeze({
                operacionId: comando.operacionId,
                eliminados: 0,
                yaReiniciada: true,
              });
              return;
            }
            if (impacto.huella !== comando.huellaEsperada) {
              impactoDesactualizado = true;
              transaccion.abort();
              return;
            }
            const politica = aplicarPoliticaReinicioPlanificacion(colecciones);
            this.antesDePublicar?.();
            reemplazarColeccion(
              transaccion,
              "agendas",
              politica.estado.agendas,
            );
            reemplazarColeccion(
              transaccion,
              "bloques-planificacion",
              politica.estado.bloques,
            );
            reemplazarColeccion(
              transaccion,
              "cortes-planificacion",
              politica.estado.cortes,
            );
            reemplazarColeccion(
              transaccion,
              "sesiones-cronometro",
              politica.estado.sesiones,
            );
            resultado = Object.freeze({
              operacionId: comando.operacionId,
              eliminados: impacto.totalEliminaciones,
              yaReiniciada: false,
            });
          } catch {
            transaccion.abort();
          }
        });
        transaccion.oncomplete = () => {
          if (resultado) resolve(resultado);
          else
            reject(
              new ErrorReinicioPlanificacionIndexedDB(
                "REINICIO_ATOMICO_FALLIDO",
                "El reinicio terminó sin publicar un resultado verificable.",
              ),
            );
        };
        transaccion.onabort = () =>
          reject(
            impactoDesactualizado
              ? new ErrorImpactoReinicioDesactualizado()
              : new ErrorReinicioPlanificacionIndexedDB(
                  "REINICIO_ATOMICO_FALLIDO",
                  "IndexedDB abortó el reinicio y conservó el estado anterior.",
                  transaccion.error,
                ),
          );
      },
    );
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
          new ErrorReinicioPlanificacionIndexedDB(
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

function leerColecciones(transaccion: IDBTransaction): Readonly<{
  construir: () => ContenidoRespaldo;
  alCompletar: (accion: () => void) => void;
}> {
  const resultados = new Map<
    NombreColeccionRespaldo,
    readonly RegistroRespaldable[]
  >();
  let pendientes: number = ALMACENES_RESPALDABLES.length;
  let accionAlCompletar: (() => void) | undefined;
  for (const nombre of ALMACENES_RESPALDABLES) {
    const solicitud = transaccion.objectStore(nombre).getAll();
    solicitud.onsuccess = () => {
      resultados.set(
        nombre,
        solicitud.result as readonly RegistroRespaldable[],
      );
      pendientes -= 1;
      if (pendientes === 0) accionAlCompletar?.();
    };
  }
  return Object.freeze({
    construir: () =>
      Object.freeze(
        Object.fromEntries(
          ALMACENES_RESPALDABLES.map((nombre) => [
            nombre,
            Object.freeze(resultados.get(nombre) ?? []),
          ]),
        ),
      ) as ContenidoRespaldo,
    alCompletar: (accion: () => void) => {
      accionAlCompletar = accion;
      if (pendientes === 0) accion();
    },
  });
}

function reemplazarColeccion(
  transaccion: IDBTransaction,
  nombre: NombreColeccionRespaldo,
  registros: readonly RegistroRespaldable[],
): void {
  const almacen = transaccion.objectStore(nombre);
  almacen.clear();
  for (const registro of registros) almacen.add(registro);
}
