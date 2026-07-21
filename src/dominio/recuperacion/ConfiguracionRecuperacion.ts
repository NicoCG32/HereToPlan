import { ErrorDominio } from "../compartido/ErrorDominio";
import { exigirEnteroPositivo } from "../compartido/validaciones";

export interface DatosConfiguracionRecuperacion {
  readonly numeradorTasa: number;
  readonly denominadorTasa: number;
  readonly maximoDiarioMinutos: number;
  readonly maximoSemanalMinutos: number;
}

export class ConfiguracionRecuperacion {
  public readonly numeradorTasa: number;
  public readonly denominadorTasa: number;
  public readonly maximoDiarioMinutos: number;
  public readonly maximoSemanalMinutos: number;

  constructor(datos: DatosConfiguracionRecuperacion) {
    this.numeradorTasa = exigirEnteroPositivo(
      datos.numeradorTasa,
      "NUMERADOR_TASA_RECUPERACION_INVALIDO",
      "El numerador de la tasa de recuperación debe ser un entero positivo.",
    );
    this.denominadorTasa = exigirEnteroPositivo(
      datos.denominadorTasa,
      "DENOMINADOR_TASA_RECUPERACION_INVALIDO",
      "El denominador de la tasa de recuperación debe ser un entero positivo.",
    );
    if (this.numeradorTasa > this.denominadorTasa) {
      throw new ErrorDominio(
        "TASA_RECUPERACION_EXCESIVA",
        "La recuperación no puede superar el sobretrabajo verificado.",
      );
    }
    this.maximoDiarioMinutos = exigirEnteroPositivo(
      datos.maximoDiarioMinutos,
      "MAXIMO_DIARIO_RECUPERACION_INVALIDO",
      "El máximo diario de recuperación debe ser un entero positivo.",
    );
    this.maximoSemanalMinutos = exigirEnteroPositivo(
      datos.maximoSemanalMinutos,
      "MAXIMO_SEMANAL_RECUPERACION_INVALIDO",
      "El máximo semanal de recuperación debe ser un entero positivo.",
    );
    if (this.maximoDiarioMinutos > this.maximoSemanalMinutos) {
      throw new ErrorDominio(
        "TOPES_RECUPERACION_INCOHERENTES",
        "El máximo diario no puede superar el máximo semanal.",
      );
    }
  }

  public calcularAcreditacion(
    minutosExcedentes: number,
    acreditadosEnDia: number,
    acreditadosEnSemana: number,
  ): number {
    const excedente = exigirEnteroNoNegativo(
      minutosExcedentes,
      "MINUTOS_EXCEDENTES_INVALIDOS",
    );
    const diario = exigirEnteroNoNegativo(
      acreditadosEnDia,
      "ACREDITACION_DIARIA_INVALIDA",
    );
    const semanal = exigirEnteroNoNegativo(
      acreditadosEnSemana,
      "ACREDITACION_SEMANAL_INVALIDA",
    );
    const conversion = Math.floor(
      (excedente * this.numeradorTasa) / this.denominadorTasa,
    );
    return Math.max(
      0,
      Math.min(
        conversion,
        this.maximoDiarioMinutos - diario,
        this.maximoSemanalMinutos - semanal,
      ),
    );
  }

  public exigirCapacidadParaAcreditar(
    minutos: number,
    acreditadosEnDia: number,
    acreditadosEnSemana: number,
  ): void {
    const cantidad = exigirEnteroNoNegativo(
      minutos,
      "MINUTOS_ACREDITACION_INVALIDOS",
    );
    const diario = exigirEnteroNoNegativo(
      acreditadosEnDia,
      "ACREDITACION_DIARIA_INVALIDA",
    );
    const semanal = exigirEnteroNoNegativo(
      acreditadosEnSemana,
      "ACREDITACION_SEMANAL_INVALIDA",
    );
    if (
      cantidad === 0 ||
      diario + cantidad > this.maximoDiarioMinutos ||
      semanal + cantidad > this.maximoSemanalMinutos
    ) {
      throw new ErrorDominio(
        "TOPE_RECUPERACION_EXCEDIDO",
        "La acreditación supera la capacidad diaria o semanal disponible.",
      );
    }
  }
}

function exigirEnteroNoNegativo(valor: number, codigo: string): number {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new ErrorDominio(
      codigo,
      "Los acumulados de recuperación deben ser enteros no negativos.",
    );
  }
  return valor;
}
