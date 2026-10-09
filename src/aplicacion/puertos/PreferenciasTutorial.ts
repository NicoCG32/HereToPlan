import type { EstadoTutorialV1 } from "../tutorial/EstadoTutorialV1";

export type LecturaPreferenciasTutorial =
  | Readonly<{ tipo: "AUSENTE" }>
  | Readonly<{ tipo: "GUARDADA"; datos: unknown }>
  | Readonly<{ tipo: "ILEGIBLE" }>;

export interface PreferenciasTutorial {
  leer(): LecturaPreferenciasTutorial;
  guardar(estado: EstadoTutorialV1): void;
}
