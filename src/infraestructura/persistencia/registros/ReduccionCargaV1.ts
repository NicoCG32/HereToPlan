export interface ReduccionCargaV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly operacionId: string;
  readonly movimientoId: string;
  readonly bloqueId: string;
  readonly minutosReducidos: number;
  readonly aplicadaEn: string;
}
