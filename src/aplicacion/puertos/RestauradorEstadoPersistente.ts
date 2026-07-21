import type { EstadoPersistenteRespaldable } from "../respaldo/ContratoRespaldo";

export interface RestauradorEstadoPersistente {
  reemplazarEstadoCompleto(estado: EstadoPersistenteRespaldable): Promise<void>;
}
