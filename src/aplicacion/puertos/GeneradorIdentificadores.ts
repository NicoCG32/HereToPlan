import type { Identificador } from "../../dominio";

export interface GeneradorIdentificadores {
  generar(): Identificador;
}
