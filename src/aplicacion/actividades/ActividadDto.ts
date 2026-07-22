import { Habito, Tarea, type Actividad } from "../../dominio";

interface ActividadBaseDto {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion?: string;
  readonly creadaEn: string;
  readonly tiempoNecesarioMinutos: number;
  readonly modoSeguimiento: ModoSeguimientoDto;
  readonly politicaPredeterminada?: PoliticaActividadDto;
}

export type ModoSeguimientoDto = "MANUAL" | "CRONOMETRADO";

export interface PoliticaActividadDto {
  readonly versionEsquema: 1;
  readonly rigidez: "ESTRICTO" | "FLEXIBLE";
  readonly autoridadPlazo: "PERSONAL" | "EXTERNA";
  readonly ajustesPermitidos: readonly (
    "EXCUSAR" | "REPROGRAMAR" | "EXTENDER_PLAZO" | "REDUCIR_CARGA"
  )[];
}

export interface TareaDto extends ActividadBaseDto {
  readonly tipo: "TAREA_SIMPLE" | "TAREA_COMPUESTA" | "PROYECTO";
  readonly fechaLimite?: string;
  readonly subtareasIds: readonly string[];
  readonly estado: "PENDIENTE" | "COMPLETADA" | "NO_COMPLETADA";
  readonly resueltaEn?: string;
}

export interface HabitoDto extends ActividadBaseDto {
  readonly tipo: "HABITO";
  readonly frecuencia: "DIARIA" | "SEMANAL" | "PERSONALIZADA";
  readonly diasSemana: readonly number[];
}

export type ActividadDto = TareaDto | HabitoDto;
export type TipoActividadDto = ActividadDto["tipo"];

export function convertirActividadADto(actividad: Actividad): ActividadDto {
  const politicaPredeterminada = actividad.obtenerPoliticaPredeterminada();
  const base = {
    id: actividad.id,
    titulo: actividad.titulo,
    ...(actividad.descripcion ? { descripcion: actividad.descripcion } : {}),
    creadaEn: actividad.creadaEn.toISOString(),
    modoSeguimiento: actividad.modoSeguimiento,
    ...(politicaPredeterminada
      ? {
          politicaPredeterminada: Object.freeze({
            ...politicaPredeterminada,
            ajustesPermitidos: Object.freeze([
              ...politicaPredeterminada.ajustesPermitidos,
            ]),
          }),
        }
      : {}),
  };

  if (actividad instanceof Tarea) {
    const fechaLimite = actividad.fechaLimite;
    const resueltaEn = actividad.resueltaEn;
    return Object.freeze({
      ...base,
      tipo: actividad.tipo,
      tiempoNecesarioMinutos: actividad.tiempoNecesarioMinutos,
      ...(fechaLimite ? { fechaLimite: fechaLimite.toString() } : {}),
      subtareasIds: Object.freeze([...actividad.listarSubtareasIds()]),
      estado: actividad.estado,
      ...(resueltaEn ? { resueltaEn: resueltaEn.toISOString() } : {}),
    });
  }

  if (actividad instanceof Habito) {
    return Object.freeze({
      ...base,
      tipo: actividad.tipo,
      tiempoNecesarioMinutos: actividad.tiempoNecesarioMinutos,
      frecuencia: actividad.frecuencia,
      diasSemana: Object.freeze([...actividad.listarDiasSemana()]),
    });
  }

  throw new Error(
    "El tipo concreto de actividad no está soportado por el DTO.",
  );
}
