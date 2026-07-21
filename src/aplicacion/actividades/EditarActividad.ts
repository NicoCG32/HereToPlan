import {
  EstructuraTareas,
  ErrorDominio,
  FechaLocal,
  Habito,
  PoliticaCompromiso,
  Tarea,
  type Actividad,
} from "../../dominio";
import {
  ErrorActividadNoEncontrada,
  type RepositorioActividades,
} from "../puertos/RepositorioActividades";
import { convertirActividadADto, type ActividadDto } from "./ActividadDto";
import type {
  CampoCrearActividad,
  ComandoCrearActividad,
  ComandoPoliticaActividad,
} from "./CrearActividad";

export type ComandoEditarActividad = ComandoCrearActividad &
  Readonly<{ actividadId: string }>;

export type ResultadoEditarActividad =
  | Readonly<{ exito: true; actividad: ActividadDto }>
  | Readonly<{
      exito: false;
      error: Readonly<{
        codigo: string;
        mensaje: string;
        campo?: CampoCrearActividad;
      }>;
    }>;

export class CasoDeUsoEditarActividad {
  constructor(private readonly repositorio: RepositorioActividades) {}

  public async ejecutar(
    comando: ComandoEditarActividad,
  ): Promise<ResultadoEditarActividad> {
    try {
      const existente = await this.repositorio.obtenerPorId(
        comando.actividadId,
      );
      if (!existente) throw new ErrorActividadNoEncontrada(comando.actividadId);
      const actualizada = await this.reconstruir(existente, comando);
      await this.repositorio.actualizar(actualizada);
      return Object.freeze({
        exito: true,
        actividad: convertirActividadADto(actualizada),
      });
    } catch (error: unknown) {
      if (error instanceof ErrorActividadNoEncontrada) {
        return rechazar(error.codigo, error.message);
      }
      if (error instanceof ErrorDominio) {
        return rechazar(
          error.codigo,
          error.message,
          campoPorError(error.codigo),
        );
      }
      throw error;
    }
  }

  private async reconstruir(
    existente: Actividad,
    comando: ComandoEditarActividad,
  ): Promise<Actividad> {
    const cambiaFamilia =
      existente instanceof Habito !== (comando.tipo === "HABITO");
    if (cambiaFamilia) {
      throw new ErrorDominio(
        "TIPO_ACTIVIDAD_NO_EDITABLE",
        "No es posible cambiar una tarea en hábito ni un hábito en tarea.",
      );
    }
    const politica = crearPolitica(comando.politicaPredeterminada, existente);
    const comunes = {
      id: existente.id,
      titulo: comando.titulo,
      ...(comando.descripcion !== undefined
        ? { descripcion: comando.descripcion }
        : {}),
      tiempoNecesarioMinutos: comando.tiempoNecesarioMinutos,
      creadaEn: existente.creadaEn,
      ...(politica ? { politicaPredeterminada: politica } : {}),
    };

    if (existente instanceof Habito && comando.tipo === "HABITO") {
      return new Habito({
        ...comunes,
        frecuencia: comando.frecuencia,
        ...(comando.diasSemana ? { diasSemana: comando.diasSemana } : {}),
      });
    }
    if (!(existente instanceof Tarea) || comando.tipo === "HABITO") {
      throw new ErrorDominio(
        "TIPO_ACTIVIDAD_NO_EDITABLE",
        "El tipo concreto de la actividad no puede editarse.",
      );
    }
    const tarea = Tarea.rehidratar({
      ...comunes,
      tipo: comando.tipo,
      ...(comando.fechaLimite
        ? { fechaLimite: FechaLocal.crear(comando.fechaLimite) }
        : {}),
      subtareasIds: comando.subtareasIds ?? existente.listarSubtareasIds(),
      estado: existente.estado,
      ...(existente.resueltaEn ? { resueltaEn: existente.resueltaEn } : {}),
    });
    const otras = (await this.repositorio.listar()).filter(
      (actividad): actividad is Tarea =>
        actividad instanceof Tarea && actividad.id !== existente.id,
    );
    EstructuraTareas.validar([...otras, tarea]);
    return tarea;
  }
}

function crearPolitica(
  comando: ComandoPoliticaActividad | undefined,
  existente: Actividad,
): PoliticaCompromiso | undefined {
  const datos = comando ?? existente.obtenerPoliticaPredeterminada();
  return datos
    ? new PoliticaCompromiso({
        rigidez: datos.rigidez,
        autoridadPlazo: datos.autoridadPlazo,
        ...(datos.ajustesPermitidos
          ? { ajustesPermitidos: datos.ajustesPermitidos }
          : {}),
      })
    : undefined;
}

function campoPorError(codigo: string): CampoCrearActividad | undefined {
  if (codigo === "TITULO_ACTIVIDAD_VACIO") return "titulo";
  if (codigo.includes("TIEMPO_")) return "tiempoNecesarioMinutos";
  if (codigo.startsWith("FECHA_LOCAL")) return "fechaLimite";
  if (codigo.includes("SUBTAREA") || codigo === "CICLO_ENTRE_TAREAS") {
    return "subtareasIds";
  }
  if (codigo === "FRECUENCIA_HABITO_INVALIDA") return "frecuencia";
  if (codigo.includes("DIA") || codigo.includes("HABITO_")) return "diasSemana";
  if (codigo.includes("COMPROMISO") || codigo.includes("PLAZO_EXTERNO")) {
    return "politicaPredeterminada";
  }
  return undefined;
}

function rechazar(
  codigo: string,
  mensaje: string,
  campo?: CampoCrearActividad,
): ResultadoEditarActividad {
  return Object.freeze({
    exito: false,
    error: Object.freeze({ codigo, mensaje, ...(campo ? { campo } : {}) }),
  });
}
