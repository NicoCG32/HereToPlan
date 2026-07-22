import { ErrorDominio } from "../compartido/ErrorDominio";
import type { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
} from "../compartido/validaciones";

interface DatosAplicacionRecompensa {
  id: Identificador;
  recompensaAdquiridaId: Identificador;
  recompensaId: Identificador;
  puntosGastados: number;
  aplicadaEn: Date;
  fechaObjetivo: FechaLocal;
  bloquesAfectados: Iterable<Identificador>;
}

export class AplicacionRecompensa {
  public readonly id: Identificador;
  public readonly recompensaAdquiridaId: Identificador;
  public readonly recompensaId: Identificador;
  public readonly puntosGastados: number;
  public readonly fechaObjetivo: FechaLocal;
  private readonly _aplicadaEn: Date;
  private readonly bloquesAfectados: ReadonlySet<Identificador>;

  constructor(datos: DatosAplicacionRecompensa) {
    this.id = exigirIdentificador(datos.id, "identificador de aplicación");
    this.recompensaAdquiridaId = exigirIdentificador(
      datos.recompensaAdquiridaId,
      "identificador de recompensa adquirida",
    );
    this.recompensaId = exigirIdentificador(
      datos.recompensaId,
      "identificador de recompensa definida",
    );
    this.puntosGastados = exigirEnteroPositivo(
      datos.puntosGastados,
      "COSTO_APLICACION_INVALIDO",
      "La aplicación debe conservar un costo histórico positivo.",
    );
    this._aplicadaEn = copiarFecha(datos.aplicadaEn, "fecha de aplicación");
    this.fechaObjetivo = datos.fechaObjetivo;
    const bloques = [...datos.bloquesAfectados].map((id) =>
      exigirIdentificador(id, "identificador de bloque afectado"),
    );
    if (bloques.length === 0) {
      throw new ErrorDominio(
        "APLICACION_SIN_BLOQUES",
        "Una aplicación de Día libre debe conservar al menos un bloque afectado.",
      );
    }
    if (new Set(bloques).size !== bloques.length) {
      throw new ErrorDominio(
        "BLOQUES_APLICACION_DUPLICADOS",
        "Una aplicación no puede repetir bloques afectados.",
      );
    }
    this.bloquesAfectados = new Set(bloques);
  }

  public get aplicadaEn(): Date {
    return new Date(this._aplicadaEn);
  }

  public listarBloquesAfectados(): readonly Identificador[] {
    return [...this.bloquesAfectados];
  }
}
