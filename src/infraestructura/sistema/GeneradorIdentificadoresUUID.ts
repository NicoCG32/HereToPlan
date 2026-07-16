import type { GeneradorIdentificadores } from "../../aplicacion";

export class GeneradorIdentificadoresUUID implements GeneradorIdentificadores {
  public generar(): string {
    return globalThis.crypto.randomUUID();
  }
}
