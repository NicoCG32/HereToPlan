import {
  CortePlanificacion,
  ErrorDominio,
  type BloquePlanificacion,
} from "../../dominio";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import type { Reloj } from "../puertos/Reloj";
import type { RepositorioBloquesPlanificacion } from "../puertos/RepositorioBloquesPlanificacion";
import {
  ErrorCortePlanificacionDuplicado,
  type RepositorioCortesPlanificacion,
} from "../puertos/RepositorioCortesPlanificacion";
import {
  convertirCortePlanificacionADto,
  type CortePlanificacionDto,
} from "./SincronizarCortesPlanificacion";

export interface ComandoSeleccionCortePlanificacion {
  readonly bloqueIds: readonly string[];
}

export interface BloqueRevisionCortePlanificacionDto {
  readonly id: string;
  readonly titulo: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly rigidez: "ESTRICTO" | "FLEXIBLE";
}

export interface RevisionCortePlanificacionDto {
  readonly bloques: readonly BloqueRevisionCortePlanificacionDto[];
  readonly cantidadBloques: number;
  readonly minutosPlanificados: number;
  readonly cantidadEstrictos: number;
  readonly cantidadFlexibles: number;
  readonly fechaInicio: string;
  readonly fechaFin: string;
}

export type ResultadoRevisarCortePlanificacion =
  | Readonly<{ exito: true; revision: RevisionCortePlanificacionDto }>
  | ResultadoSeleccionCorteRechazada;

export type ResultadoAsignarCortePlanificacion =
  | Readonly<{ exito: true; corte: CortePlanificacionDto }>
  | ResultadoSeleccionCorteRechazada;

interface ResultadoSeleccionCorteRechazada {
  readonly exito: false;
  readonly error: Readonly<{
    codigo: string;
    mensaje: string;
    campo: "bloques";
  }>;
}

export class CasoDeUsoRevisarCortePlanificacion {
  constructor(
    private readonly repositorioBloques: RepositorioBloquesPlanificacion,
    private readonly repositorioCortes: RepositorioCortesPlanificacion,
  ) {}

  public async ejecutar(
    comando: ComandoSeleccionCortePlanificacion,
  ): Promise<ResultadoRevisarCortePlanificacion> {
    const seleccion = await cargarSeleccionDisponible(
      comando.bloqueIds,
      this.repositorioBloques,
      this.repositorioCortes,
    );
    if (!seleccion.exito) return seleccion;

    const bloques = [...seleccion.bloques].sort(
      (a, b) =>
        a.fecha.toString().localeCompare(b.fecha.toString()) ||
        a.id.localeCompare(b.id),
    );
    return Object.freeze({
      exito: true,
      revision: Object.freeze({
        bloques: Object.freeze(
          bloques.map((bloque) =>
            Object.freeze({
              id: bloque.id,
              titulo: bloque.titulo,
              fecha: bloque.fecha.toString(),
              minutosPlanificados: bloque.minutosPlanificados,
              rigidez: bloque.politica.rigidez,
            }),
          ),
        ),
        cantidadBloques: bloques.length,
        minutosPlanificados: bloques.reduce(
          (total, bloque) => total + bloque.minutosPlanificados,
          0,
        ),
        cantidadEstrictos: bloques.filter(
          (bloque) => bloque.politica.rigidez === "ESTRICTO",
        ).length,
        cantidadFlexibles: bloques.filter(
          (bloque) => bloque.politica.rigidez === "FLEXIBLE",
        ).length,
        fechaInicio: bloques[0]!.fecha.toString(),
        fechaFin: bloques.at(-1)!.fecha.toString(),
      }),
    });
  }
}

export class CasoDeUsoAsignarCortePlanificacion {
  constructor(
    private readonly repositorioBloques: RepositorioBloquesPlanificacion,
    private readonly repositorioCortes: RepositorioCortesPlanificacion,
    private readonly reloj: Reloj,
    private readonly generadorIdentificadores: GeneradorIdentificadores,
  ) {}

  public async ejecutar(
    comando: ComandoSeleccionCortePlanificacion,
  ): Promise<ResultadoAsignarCortePlanificacion> {
    const seleccion = await cargarSeleccionDisponible(
      comando.bloqueIds,
      this.repositorioBloques,
      this.repositorioCortes,
    );
    if (!seleccion.exito) return seleccion;

    try {
      const ahora = this.reloj.ahora();
      const corte = CortePlanificacion.crear({
        id: this.generadorIdentificadores.generar(),
        bloques: seleccion.bloques,
        creadoEn: ahora,
      });
      corte.iniciarRevision();
      corte.asignar(ahora);
      await this.repositorioCortes.guardar(corte);
      return Object.freeze({
        exito: true,
        corte: convertirCortePlanificacionADto(corte, ahora),
      });
    } catch (error: unknown) {
      if (error instanceof ErrorDominio) {
        return rechazarSeleccion(error.message, error.codigo);
      }
      if (error instanceof ErrorCortePlanificacionDuplicado) {
        return rechazarSeleccion(error.message, error.codigo);
      }
      throw error;
    }
  }
}

type ResultadoCargaSeleccion =
  | Readonly<{ exito: true; bloques: readonly BloquePlanificacion[] }>
  | ResultadoSeleccionCorteRechazada;

async function cargarSeleccionDisponible(
  bloqueIds: readonly string[],
  repositorioBloques: RepositorioBloquesPlanificacion,
  repositorioCortes: RepositorioCortesPlanificacion,
): Promise<ResultadoCargaSeleccion> {
  if (bloqueIds.length === 0) {
    return rechazarSeleccion(
      "Selecciona al menos un bloque antes de revisar la planificación.",
      "CORTE_SIN_BLOQUES",
    );
  }
  if (new Set(bloqueIds).size !== bloqueIds.length) {
    return rechazarSeleccion(
      "La selección no puede contener el mismo bloque más de una vez.",
      "BLOQUE_CORTE_DUPLICADO",
    );
  }

  const [bloquesDisponibles, cortes] = await Promise.all([
    repositorioBloques.listar(),
    repositorioCortes.listar(),
  ]);
  const bloquesPorId = new Map(
    bloquesDisponibles.map((bloque) => [bloque.id, bloque] as const),
  );
  const bloqueAusente = bloqueIds.find((id) => !bloquesPorId.has(id));
  if (bloqueAusente) {
    return rechazarSeleccion(
      `El bloque ${bloqueAusente} ya no está disponible.`,
      "BLOQUE_PLANIFICACION_NO_ENCONTRADO",
    );
  }

  const bloquesProtegidos = new Set(
    cortes
      .filter(
        (corte) =>
          corte.estado === "EN_GRACIA" || corte.estado === "CONFIRMADA",
      )
      .flatMap((corte) => corte.listarBloques().map((bloque) => bloque.id)),
  );
  const bloqueProtegido = bloqueIds.find((id) => bloquesProtegidos.has(id));
  if (bloqueProtegido) {
    return rechazarSeleccion(
      `El bloque ${bloqueProtegido} ya pertenece a una planificación asignada.`,
      "BLOQUE_PROTEGIDO_POR_CORTE",
    );
  }

  return Object.freeze({
    exito: true,
    bloques: Object.freeze(bloqueIds.map((id) => bloquesPorId.get(id)!)),
  });
}

function rechazarSeleccion(
  mensaje: string,
  codigo: string,
): ResultadoSeleccionCorteRechazada {
  return Object.freeze({
    exito: false,
    error: Object.freeze({ codigo, mensaje, campo: "bloques" }),
  });
}
