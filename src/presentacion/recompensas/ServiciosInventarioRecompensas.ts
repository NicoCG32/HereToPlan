import type {
  CasoDeUsoAdquirirRecompensa,
  CasoDeUsoConsultarCatalogoRecompensas,
  CasoDeUsoConsultarInventarioRecompensas,
} from "../../aplicacion";

export interface ServiciosInventarioRecompensas {
  readonly consultarCatalogo: Pick<
    CasoDeUsoConsultarCatalogoRecompensas,
    "ejecutar"
  >;
  readonly consultarInventario: Pick<
    CasoDeUsoConsultarInventarioRecompensas,
    "ejecutar"
  >;
  readonly adquirir: Pick<CasoDeUsoAdquirirRecompensa, "ejecutar">;
  readonly generarOperacionId: () => string;
}
