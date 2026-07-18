export interface ContextoPlanificacionV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly nombre: string;
  readonly proposito?: string;
  readonly tipo: "LIBRE" | "NOMBRADO";
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
  readonly creadaEn: string;
}
