import type {
  CasoDeUsoAcreditarRecuperacion,
  CasoDeUsoConsultarBancoRecuperacion,
  CasoDeUsoConsumirRecuperacion,
} from "../../aplicacion";

export interface ServiciosRecuperacion {
  readonly consultarBanco: CasoDeUsoConsultarBancoRecuperacion;
  readonly acreditar: CasoDeUsoAcreditarRecuperacion;
  readonly consumir: CasoDeUsoConsumirRecuperacion;
  readonly generarOperacionId: () => string;
}
