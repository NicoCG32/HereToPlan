import {
  ContextoPlanificacion,
  IDENTIFICADOR_CONTEXTO_LIBRE,
} from "../../../dominio";
import {
  convertirContextoEnV1,
  rehidratarContextoDesdeV1,
} from "../mapeadores/MapeadorContextoPlanificacionV1";
import { rehidratarAgendaDesdeV1 } from "../mapeadores/MapeadorAgendaV1";
import type { AgendaV1 } from "../registros/AgendaV1";
import type { ContextoPlanificacionV1 } from "../registros/ContextoPlanificacionV1";
import {
  ALMACEN_AGENDAS,
  ALMACEN_CONTEXTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export type CodigoErrorMigracionContextos =
  | "INDEXEDDB_NO_DISPONIBLE"
  | "APERTURA_INDEXEDDB_FALLIDA"
  | "LECTURA_MIGRACION_FALLIDA"
  | "ESCRITURA_MIGRACION_FALLIDA"
  | "CONFLICTO_CONTEXTO_EXISTENTE";

export class ErrorMigracionContextosDesdeAgendas extends Error {
  constructor(
    public readonly codigo: CodigoErrorMigracionContextos,
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorMigracionContextosDesdeAgendas";
  }
}

export interface ConfiguracionMigradorContextosIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export interface ResultadoMigracionContextosDesdeAgendas {
  readonly agendasEvaluadas: number;
  readonly contextosCreados: number;
  readonly libreCreado: boolean;
}

export class MigradorContextosDesdeAgendasIndexedDB {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;

  constructor(configuracion: ConfiguracionMigradorContextosIndexedDB = {}) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorMigracionContextosDesdeAgendas(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible para migrar los contextos.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async ejecutar(
    creadaEnLibre: Date,
  ): Promise<ResultadoMigracionContextosDesdeAgendas> {
    const baseDatos = await this.abrirBaseDatos();
    try {
      return await this.migrarEnTransaccion(baseDatos, creadaEnLibre);
    } finally {
      baseDatos.close();
    }
  }

  private migrarEnTransaccion(
    baseDatos: IDBDatabase,
    creadaEnLibre: Date,
  ): Promise<ResultadoMigracionContextosDesdeAgendas> {
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [ALMACEN_AGENDAS, ALMACEN_CONTEXTOS],
        "readwrite",
      );
      const lecturaAgendas = transaccion.objectStore(ALMACEN_AGENDAS).getAll();
      const almacenContextos = transaccion.objectStore(ALMACEN_CONTEXTOS);
      const lecturaContextos = almacenContextos.getAll();
      let agendas: readonly AgendaV1[] | undefined;
      let contextos: readonly ContextoPlanificacionV1[] | undefined;
      let resultado: ResultadoMigracionContextosDesdeAgendas | undefined;
      let causaAbortado: Error | undefined;

      const prepararEscrituras = () => {
        if (!agendas || !contextos || resultado || causaAbortado) return;
        try {
          const nuevos = this.calcularContextosNuevos(
            agendas,
            contextos,
            creadaEnLibre,
          );
          for (const contexto of nuevos.contextos) {
            almacenContextos.add(convertirContextoEnV1(contexto));
          }
          resultado = Object.freeze({
            agendasEvaluadas: agendas.length,
            contextosCreados: nuevos.contextos.length,
            libreCreado: nuevos.libreCreado,
          });
        } catch (error: unknown) {
          causaAbortado = this.normalizarError(error);
          transaccion.abort();
        }
      };

      lecturaAgendas.onsuccess = () => {
        agendas = lecturaAgendas.result as readonly AgendaV1[];
        prepararEscrituras();
      };
      lecturaContextos.onsuccess = () => {
        contextos =
          lecturaContextos.result as readonly ContextoPlanificacionV1[];
        prepararEscrituras();
      };
      transaccion.oncomplete = () => {
        if (!resultado) {
          reject(
            new ErrorMigracionContextosDesdeAgendas(
              "LECTURA_MIGRACION_FALLIDA",
              "La migración terminó sin evaluar los registros existentes.",
            ),
          );
          return;
        }
        resolve(resultado);
      };
      transaccion.onabort = () => {
        reject(
          causaAbortado ??
            new ErrorMigracionContextosDesdeAgendas(
              lecturaAgendas.error || lecturaContextos.error
                ? "LECTURA_MIGRACION_FALLIDA"
                : "ESCRITURA_MIGRACION_FALLIDA",
              "La migración de contextos fue abortada sin escrituras parciales.",
              transaccion.error ??
                lecturaAgendas.error ??
                lecturaContextos.error,
            ),
        );
      };
    });
  }

  private calcularContextosNuevos(
    registrosAgendas: readonly AgendaV1[],
    registrosContextos: readonly ContextoPlanificacionV1[],
    creadaEnLibre: Date,
  ): Readonly<{
    contextos: readonly ContextoPlanificacion[];
    libreCreado: boolean;
  }> {
    const existentes = new Map(
      registrosContextos.map((registro) => {
        const contexto = rehidratarContextoDesdeV1(registro);
        return [contexto.id, contexto] as const;
      }),
    );
    const nuevos: ContextoPlanificacion[] = [];
    const libreCreado = !existentes.has(IDENTIFICADOR_CONTEXTO_LIBRE);
    if (libreCreado) {
      nuevos.push(ContextoPlanificacion.crearLibre(creadaEnLibre));
    }

    for (const registro of registrosAgendas) {
      const agenda = rehidratarAgendaDesdeV1(registro);
      const candidato = ContextoPlanificacion.crearNombrado({
        id: agenda.id,
        nombre: agenda.nombre,
        fechaInicio: agenda.fechaInicio,
        fechaFin: agenda.fechaFin,
        creadaEn: agenda.creadaEn,
      });
      const existente = existentes.get(candidato.id);
      if (existente && !this.sonEquivalentes(existente, candidato)) {
        throw new ErrorMigracionContextosDesdeAgendas(
          "CONFLICTO_CONTEXTO_EXISTENTE",
          `El contexto ${candidato.id} ya existe con metadatos distintos a AgendaV1.`,
        );
      }
      if (!existente) {
        existentes.set(candidato.id, candidato);
        nuevos.push(candidato);
      }
    }

    return Object.freeze({
      contextos: Object.freeze(nuevos),
      libreCreado,
    });
  }

  private sonEquivalentes(
    existente: ContextoPlanificacion,
    candidato: ContextoPlanificacion,
  ): boolean {
    return (
      existente.tipo === candidato.tipo &&
      existente.nombre === candidato.nombre &&
      existente.fechaInicio?.toString() === candidato.fechaInicio?.toString() &&
      existente.fechaFin?.toString() === candidato.fechaFin?.toString() &&
      existente.creadaEn.getTime() === candidato.creadaEn.getTime()
    );
  }

  private normalizarError(error: unknown): Error {
    return error instanceof Error
      ? error
      : new Error("La validación de la migración falló.", { cause: error });
  }

  private abrirBaseDatos(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const solicitud = this.fabricaIndexedDB.open(
        this.nombreBaseDatos,
        VERSION_BASE_DATOS,
      );
      solicitud.onupgradeneeded = () => asegurarAlmacenes(solicitud.result);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () =>
        reject(
          new ErrorMigracionContextosDesdeAgendas(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos para migrar contextos.",
            solicitud.error,
          ),
        );
      solicitud.onblocked = () =>
        reject(
          new ErrorMigracionContextosDesdeAgendas(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
    });
  }
}
