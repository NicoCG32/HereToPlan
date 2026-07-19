import {
  ErrorDominio,
  ResolucionBloquePlanificacion,
  exigirIdentificador,
  type ResultadoResolucionBloquePlanificacion,
} from "../../dominio";
import type { Reloj } from "../puertos/Reloj";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";
import {
  ErrorResolucionBloquePlanificacionDuplicada,
  type RepositorioResolucionesBloquesPlanificacion,
} from "../puertos/RepositorioResolucionesBloquesPlanificacion";

export interface ComandoResolverBloquePlanificacion {
  readonly bloqueId: string;
  readonly operacionId: string;
}

export interface ResolucionBloquePlanificacionDto {
  readonly bloqueId: string;
  readonly operacionId: string;
  readonly resultado: ResultadoResolucionBloquePlanificacion;
  readonly resueltoEn: string;
  readonly reintentoIdempotente: boolean;
}

export type ResultadoResolverBloquePlanificacion =
  | Readonly<{
      exito: true;
      resolucion: ResolucionBloquePlanificacionDto;
    }>
  | Readonly<{
      exito: false;
      error: Readonly<{
        codigo: string;
        mensaje: string;
        campo: "bloqueId" | "operacionId";
      }>;
    }>;

interface DependenciasResolucionBloque {
  readonly repositorioCortes: RepositorioCortesPlanificacion;
  readonly repositorioResoluciones: RepositorioResolucionesBloquesPlanificacion;
  readonly reloj: Reloj;
}

export class CasoDeUsoCompletarBloquePlanificacion {
  private readonly dependencias: DependenciasResolucionBloque;

  constructor(
    repositorioCortes: RepositorioCortesPlanificacion,
    repositorioResoluciones: RepositorioResolucionesBloquesPlanificacion,
    reloj: Reloj,
  ) {
    this.dependencias = { repositorioCortes, repositorioResoluciones, reloj };
  }

  public ejecutar(
    comando: ComandoResolverBloquePlanificacion,
  ): Promise<ResultadoResolverBloquePlanificacion> {
    return resolverBloque(comando, "COMPLETADO", this.dependencias);
  }
}

export class CasoDeUsoMarcarBloqueIncumplido {
  private readonly dependencias: DependenciasResolucionBloque;

  constructor(
    repositorioCortes: RepositorioCortesPlanificacion,
    repositorioResoluciones: RepositorioResolucionesBloquesPlanificacion,
    reloj: Reloj,
  ) {
    this.dependencias = { repositorioCortes, repositorioResoluciones, reloj };
  }

  public ejecutar(
    comando: ComandoResolverBloquePlanificacion,
  ): Promise<ResultadoResolverBloquePlanificacion> {
    return resolverBloque(comando, "INCUMPLIDO", this.dependencias);
  }
}

async function resolverBloque(
  comando: ComandoResolverBloquePlanificacion,
  resultado: ResultadoResolucionBloquePlanificacion,
  dependencias: DependenciasResolucionBloque,
): Promise<ResultadoResolverBloquePlanificacion> {
  let bloqueId: string;
  try {
    bloqueId = exigirIdentificador(comando.bloqueId, "bloque");
  } catch (error: unknown) {
    if (error instanceof ErrorDominio) {
      return rechazar(error.codigo, error.message, "bloqueId");
    }
    throw error;
  }
  let operacionId: string;
  try {
    operacionId = exigirIdentificador(comando.operacionId, "operación");
  } catch (error: unknown) {
    if (error instanceof ErrorDominio) {
      return rechazar(error.codigo, error.message, "operacionId");
    }
    throw error;
  }

  const repetida =
    await dependencias.repositorioResoluciones.obtenerPorOperacionId(
      operacionId,
    );
  if (repetida) {
    return resolverOperacionRepetida(repetida, bloqueId, resultado);
  }

  const resolucionExistente =
    await dependencias.repositorioResoluciones.obtenerPorBloqueId(bloqueId);
  if (resolucionExistente) {
    return rechazar(
      "BLOQUE_YA_RESUELTO",
      `El bloque ${bloqueId} ya fue resuelto mediante otra operación.`,
      "bloqueId",
    );
  }

  const cortes = await dependencias.repositorioCortes.listar();
  const cortesConBloque = cortes.filter((corte) =>
    corte.listarBloques().some((bloque) => bloque.id === bloqueId),
  );
  if (cortesConBloque.length === 0) {
    return rechazar(
      "BLOQUE_PLANIFICACION_NO_ENCONTRADO",
      `No existe un bloque confirmado con el identificador ${bloqueId}.`,
      "bloqueId",
    );
  }
  if (!cortesConBloque.some((corte) => corte.estado === "CONFIRMADA")) {
    return rechazar(
      "BLOQUE_NO_CONFIRMADO",
      "El bloque debe pertenecer a una planificación confirmada antes de resolverse.",
      "bloqueId",
    );
  }

  const resolucion = new ResolucionBloquePlanificacion({
    bloqueId,
    operacionId,
    resultado,
    resueltoEn: dependencias.reloj.ahora(),
  });
  try {
    await dependencias.repositorioResoluciones.guardar(resolucion);
  } catch (error: unknown) {
    if (error instanceof ErrorResolucionBloquePlanificacionDuplicada) {
      return reconciliarColision(
        bloqueId,
        operacionId,
        resultado,
        dependencias.repositorioResoluciones,
      );
    }
    throw error;
  }
  return aceptar(resolucion, false);
}

async function reconciliarColision(
  bloqueId: string,
  operacionId: string,
  resultado: ResultadoResolucionBloquePlanificacion,
  repositorio: RepositorioResolucionesBloquesPlanificacion,
): Promise<ResultadoResolverBloquePlanificacion> {
  const mismaOperacion = await repositorio.obtenerPorOperacionId(operacionId);
  if (mismaOperacion) {
    return resolverOperacionRepetida(mismaOperacion, bloqueId, resultado);
  }
  return rechazar(
    "BLOQUE_YA_RESUELTO",
    `El bloque ${bloqueId} ya fue resuelto mediante otra operación.`,
    "bloqueId",
  );
}

function resolverOperacionRepetida(
  resolucion: ResolucionBloquePlanificacion,
  bloqueId: string,
  resultado: ResultadoResolucionBloquePlanificacion,
): ResultadoResolverBloquePlanificacion {
  if (resolucion.bloqueId !== bloqueId || resolucion.resultado !== resultado) {
    return rechazar(
      "OPERACION_RESOLUCION_EN_CONFLICTO",
      `La operación ${resolucion.operacionId} ya fue utilizada con otro comando.`,
      "operacionId",
    );
  }
  return aceptar(resolucion, true);
}

function aceptar(
  resolucion: ResolucionBloquePlanificacion,
  reintentoIdempotente: boolean,
): ResultadoResolverBloquePlanificacion {
  return Object.freeze({
    exito: true,
    resolucion: Object.freeze({
      bloqueId: resolucion.bloqueId,
      operacionId: resolucion.operacionId,
      resultado: resolucion.resultado,
      resueltoEn: resolucion.resueltoEn.toISOString(),
      reintentoIdempotente,
    }),
  });
}

function rechazar(
  codigo: string,
  mensaje: string,
  campo: "bloqueId" | "operacionId",
): ResultadoResolverBloquePlanificacion {
  return Object.freeze({
    exito: false,
    error: Object.freeze({ codigo, mensaje, campo }),
  });
}
