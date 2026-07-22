export interface AplicacionRecompensaV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly recompensaAdquiridaId: string;
  readonly recompensaId: string;
  readonly puntosGastados: number;
  readonly aplicadaEn: string;
  readonly fechaObjetivo: string;
  readonly bloquesAfectados: readonly string[];
}
