export interface RecompensaAdquiridaV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly recompensaId: string;
  readonly puntosGastados: number;
  readonly adquiridaEn: string;
  readonly estado: "DISPONIBLE" | "CONSUMIDA";
  readonly aplicacionId?: string;
  readonly consumidaEn?: string;
}
