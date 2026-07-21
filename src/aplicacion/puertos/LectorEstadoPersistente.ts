import type { EstadoPersistenteRespaldable } from "../respaldo/ContratoRespaldo";

export interface LectorEstadoPersistente {
  leerEstadoCompleto(): Promise<EstadoPersistenteRespaldable>;
}
