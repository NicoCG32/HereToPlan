import { ErrorDominio } from "../compartido/ErrorDominio";
import type { FechaLocal } from "../compartido/FechaLocal";
import { exigirEnteroPositivo } from "../compartido/validaciones";
import { Actividad, type DatosActividad } from "./Actividad";
import type { TipoFrecuenciaHabito } from "./tipos";

export interface DatosHabito extends Omit<DatosActividad, "tipo"> {
  tiempoNecesarioMinutos: number;
  frecuencia: TipoFrecuenciaHabito;
  diasSemana?: Iterable<number>;
}

export class Habito extends Actividad {
  public readonly tipo = "HABITO" as const;
  public readonly tiempoNecesarioMinutos: number;
  public readonly frecuencia: TipoFrecuenciaHabito;
  private readonly diasSemana: ReadonlySet<number>;

  constructor(datos: DatosHabito) {
    super({ ...datos, tipo: "HABITO" });
    this.tiempoNecesarioMinutos = exigirEnteroPositivo(
      datos.tiempoNecesarioMinutos,
      "TIEMPO_HABITO_INVALIDO",
      "El tiempo del hábito debe ser un entero positivo de minutos.",
    );
    if (
      datos.frecuencia !== "DIARIA" &&
      datos.frecuencia !== "SEMANAL" &&
      datos.frecuencia !== "PERSONALIZADA"
    ) {
      throw new ErrorDominio(
        "FRECUENCIA_HABITO_INVALIDA",
        "La frecuencia del hábito no es reconocida.",
      );
    }
    this.frecuencia = datos.frecuencia;
    this.diasSemana = new Set(datos.diasSemana ?? []);

    if (
      [...this.diasSemana].some(
        (dia) => !Number.isInteger(dia) || dia < 1 || dia > 7,
      )
    ) {
      throw new ErrorDominio(
        "DIA_SEMANA_INVALIDO",
        "Los días de la semana deben ser enteros ISO entre 1 y 7.",
      );
    }
    if (this.frecuencia === "DIARIA" && this.diasSemana.size > 0) {
      throw new ErrorDominio(
        "HABITO_DIARIO_CON_DIAS",
        "Un hábito diario no necesita declarar días particulares.",
      );
    }
    if (this.frecuencia === "SEMANAL" && this.diasSemana.size !== 1) {
      throw new ErrorDominio(
        "HABITO_SEMANAL_SIN_DIA_UNICO",
        "Un hábito semanal debe indicar exactamente un día.",
      );
    }
    if (this.frecuencia === "PERSONALIZADA" && this.diasSemana.size === 0) {
      throw new ErrorDominio(
        "HABITO_SIN_DIAS",
        "Un hábito personalizado debe indicar al menos un día.",
      );
    }
  }

  public listarDiasSemana(): readonly number[] {
    return [...this.diasSemana].sort((a, b) => a - b);
  }

  public correspondeA(fecha: FechaLocal): boolean {
    return (
      this.frecuencia === "DIARIA" ||
      this.diasSemana.has(fecha.obtenerDiaSemanaIso())
    );
  }
}
