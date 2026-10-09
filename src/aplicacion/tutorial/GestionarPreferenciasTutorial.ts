import type { PreferenciasTutorial } from "../puertos/PreferenciasTutorial";
import {
  VERSION_ESTADO_TUTORIAL,
  crearEstadoTutorialInicial,
  esEstadoTutorialV1,
  type EstadoTutorialV1,
} from "./EstadoTutorialV1";

export type ProblemaPreferenciasTutorial =
  "INCOMPATIBLE" | "INVALIDO" | "NO_DISPONIBLE";
export type ResultadoCargaTutorial =
  | Readonly<{ tipo: "NUEVO" | "VALIDO"; estado: EstadoTutorialV1 }>
  | Readonly<{ tipo: ProblemaPreferenciasTutorial }>;

export class CargarPreferenciasTutorial {
  constructor(private readonly preferencias: PreferenciasTutorial) {}

  public ejecutar(): ResultadoCargaTutorial {
    try {
      const lectura = this.preferencias.leer();
      if (lectura.tipo === "AUSENTE")
        return { tipo: "NUEVO", estado: crearEstadoTutorialInicial() };
      if (lectura.tipo === "ILEGIBLE") return { tipo: "INVALIDO" };
      const datos = lectura.datos;
      if (
        datos &&
        typeof datos === "object" &&
        "version" in datos &&
        typeof datos.version === "number" &&
        datos.version !== VERSION_ESTADO_TUTORIAL
      )
        return { tipo: "INCOMPATIBLE" };
      if (!esEstadoTutorialV1(datos)) return { tipo: "INVALIDO" };
      return {
        tipo: "VALIDO",
        estado: {
          version: datos.version,
          situacion: datos.situacion,
          pasoActual: datos.pasoActual,
        },
      };
    } catch {
      return { tipo: "NO_DISPONIBLE" };
    }
  }
}

export class GuardarPreferenciasTutorial {
  constructor(private readonly preferencias: PreferenciasTutorial) {}

  public ejecutar(
    estado: EstadoTutorialV1,
    reinicioExplicito = false,
  ): Readonly<{ tipo: "GUARDADO" | ProblemaPreferenciasTutorial }> {
    if (!esEstadoTutorialV1(estado)) return { tipo: "INVALIDO" };
    if (!reinicioExplicito) {
      const lectura = new CargarPreferenciasTutorial(
        this.preferencias,
      ).ejecutar();
      if (lectura.tipo !== "NUEVO" && lectura.tipo !== "VALIDO")
        return { tipo: lectura.tipo };
    }
    try {
      this.preferencias.guardar(estado);
      return { tipo: "GUARDADO" };
    } catch {
      return { tipo: "NO_DISPONIBLE" };
    }
  }
}
