import {
  BloquePlanificacion,
  ErrorDominio,
  FechaLocal,
  Habito,
  IDENTIFICADOR_CONTEXTO_LIBRE,
  PoliticaCompromiso,
  type ContextoPlanificacion,
  type TipoAjusteCompromiso,
} from "../../dominio";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import {
  ErrorBloquePlanificacionDuplicado,
  ErrorBloquePlanificacionNoEncontrado,
  type RepositorioBloquesPlanificacion,
} from "../puertos/RepositorioBloquesPlanificacion";
import type { RepositorioActividades } from "../puertos/RepositorioActividades";
import type { RepositorioContextosPlanificacion } from "../puertos/RepositorioContextosPlanificacion";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";
import type { Reloj } from "../puertos/Reloj";
import {
  convertirBloquePlanificacionADto,
  type BloquePlanificacionDto,
} from "./BloquePlanificacionDto";

export interface PoliticaBloquePlanificacionComando {
  readonly rigidez: "ESTRICTO" | "FLEXIBLE";
  readonly autoridadPlazo: "PERSONAL" | "EXTERNA";
  readonly ajustesPermitidos?: readonly TipoAjusteCompromiso[];
}

export interface ComandoAsignarActividad {
  readonly actividadId: string;
  readonly contextoId?: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly politica: PoliticaBloquePlanificacionComando;
}

export interface ComandoAsignarHabitoEnRango {
  readonly actividadId: string;
  readonly contextoId?: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly minutosPlanificados: number;
  readonly politica: PoliticaBloquePlanificacionComando;
}

export interface ComandoEditarBloquePlanificacion {
  readonly bloqueId: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly politica: PoliticaBloquePlanificacionComando;
}

export type CampoGestionBloque =
  | "bloqueId"
  | "actividadId"
  | "contextoId"
  | "fecha"
  | "minutosPlanificados"
  | "politica";

export type ResultadoGestionBloque =
  | Readonly<{ exito: true; bloque: BloquePlanificacionDto }>
  | Readonly<{
      exito: false;
      error: Readonly<{
        codigo: string;
        mensaje: string;
        campo?: CampoGestionBloque;
      }>;
    }>;

type ResultadoGestionBloqueFallido = Extract<
  ResultadoGestionBloque,
  Readonly<{ exito: false }>
>;

export type ResultadoAsignarHabitoEnRango =
  | Readonly<{
      exito: true;
      bloques: readonly BloquePlanificacionDto[];
      fechasOmitidas: readonly string[];
    }>
  | ResultadoGestionBloqueFallido;

export type ResultadoEliminarBloque =
  | Readonly<{ exito: true; bloqueId: string }>
  | Readonly<{
      exito: false;
      error: Readonly<{ codigo: string; mensaje: string; campo: "bloqueId" }>;
    }>;

export class CasoDeUsoAsignarActividad {
  constructor(
    private readonly repositorioBloques: RepositorioBloquesPlanificacion,
    private readonly repositorioActividades: RepositorioActividades,
    private readonly repositorioContextos: RepositorioContextosPlanificacion,
    private readonly reloj: Reloj,
    private readonly generadorIdentificadores: GeneradorIdentificadores,
  ) {}

  public async ejecutar(
    comando: ComandoAsignarActividad,
  ): Promise<ResultadoGestionBloque> {
    const contextoId = comando.contextoId ?? IDENTIFICADOR_CONTEXTO_LIBRE;
    const [actividad, contexto] = await Promise.all([
      this.repositorioActividades.obtenerPorId(comando.actividadId),
      this.repositorioContextos.obtenerPorId(contextoId),
    ]);
    if (!actividad) {
      return rechazar(
        "ACTIVIDAD_NO_ENCONTRADA",
        "La actividad seleccionada ya no está disponible.",
        "actividadId",
      );
    }
    if (!contexto) {
      return rechazar(
        "CONTEXTO_NO_ENCONTRADO",
        "El contexto seleccionado ya no está disponible.",
        "contextoId",
      );
    }

    try {
      const fecha = FechaLocal.crear(comando.fecha);
      validarFechaEnContexto(fecha, contexto);
      const bloque = new BloquePlanificacion({
        id: this.generadorIdentificadores.generar(),
        contextoId,
        actividadId: actividad.id,
        titulo: actividad.titulo,
        fecha,
        minutosPlanificados: comando.minutosPlanificados,
        politica: crearPolitica(comando.politica),
        creadoEn: this.reloj.ahora(),
      });
      await this.repositorioBloques.guardar(bloque);
      return Object.freeze({
        exito: true,
        bloque: convertirBloquePlanificacionADto(bloque),
      });
    } catch (error: unknown) {
      return traducirError(error);
    }
  }

