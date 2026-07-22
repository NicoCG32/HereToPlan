import type {
  AplicacionRecompensa,
  Identificador,
  RecompensaAdquirida,
  TransaccionPuntos,
} from "../../dominio";

export class ErrorAdquisicionRecompensaDuplicada extends Error {
  public readonly codigo = "ADQUISICION_RECOMPENSA_DUPLICADA";

  constructor(public readonly causa?: unknown) {
    super("La adquisición o su movimiento ya fueron confirmados.");
    this.name = "ErrorAdquisicionRecompensaDuplicada";
  }
}

export interface RepositorioInventarioRecompensas {
  obtenerAdquiridaPorId(
    id: Identificador,
  ): Promise<RecompensaAdquirida | undefined>;
  listarAdquiridas(): Promise<readonly RecompensaAdquirida[]>;
  listarAplicaciones(): Promise<readonly AplicacionRecompensa[]>;
}

export interface UnidadTrabajoAdquisicionRecompensa {
  confirmarAdquisicion(
    adquirida: RecompensaAdquirida,
    gasto: TransaccionPuntos,
  ): Promise<void>;
}
