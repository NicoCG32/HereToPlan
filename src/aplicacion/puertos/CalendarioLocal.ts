import type { FechaLocal } from "../../dominio";

export interface CalendarioLocal {
  hoy(): FechaLocal;
}
