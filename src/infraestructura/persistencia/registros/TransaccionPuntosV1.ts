export interface TransaccionPuntosV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly tipo: "INGRESO" | "GASTO";
  readonly cantidad: number;
  readonly fuenteTipo: "COMPROMISO_COMPLETADO" | "CANJE_RECOMPENSA";
  readonly fuenteId: string;
  readonly descripcion: string;
  readonly ocurridaEn: string;
}
