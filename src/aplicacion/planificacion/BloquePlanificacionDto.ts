import type { BloquePlanificacion } from "../../dominio";

export interface BloquePlanificacionDto {
  readonly id: string;
  readonly contextoId: string;
  readonly actividadId: string;
  readonly titulo: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly politica: Readonly<{
    versionEsquema: 1;
    rigidez: "ESTRICTO" | "FLEXIBLE";
    autoridadPlazo: "PERSONAL" | "EXTERNA";
    ajustesPermitidos: readonly (
      "EXCUSAR" | "REPROGRAMAR" | "EXTENDER_PLAZO" | "REDUCIR_CARGA"
    )[];
  }>;
  readonly creadoEn: string;
}

export function convertirBloquePlanificacionADto(
  bloque: BloquePlanificacion,
): BloquePlanificacionDto {
  return Object.freeze({
    id: bloque.id,
    contextoId: bloque.contextoId,
    actividadId: bloque.actividadId,
    titulo: bloque.titulo,
    fecha: bloque.fecha.toString(),
    minutosPlanificados: bloque.minutosPlanificados,
    politica: Object.freeze({
      ...bloque.politica,
      ajustesPermitidos: Object.freeze([...bloque.politica.ajustesPermitidos]),
    }),
    creadoEn: bloque.creadoEn.toISOString(),
  });
}
