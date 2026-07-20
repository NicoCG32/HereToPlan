import type {
  AjusteCompromiso,
  CanjeRecompensa,
  Identificador,
  TransaccionPuntos,
} from "../../dominio";

export class ErrorConfirmacionCanjeDiaLibreDuplicada extends Error {
  public readonly codigo = "CONFIRMACION_CANJE_DIA_LIBRE_DUPLICADA";

  constructor(public readonly causa?: unknown) {
    super("El canje, uno de sus ajustes o su movimiento ya fue confirmado.");
    this.name = "ErrorConfirmacionCanjeDiaLibreDuplicada";
  }
}

export interface RepositorioCanjesRecompensas {
  obtenerCanjePorId(id: Identificador): Promise<CanjeRecompensa | undefined>;
  listarCanjes(): Promise<readonly CanjeRecompensa[]>;
}

export interface RepositorioAjustesCompromisos {
  listarAjustes(): Promise<readonly AjusteCompromiso[]>;
}

export interface UnidadTrabajoCanjeDiaLibre {
  confirmar(
    canje: CanjeRecompensa,
    gasto: TransaccionPuntos,
    ajustes: readonly AjusteCompromiso[],
  ): Promise<void>;
}
