import {
  ErrorContextoNoEncontrado,
  ErrorImpactoEliminacionDesactualizado,
  type ComandoTransaccionEliminacionContexto,
  type ImpactoPersistenteEliminacionContexto,
  type ResultadoTransaccionEliminacionContexto,
  type TransaccionEliminacionContextoPlanificacion,
} from "../../../aplicacion";
import { IDENTIFICADOR_CONTEXTO_LIBRE } from "../../../dominio";
import { rehidratarAgendaDesdeV1 } from "../mapeadores/MapeadorAgendaV1";
import { rehidratarBloquePlanificacionDesdeV1 } from "../mapeadores/MapeadorBloquePlanificacionV1";
import { rehidratarContextoDesdeV1 } from "../mapeadores/MapeadorContextoPlanificacionV1";
import type { AgendaV1 } from "../registros/AgendaV1";
import type { BloquePlanificacionV1 } from "../registros/BloquePlanificacionV1";
import type { ContextoPlanificacionV1 } from "../registros/ContextoPlanificacionV1";
import {
  ALMACEN_AGENDAS,
  ALMACEN_BLOQUES_PLANIFICACION,
  ALMACEN_CONTEXTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export interface ConfiguracionTransaccionEliminacionContextoIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class ErrorTransaccionEliminacionContextoIndexedDB extends Error {
  public readonly codigo = "TRANSACCION_ELIMINACION_CONTEXTO_FALLIDA";

  constructor(
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorTransaccionEliminacionContextoIndexedDB";
  }
}

export class TransaccionEliminacionContextoPlanificacionIndexedDB implements TransaccionEliminacionContextoPlanificacion {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionTransaccionEliminacionContextoIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorTransaccionEliminacionContextoIndexedDB(
        "IndexedDB no está disponible para eliminar la agenda de forma atómica.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async consultarImpacto(
    contextoId: string,
  ): Promise<ImpactoPersistenteEliminacionContexto> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [ALMACEN_CONTEXTOS, ALMACEN_BLOQUES_PLANIFICACION, ALMACEN_AGENDAS],
        "readonly",
      );
      const contexto = transaccion
        .objectStore(ALMACEN_CONTEXTOS)
        .get(contextoId);
      const bloques = transaccion
        .objectStore(ALMACEN_BLOQUES_PLANIFICACION)
        .getAll();
      const agendas = transaccion.objectStore(ALMACEN_AGENDAS).getAll();
      transaccion.oncomplete = () => {
        try {
          const registroContexto = contexto.result as
            ContextoPlanificacionV1 | undefined;
          if (!registroContexto)
            throw new ErrorContextoNoEncontrado(contextoId);
          rehidratarContextoDesdeV1(registroContexto).exigirEliminable();
          resolve(
            calcularImpacto(
              contextoId,
              bloques.result as readonly BloquePlanificacionV1[],
              agendas.result as readonly AgendaV1[],
            ),
          );
        } catch (error: unknown) {
          reject(normalizarError(error));
        }
      };
      transaccion.onabort = () =>
        reject(
          new ErrorTransaccionEliminacionContextoIndexedDB(
            "No fue posible calcular el impacto de eliminar la agenda.",
            transaccion.error,
          ),
        );
    });
  }

  public async ejecutar(
    comando: ComandoTransaccionEliminacionContexto,
  ): Promise<ResultadoTransaccionEliminacionContexto> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [ALMACEN_CONTEXTOS, ALMACEN_BLOQUES_PLANIFICACION, ALMACEN_AGENDAS],
        "readwrite",
      );
      const almacenContextos = transaccion.objectStore(ALMACEN_CONTEXTOS);
      const almacenBloques = transaccion.objectStore(
        ALMACEN_BLOQUES_PLANIFICACION,
      );
      const contexto = almacenContextos.get(comando.contextoId);
      const libre = almacenContextos.get(IDENTIFICADOR_CONTEXTO_LIBRE);
      const bloques = almacenBloques.getAll();
      const agendas = transaccion.objectStore(ALMACEN_AGENDAS).getAll();
      let lecturasCompletadas = 0;
      let errorControlado: Error | undefined;
      let resultado: ResultadoTransaccionEliminacionContexto | undefined;

      const prepararEscrituras = () => {
        lecturasCompletadas += 1;
        if (lecturasCompletadas !== 4) return;
        try {
          const registroContexto = contexto.result as
            ContextoPlanificacionV1 | undefined;
          if (!registroContexto) {
            throw new ErrorContextoNoEncontrado(comando.contextoId);
          }
          rehidratarContextoDesdeV1(registroContexto).exigirEliminable();
          if (
            comando.estrategia === "TRASLADAR_A_LIBRE" &&
            libre.result === undefined
          ) {
            throw new Error(
              "El contexto Libre debe existir antes de trasladar la planificación.",
            );
          }
          const registrosBloques =
            bloques.result as readonly BloquePlanificacionV1[];
          const registrosAgendas = agendas.result as readonly AgendaV1[];
          const impacto = calcularImpacto(
            comando.contextoId,
            registrosBloques,
            registrosAgendas,
          );
          if (impacto.huella !== comando.huellaEsperada) {
            throw new ErrorImpactoEliminacionDesactualizado();
          }
          const relacionados = registrosBloques.filter(
            (bloque) => bloque.contextoId === comando.contextoId,
          );
          for (const bloque of relacionados) {
            if (comando.estrategia === "TRASLADAR_A_LIBRE") {
              almacenBloques.put(
                Object.freeze({
                  ...bloque,
                  contextoId: IDENTIFICADOR_CONTEXTO_LIBRE,
                }),
              );
            } else {
              almacenBloques.delete(bloque.id);
            }
          }
          almacenContextos.delete(comando.contextoId);
          resultado = Object.freeze({
            cantidadBloquesTrasladados:
              comando.estrategia === "TRASLADAR_A_LIBRE"
                ? relacionados.length
                : 0,
            cantidadBloquesEliminados:
              comando.estrategia === "ELIMINAR_BORRADORES"
                ? relacionados.length
                : 0,
            cantidadRegistrosConfirmadosConservados:
              impacto.cantidadRegistrosConfirmados,
          });
        } catch (error: unknown) {
          errorControlado = normalizarError(error);
          transaccion.abort();
        }
      };

      contexto.onsuccess = prepararEscrituras;
      libre.onsuccess = prepararEscrituras;
      bloques.onsuccess = prepararEscrituras;
      agendas.onsuccess = prepararEscrituras;
      transaccion.oncomplete = () => {
        if (!resultado) {
          reject(
            new ErrorTransaccionEliminacionContextoIndexedDB(
              "La eliminación terminó sin un resultado verificable.",
            ),
          );
          return;
        }
        resolve(resultado);
      };
      transaccion.onabort = () =>
        reject(
          errorControlado ??
            new ErrorTransaccionEliminacionContextoIndexedDB(
              "No fue posible eliminar la agenda; la transacción fue revertida.",
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
          new ErrorTransaccionEliminacionContextoIndexedDB(
            "No fue posible abrir la base de datos para eliminar la agenda.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorTransaccionEliminacionContextoIndexedDB(
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}

function calcularImpacto(
  contextoId: string,
  registrosBloques: readonly BloquePlanificacionV1[],
  registrosAgendas: readonly AgendaV1[],
): ImpactoPersistenteEliminacionContexto {
  const bloques = registrosBloques
    .filter((bloque) => bloque.contextoId === contextoId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const agendas = registrosAgendas
    .filter((agenda) => agenda.id === contextoId)
    .sort((a, b) => a.id.localeCompare(b.id));
  bloques.forEach(rehidratarBloquePlanificacionDesdeV1);
  agendas.forEach(rehidratarAgendaDesdeV1);
  const actividadIds = [
    ...new Set([
      ...bloques.map((bloque) => bloque.actividadId),
      ...agendas.flatMap((agenda) =>
        agenda.bloques.map((bloque) => bloque.actividadId),
      ),
    ]),
  ].sort();
  return Object.freeze({
    actividadIds: Object.freeze(actividadIds),
    bloqueIdsEditables: Object.freeze(bloques.map((bloque) => bloque.id)),
    cantidadRegistrosConfirmados: agendas
      .filter((agenda) => agenda.estado !== "BORRADOR")
      .reduce((total, agenda) => total + agenda.bloques.length, 0),
    huella: [
      contextoId,
      ...bloques.map((bloque) => `b:${bloque.id}`),
      ...agendas.map(
        (agenda) =>
          `a:${agenda.id}:${agenda.estado}:${agenda.bloques
            .map((bloque) => bloque.id)
            .sort()
            .join(",")}`,
      ),
    ].join("|"),
  });
}

function normalizarError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("La eliminación atómica de la agenda falló.", {
        cause: error,
      });
}
