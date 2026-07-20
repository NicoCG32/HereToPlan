export interface CanjeRecompensaV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly recompensaId: string;
  readonly puntosGastados: number;
  readonly canjeadoEn: string;
  readonly fechaObjetivo: string;
  readonly bloquesAfectados: readonly string[];
}
