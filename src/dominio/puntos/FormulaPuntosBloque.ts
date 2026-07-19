import { exigirEnteroPositivo } from "../compartido/validaciones";

export interface ConfiguracionFormulaPuntosBloque {
  readonly minutosPorPunto: number;
  readonly maximoPuntosPorBloque: number;
}

export const CONFIGURACION_INICIAL_FORMULA_PUNTOS: ConfiguracionFormulaPuntosBloque =
  Object.freeze({
    minutosPorPunto: 30,
    maximoPuntosPorBloque: 4,
  });

export class FormulaPuntosBloque {
  private readonly minutosPorPunto: number;
  private readonly maximoPuntosPorBloque: number;

  constructor(
    configuracion: ConfiguracionFormulaPuntosBloque = CONFIGURACION_INICIAL_FORMULA_PUNTOS,
  ) {
    this.minutosPorPunto = exigirEnteroPositivo(
      configuracion.minutosPorPunto,
      "MINUTOS_POR_PUNTO_INVALIDOS",
      "Los minutos por punto deben ser un entero positivo.",
    );
    this.maximoPuntosPorBloque = exigirEnteroPositivo(
      configuracion.maximoPuntosPorBloque,
      "MAXIMO_PUNTOS_BLOQUE_INVALIDO",
      "El máximo de puntos por bloque debe ser un entero positivo.",
    );
  }

  public calcular(minutosPlanificados: number): number {
    const minutos = exigirEnteroPositivo(
      minutosPlanificados,
      "MINUTOS_PUNTUABLES_INVALIDOS",
      "Los minutos puntuables deben ser un entero positivo.",
    );
    return Math.min(
      this.maximoPuntosPorBloque,
      Math.ceil(minutos / this.minutosPorPunto),
    );
  }
}
