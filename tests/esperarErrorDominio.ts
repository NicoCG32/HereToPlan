import { expect } from "vitest";
import { ErrorDominio } from "../src/dominio";

export function esperarErrorDominio(
  codigoEsperado: string,
  accion: () => unknown,
): void {
  try {
    accion();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ErrorDominio);
    expect((error as ErrorDominio).codigo).toBe(codigoEsperado);
    return;
  }

  throw new Error(`Se esperaba el error de dominio ${codigoEsperado}.`);
}
