export interface ResolucionBloquePlanificacionV1 {
  readonly versionEsquema: 1;
  readonly bloqueId: string;
  readonly operacionId: string;
  readonly resultado: "COMPLETADO" | "INCUMPLIDO";
  readonly resueltoEn: string;
}
