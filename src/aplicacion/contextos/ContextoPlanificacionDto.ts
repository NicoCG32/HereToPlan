import type { ContextoPlanificacion } from "../../dominio";

export interface ContextoPlanificacionDto {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: "LIBRE" | "NOMBRADO";
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
  readonly creadaEn: string;
  readonly eliminable: boolean;
}

export function convertirContextoADto(
  contexto: ContextoPlanificacion,
): ContextoPlanificacionDto {
  return Object.freeze({
    id: contexto.id,
    nombre: contexto.nombre,
    tipo: contexto.tipo,
    ...(contexto.fechaInicio
      ? { fechaInicio: contexto.fechaInicio.toString() }
      : {}),
    ...(contexto.fechaFin ? { fechaFin: contexto.fechaFin.toString() } : {}),
    creadaEn: contexto.creadaEn.toISOString(),
    eliminable: !contexto.esLibre(),
  });
}