  public async ejecutarRecurrencia(
    comando: ComandoAsignarHabitoEnRango,
  ): Promise<ResultadoAsignarHabitoEnRango> {
    const contextoId = comando.contextoId ?? IDENTIFICADOR_CONTEXTO_LIBRE;
    const [actividad, contexto, existentes] = await Promise.all([
      this.repositorioActividades.obtenerPorId(comando.actividadId),
      this.repositorioContextos.obtenerPorId(contextoId),
      this.repositorioBloques.listar(),
    ]);
    if (!actividad) {
      return rechazar(
        "ACTIVIDAD_NO_ENCONTRADA",
        "La actividad seleccionada ya no está disponible.",
        "actividadId",
      );
    }
    if (!(actividad instanceof Habito)) {
      return rechazar(
        "ACTIVIDAD_NO_ES_HABITO",
        "La asignación recurrente sólo corresponde a un hábito.",
        "actividadId",
      );
    }
    if (!contexto) {
      return rechazar(
        "CONTEXTO_NO_ENCONTRADO",
        "El contexto seleccionado ya no está disponible.",
        "contextoId",
      );
    }

    try {
      const fechaInicio = FechaLocal.crear(comando.fechaInicio);
      const fechaFinSolicitada = FechaLocal.crear(comando.fechaFin);
      if (fechaFinSolicitada.esAnteriorA(fechaInicio)) {
        throw new ErrorDominio(
          "RANGO_RECURRENCIA_INVALIDO",
          "La fecha final de la recurrencia no puede ser anterior a la inicial.",
        );
      }
      validarFechaEnContexto(fechaInicio, contexto);
      const fechaFin =
        contexto.fechaFin && fechaFinSolicitada.esPosteriorA(contexto.fechaFin)
          ? contexto.fechaFin
          : fechaFinSolicitada;
      const fechasExistentes = new Set(
        existentes
          .filter(
            (bloque) =>
              bloque.actividadId === actividad.id &&
              bloque.contextoId === contextoId,
          )
          .map((bloque) => bloque.fecha.toString()),
      );
      const fechasOmitidas: string[] = [];
      const bloques: BloquePlanificacion[] = [];
      const politica = crearPolitica(comando.politica);
      for (
        let fecha = fechaInicio;
        !fecha.esPosteriorA(fechaFin);
        fecha = fecha.sumarDias(1)
      ) {
        if (!actividad.correspondeA(fecha)) continue;
        if (fechasExistentes.has(fecha.toString())) {
          fechasOmitidas.push(fecha.toString());
          continue;
        }
        bloques.push(
          new BloquePlanificacion({
            id: this.generadorIdentificadores.generar(),
            contextoId,
            actividadId: actividad.id,
            titulo: actividad.titulo,
            fecha,
            minutosPlanificados: comando.minutosPlanificados,
            politica,
            creadoEn: this.reloj.ahora(),
          }),
        );
      }
      await this.repositorioBloques.guardarTodos(bloques);
      return Object.freeze({
        exito: true,
        bloques: Object.freeze(bloques.map(convertirBloquePlanificacionADto)),
        fechasOmitidas: Object.freeze(fechasOmitidas),
      });
    } catch (error: unknown) {
      return traducirError(error);
    }
  }
}

export class CasoDeUsoEditarBloquePlanificacion {
  constructor(
    private readonly repositorioBloques: RepositorioBloquesPlanificacion,
    private readonly repositorioContextos: RepositorioContextosPlanificacion,
    private readonly repositorioCortes: RepositorioCortesPlanificacion,
  ) {}

  public async ejecutar(
    comando: ComandoEditarBloquePlanificacion,
  ): Promise<ResultadoGestionBloque> {
    const existente = await this.repositorioBloques.obtenerPorId(
      comando.bloqueId,
    );
    if (!existente) {
      return rechazar(
        "BLOQUE_PLANIFICACION_NO_ENCONTRADO",
        "El bloque que intentas editar ya no está disponible.",
        "bloqueId",
      );
    }
    if (await bloqueEstaProtegido(existente.id, this.repositorioCortes)) {
      return rechazar(
        "BLOQUE_PROTEGIDO_POR_CORTE",
        "Un bloque asignado no puede editarse durante la gracia ni después de confirmarse.",
        "bloqueId",
      );
    }
    const contexto = await this.repositorioContextos.obtenerPorId(
      existente.contextoId,
    );
    if (!contexto) {
      return rechazar(
        "CONTEXTO_NO_ENCONTRADO",
        "El contexto del bloque ya no está disponible.",
        "contextoId",
      );
    }

    try {
      const fecha = FechaLocal.crear(comando.fecha);
      validarFechaEnContexto(fecha, contexto);
      const reemplazo = new BloquePlanificacion({
        id: existente.id,
        contextoId: existente.contextoId,
        actividadId: existente.actividadId,
        titulo: existente.titulo,
        fecha,
        minutosPlanificados: comando.minutosPlanificados,
        politica: crearPolitica(comando.politica),
        creadoEn: existente.creadoEn,
      });
      await this.repositorioBloques.actualizar(reemplazo);
      return Object.freeze({
        exito: true,
        bloque: convertirBloquePlanificacionADto(reemplazo),
      });
    } catch (error: unknown) {
      return traducirError(error);
    }
  }
}

