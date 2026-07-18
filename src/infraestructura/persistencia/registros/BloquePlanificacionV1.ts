export interface BloquePlanificacionV1 {
  readonly versionEsquema: 1;
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
