import type { CasoDeUsoConsultarBilletera } from "../../aplicacion";

export interface ServiciosPuntos {
  readonly consultarBilletera: Pick<CasoDeUsoConsultarBilletera, "ejecutar">;
}
