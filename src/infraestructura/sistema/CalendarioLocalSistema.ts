import type { CalendarioLocal } from "../../aplicacion";
import { FechaLocal } from "../../dominio";

export class CalendarioLocalSistema implements CalendarioLocal {
  public hoy(): FechaLocal {
    const ahora = new Date();
    return FechaLocal.crear(
      `${String(ahora.getFullYear()).padStart(4, "0")}-${String(
        ahora.getMonth() + 1,
      ).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`,
    );
  }
}
