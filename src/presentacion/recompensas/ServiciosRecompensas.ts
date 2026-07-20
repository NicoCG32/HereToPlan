import type {
  CasoDeUsoCanjearDiaLibre,
  CasoDeUsoListarCanjesDiaLibre,
  CasoDeUsoPrepararCanjeDiaLibre,
} from "../../aplicacion";

export interface ServiciosRecompensas {
  readonly prepararDiaLibre: Pick<CasoDeUsoPrepararCanjeDiaLibre, "ejecutar">;
  readonly canjearDiaLibre: Pick<CasoDeUsoCanjearDiaLibre, "ejecutar">;
  readonly listarCanjes: Pick<CasoDeUsoListarCanjesDiaLibre, "ejecutar">;
  readonly generarOperacionId: () => string;
}
