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
  readonly corteId?: string;
}

export interface ComandoCorregirCortePlanificacion {
  readonly corteId: string;
}

export interface BloqueRevisionCortePlanificacionDto {
  readonly id: string;
  readonly titulo: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly rigidez: "ESTRICTO" | "FLEXIBLE";
}

export interface RevisionCortePlanificacionDto {
  readonly corteId?: string;
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

export type ResultadoCorregirCortePlanificacion =
  | Readonly<{ exito: true; corte: CortePlanificacionDto }>
  | ResultadoCorreccionCorteRechazada;

interface ResultadoSeleccionCorteRechazada {
  readonly exito: false;
  readonly error: Readonly<{
    codigo: string;
    mensaje: string;
    campo: "bloques";
  }>;
}

interface ResultadoCorreccionCorteRechazada {
  readonly exito: false;
  readonly error: Readonly<{
    codigo: string;
    mensaje: string;
    campo: "corteId";
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
      comando.corteId,
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
        ...(seleccion.corteBorrador
          ? { corteId: seleccion.corteBorrador.id }
          : {}),
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
      comando.corteId,
    );
    if (!seleccion.exito) return seleccion;

    try {
      const ahora = this.reloj.ahora();
      const corte =
        seleccion.corteBorrador ??
        CortePlanificacion.crear({
          id: this.generadorIdentificadores.generar(),
          bloques: seleccion.bloques,
          creadoEn: ahora,
        });
      if (seleccion.corteBorrador) {
        corte.reemplazarBloques(seleccion.bloques);
      }
      corte.iniciarRevision();
      corte.asignar(ahora);
      if (seleccion.corteBorrador) {
        await this.repositorioCortes.actualizar(corte);
      } else {
        await this.repositorioCortes.guardar(corte);
      }
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

export class CasoDeUsoCorregirCortePlanificacion {
  constructor(
    private readonly repositorioCortes: RepositorioCortesPlanificacion,
    private readonly reloj: Reloj,
  ) {}

  public async ejecutar(
    comando: ComandoCorregirCortePlanificacion,
  ): Promise<ResultadoCorregirCortePlanificacion> {
    const corte = await this.repositorioCortes.obtenerPorId(comando.corteId);
    if (!corte) {
      return rechazarCorreccion(
        "CORTE_PLANIFICACION_NO_ENCONTRADO",
        "La planificación que intentas corregir ya no está disponible.",
      );
    }

    const ahora = this.reloj.ahora();
    try {
      if (corte.actualizarSegunReloj(ahora)) {
        await this.repositorioCortes.actualizar(corte);
        return rechazarCorreccion(
          "CORTE_NO_CORREGIBLE",
          "El período de gracia terminó y la planificación quedó confirmada.",
        );
      }
      corte.corregir(ahora);
      await this.repositorioCortes.actualizar(corte);
      return Object.freeze({
        exito: true,
        corte: convertirCortePlanificacionADto(corte, ahora),
      });
    } catch (error: unknown) {
      if (error instanceof ErrorDominio) {
        return rechazarCorreccion(error.codigo, error.message);
      }
      throw error;
    }
  }
}

type ResultadoCargaSeleccion =
  | Readonly<{
      exito: true;
      bloques: readonly BloquePlanificacion[];
      corteBorrador?: CortePlanificacion;
    }>
  | ResultadoSeleccionCorteRechazada;

async function cargarSeleccionDisponible(
  bloqueIds: readonly string[],
  repositorioBloques: RepositorioBloquesPlanificacion,
  repositorioCortes: RepositorioCortesPlanificacion,
  corteId?: string,
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
  const corteBorrador = cargarCorteBorrador(corteId, cortes);
  if (!corteBorrador.exito) return corteBorrador;
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
    ...(corteBorrador.corte ? { corteBorrador: corteBorrador.corte } : {}),
  });
}

function cargarCorteBorrador(
  corteId: string | undefined,
  cortes: readonly CortePlanificacion[],
):
  | Readonly<{ exito: true; corte?: CortePlanificacion }>
  | ResultadoSeleccionCorteRechazada {
  if (!corteId) return Object.freeze({ exito: true });
  const corte = cortes.find((existente) => existente.id === corteId);
  if (!corte) {
    return rechazarSeleccion(
      "La planificación corregida ya no está disponible.",
      "CORTE_PLANIFICACION_NO_ENCONTRADO",
    );
  }
  if (corte.estado !== "BORRADOR") {
    return rechazarSeleccion(
      "La planificación corregida ya no se encuentra en borrador.",
      "CORTE_NO_EDITABLE",
    );
  }
  return Object.freeze({ exito: true, corte });
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

function rechazarCorreccion(
  codigo: string,
  mensaje: string,
): ResultadoCorreccionCorteRechazada {
  return Object.freeze({
    exito: false,
    error: Object.freeze({ codigo, mensaje, campo: "corteId" }),
  });
}
