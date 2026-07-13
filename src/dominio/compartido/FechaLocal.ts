import { ErrorDominio } from "./ErrorDominio";

export class FechaLocal {
  private static readonly FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;
  public readonly valor: string;

  private constructor(valor: string) {
    this.valor = valor;
  }

  public static crear(valor: string): FechaLocal {
    const coincidencia = FechaLocal.FORMATO.exec(valor);
    if (!coincidencia) {
      throw new ErrorDominio(
        "FECHA_LOCAL_INVALIDA",
        "La fecha local debe utilizar el formato YYYY-MM-DD.",
      );
    }

    const anio = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    const dia = Number(coincidencia[3]);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));

    if (
      fecha.getUTCFullYear() !== anio ||
      fecha.getUTCMonth() + 1 !== mes ||
      fecha.getUTCDate() !== dia
    ) {
      throw new ErrorDominio(
        "FECHA_LOCAL_INEXISTENTE",
        "La fecha local indicada no existe.",
      );
    }

    return new FechaLocal(valor);
  }

  public esAnteriorA(otra: FechaLocal): boolean {
    return this.valor < otra.valor;
  }

  public esPosteriorA(otra: FechaLocal): boolean {
    return this.valor > otra.valor;
  }

  public esIgualA(otra: FechaLocal): boolean {
    return this.valor === otra.valor;
  }

  public toString(): string {
    return this.valor;
  }
}