export class CasoDeUsoEliminarBloquePlanificacion {
  constructor(
    private readonly repositorioBloques: RepositorioBloquesPlanificacion,
    private readonly repositorioCortes: RepositorioCortesPlanificacion,
  ) {}

  public async ejecutar(bloqueId: string): Promise<ResultadoEliminarBloque> {
    if (await bloqueEstaProtegido(bloqueId, this.repositorioCortes)) {
      return Object.freeze({
        exito: false,
        error: Object.freeze({
          codigo: "BLOQUE_PROTEGIDO_POR_CORTE",
          mensaje:
            "Un bloque asignado no puede quitarse durante la gracia ni después de confirmarse.",
          campo: "bloqueId",
        }),
      });
    }
    try {
      await this.repositorioBloques.eliminar(bloqueId);
      return Object.freeze({ exito: true, bloqueId });
    } catch (error: unknown) {
      if (error instanceof ErrorBloquePlanificacionNoEncontrado) {
        return Object.freeze({
          exito: false,
          error: Object.freeze({
            codigo: error.codigo,
            mensaje: "El bloque que intentas quitar ya no está disponible.",
            campo: "bloqueId",
          }),
        });
      }
      throw error;
    }
  }
}

async function bloqueEstaProtegido(
  bloqueId: string,
  repositorioCortes: RepositorioCortesPlanificacion,
): Promise<boolean> {
  const cortes = await repositorioCortes.listar();
  return cortes.some(
    (corte) =>
      (corte.estado === "EN_GRACIA" || corte.estado === "CONFIRMADA") &&
      corte.listarBloques().some((bloque) => bloque.id === bloqueId),
  );
}

function crearPolitica(
  datos: PoliticaBloquePlanificacionComando,
): PoliticaCompromiso {
  return new PoliticaCompromiso({
    rigidez: datos.rigidez,
    autoridadPlazo: datos.autoridadPlazo,
    ...(datos.ajustesPermitidos
      ? { ajustesPermitidos: datos.ajustesPermitidos }
      : {}),
  });
}

function validarFechaEnContexto(
  fecha: FechaLocal,
  contexto: ContextoPlanificacion,
): void {
  if (
    (contexto.fechaInicio && fecha.esAnteriorA(contexto.fechaInicio)) ||
    (contexto.fechaFin && fecha.esPosteriorA(contexto.fechaFin))
  ) {
    throw new ErrorDominio(
      "BLOQUE_FUERA_DE_CONTEXTO",
      `La fecha debe pertenecer al rango de ${contexto.nombre}.`,
    );
  }
}

function traducirError(error: unknown): ResultadoGestionBloqueFallido {
  if (error instanceof ErrorBloquePlanificacionDuplicado) {
    return rechazar(error.codigo, error.message, "bloqueId");
  }
  if (error instanceof ErrorBloquePlanificacionNoEncontrado) {
    return rechazar(error.codigo, error.message, "bloqueId");
  }
  if (error instanceof ErrorDominio) {
    const campo: CampoGestionBloque | undefined =
      error.codigo.startsWith("FECHA_") ||
      error.codigo === "BLOQUE_FUERA_DE_CONTEXTO"
        ? "fecha"
        : error.codigo === "MINUTOS_BLOQUE_INVALIDOS"
          ? "minutosPlanificados"
          : error.codigo.includes("AJUSTES") || error.codigo.includes("PLAZO")
            ? "politica"
            : undefined;
    return rechazar(error.codigo, error.message, campo);
  }
  throw error;
}

function rechazar(
  codigo: string,
  mensaje: string,
  campo?: CampoGestionBloque,
): ResultadoGestionBloqueFallido {
  return Object.freeze({
    exito: false,
    error: Object.freeze({ codigo, mensaje, ...(campo ? { campo } : {}) }),
  });
}
