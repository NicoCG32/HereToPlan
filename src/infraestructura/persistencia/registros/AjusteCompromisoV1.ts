import type { TipoAjusteCompromiso } from "../../../dominio";

export interface AjusteCompromisoV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly bloqueId: string;
  readonly canjeRecompensaId: string;
  readonly tipo: TipoAjusteCompromiso;
  readonly aplicadoEn: string;
}
