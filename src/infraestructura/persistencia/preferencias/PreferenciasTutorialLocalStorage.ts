import type { EstadoTutorialV1 } from "../../../aplicacion/tutorial/EstadoTutorialV1";
import type {
  LecturaPreferenciasTutorial,
  PreferenciasTutorial,
} from "../../../aplicacion/puertos/PreferenciasTutorial";

export const CLAVE_PREFERENCIAS_TUTORIAL = "here-to-plan.preferencias.tutorial";

export class PreferenciasTutorialLocalStorage implements PreferenciasTutorial {
  constructor(
    private readonly almacen?: Pick<Storage, "getItem" | "setItem">,
  ) {}

  public leer(): LecturaPreferenciasTutorial {
    const texto = this.obtenerAlmacen().getItem(CLAVE_PREFERENCIAS_TUTORIAL);
    if (texto === null) return { tipo: "AUSENTE" };
    try {
      return { tipo: "GUARDADA", datos: JSON.parse(texto) as unknown };
    } catch {
      return { tipo: "ILEGIBLE" };
    }
  }

  public guardar(estado: EstadoTutorialV1): void {
    this.obtenerAlmacen().setItem(
      CLAVE_PREFERENCIAS_TUTORIAL,
      JSON.stringify(estado),
    );
  }

  private obtenerAlmacen(): Pick<Storage, "getItem" | "setItem"> {
    return this.almacen ?? window.localStorage;
  }
}
