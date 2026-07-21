import type { TipoMovimientoRecuperacion } from "../../../dominio";

export interface MovimientoRecuperacionV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly operacionId: string;
  readonly tipo: TipoMovimientoRecuperacion;
  readonly minutos: number;
  readonly bloqueFuenteId: string;
  readonly fechaFuente: string;
  readonly descripcion: string;
  readonly ocurridoEn: string;
}
