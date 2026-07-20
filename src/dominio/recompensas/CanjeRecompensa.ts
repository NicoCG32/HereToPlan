import type { FechaLocal } from "../compartido/FechaLocal";
import { ErrorDominio } from "../compartido/ErrorDominio";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
} from "../compartido/validaciones";

interface DatosCanjeRecompensa {
  id: Identificador;
  recompensaId: Identificador;
  puntosGastados: number;
  canjeadoEn: Date;
  fechaObjetivo: FechaLocal;
  bloquesAfectados: Iterable<Identificador>;
}

export class CanjeRecompensa {
  public readonly id: Identificador;
  public readonly recompensaId: Identificador;
  public readonly puntosGastados: number;
  public readonly fechaObjetivo: FechaLocal;
  private readonly _canjeadoEn: Date;
  private readonly bloquesAfectados: ReadonlySet<Identificador>;

  constructor(datos: DatosCanjeRecompensa) {
    this.id = exigirIdentificador(datos.id, "identificador de canje");
    this.recompensaId = exigirIdentificador(
      datos.recompensaId,
      "identificador de recompensa",
    );
    this.puntosGastados = exigirEnteroPositivo(
      datos.puntosGastados,
      "PUNTOS_CANJE_INVALIDOS",
      "Los puntos gastados deben ser un entero positivo.",
    );
    this._canjeadoEn = copiarFecha(datos.canjeadoEn, "fecha de canje");
    this.fechaObjetivo = datos.fechaObjetivo;
    const bloquesAfectados = [...datos.bloquesAfectados].map((id) =>
      exigirIdentificador(id, "identificador de bloque afectado"),
    );
    if (bloquesAfectados.length === 0) {
      throw new ErrorDominio(
        "CANJE_SIN_BLOQUES_AFECTADOS",
        "Un canje de día libre debe afectar al menos un bloque.",
      );
    }
    if (new Set(bloquesAfectados).size !== bloquesAfectados.length) {
      throw new ErrorDominio(
        "BLOQUES_CANJE_DUPLICADOS",
        "Un canje no puede registrar dos veces el mismo bloque.",
      );
    }
    this.bloquesAfectados = new Set(bloquesAfectados);
  }

  public get canjeadoEn(): Date {
    return new Date(this._canjeadoEn);
  }

  public listarBloquesAfectados(): readonly Identificador[] {
    return [...this.bloquesAfectados];
  }
}
