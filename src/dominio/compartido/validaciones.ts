import { ErrorDominio } from "./ErrorDominio";
import type { Identificador } from "./tipos";

export function exigirTexto(
  valor: string,
  codigo: string,
  mensaje: string,
): string {
  const texto = valor.trim();
  if (texto.length === 0) {
    throw new ErrorDominio(codigo, mensaje);
  }
  return texto;
}

export function exigirIdentificador(
  valor: Identificador,
  nombre = "identificador",
): Identificador {
  return exigirTexto(
    valor,
    "IDENTIFICADOR_INVALIDO",
    `El ${nombre} no puede estar vacío.`,
  );
}

export function exigirEnteroPositivo(
  valor: number,
  codigo: string,
  mensaje: string,
): number {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErrorDominio(codigo, mensaje);
  }
  return valor;
}

export function copiarFecha(fecha: Date, nombre = "fecha"): Date {
  if (Number.isNaN(fecha.getTime())) {
    throw new ErrorDominio(
      "FECHA_INVALIDA",
      `La ${nombre} debe ser una fecha válida.`,
    );
  }
  return new Date(fecha);
}




