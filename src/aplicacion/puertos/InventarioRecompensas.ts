import type {
  AjusteCompromiso,
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

export class ErrorAplicacionRecompensaDuplicada extends Error {
  public readonly codigo = "APLICACION_RECOMPENSA_DUPLICADA";

  constructor(public readonly causa?: unknown) {
    super(
      "La aplicación, la unidad o alguno de sus ajustes ya fueron modificados.",
    );
    this.name = "ErrorAplicacionRecompensaDuplicada";
  }
}

export interface RepositorioInventarioRecompensas {
  obtenerAdquiridaPorId(
    id: Identificador,
  ): Promise<RecompensaAdquirida | undefined>;
  listarAdquiridas(): Promise<readonly RecompensaAdquirida[]>;
  obtenerAplicacionPorId(
    id: Identificador,
  ): Promise<AplicacionRecompensa | undefined>;
  listarAplicaciones(): Promise<readonly AplicacionRecompensa[]>;
}

export interface UnidadTrabajoAdquisicionRecompensa {
  confirmarAdquisicion(
    adquirida: RecompensaAdquirida,
    gasto: TransaccionPuntos,
  ): Promise<void>;
}

export interface UnidadTrabajoAplicacionRecompensa {
  confirmarAplicacion(
    adquiridaConsumida: RecompensaAdquirida,
    aplicacion: AplicacionRecompensa,
    ajustes: readonly AjusteCompromiso[],
  ): Promise<void>;
}
