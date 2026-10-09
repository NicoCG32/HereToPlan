import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CargarPreferenciasTutorial,
  GuardarPreferenciasTutorial,
} from "../src/aplicacion/tutorial/GestionarPreferenciasTutorial";
import {
  crearEstadoTutorialInicial,
  type EstadoTutorialV1,
} from "../src/aplicacion/tutorial/EstadoTutorialV1";
import type { PreferenciasTutorial } from "../src/aplicacion/puertos/PreferenciasTutorial";
import {
  CLAVE_PREFERENCIAS_TUTORIAL,
  PreferenciasTutorialLocalStorage,
} from "../src/infraestructura/persistencia/preferencias/PreferenciasTutorialLocalStorage";

afterEach(() => {
  localStorage.removeItem(CLAVE_PREFERENCIAS_TUTORIAL);
  localStorage.removeItem("control-ajeno-tutorial");
});

describe("preferencia versionada del tutorial", () => {
  it("la primera lectura no crea ni sobrescribe registros", () => {
    const guardar = vi.fn();
    const cargar = new CargarPreferenciasTutorial({
      leer: () => ({ tipo: "AUSENTE" }),
      guardar,
    });
    expect(cargar.ejecutar()).toEqual({
      tipo: "NUEVO",
      estado: crearEstadoTutorialInicial(),
    });
    expect(guardar).not.toHaveBeenCalled();
  });

  it.each<EstadoTutorialV1>([
    { version: 1, situacion: "NO_INICIADO", pasoActual: null },
    { version: 1, situacion: "EN_CURSO", pasoActual: "ACTIVIDAD" },
    { version: 1, situacion: "POSPUESTO", pasoActual: "CONFIRMACION" },
    { version: 1, situacion: "OMITIDO", pasoActual: null },
    { version: 1, situacion: "COMPLETADO", pasoActual: null },
  ])("rehidrata $situacion mediante un adaptador nuevo", (estado) => {
    const guardar = new GuardarPreferenciasTutorial(
      new PreferenciasTutorialLocalStorage(),
    );
    expect(guardar.ejecutar(estado).tipo).toBe("GUARDADO");
    const cargado = new CargarPreferenciasTutorial(
      new PreferenciasTutorialLocalStorage(),
    ).ejecutar();
    expect(cargado).toEqual({ tipo: "VALIDO", estado });
    if (cargado.tipo === "VALIDO") expect(cargado.estado).not.toBe(estado);
  });

  it.each([
    null,
    [],
    {},
    { version: "1", situacion: "NO_INICIADO", pasoActual: null },
    { version: 1, situacion: "EN_CURSO", pasoActual: null },
    { version: 1, situacion: "POSPUESTO", pasoActual: "NO_EXISTE" },
    { version: 1, situacion: "COMPLETADO", pasoActual: "EJECUCION" },
    { version: 1, situacion: "OMITIDO", pasoActual: "NAVEGACION" },
    { version: 1, situacion: "OTRA", pasoActual: null },
    {
      version: 1,
      situacion: "NO_INICIADO",
      pasoActual: null,
      perfilId: "ajeno",
    },
  ])("rechaza un registro incoherente sin reemplazarlo: %j", (registro) => {
    const original = JSON.stringify(registro);
    localStorage.setItem(CLAVE_PREFERENCIAS_TUTORIAL, original);
    const preferencias = new PreferenciasTutorialLocalStorage();
    expect(new CargarPreferenciasTutorial(preferencias).ejecutar().tipo).toBe(
      "INVALIDO",
    );
    expect(
      new GuardarPreferenciasTutorial(preferencias).ejecutar(
        crearEstadoTutorialInicial(),
      ).tipo,
    ).toBe("INVALIDO");
    expect(localStorage.getItem(CLAVE_PREFERENCIAS_TUTORIAL)).toBe(original);
  });

  it("conserva una versión futura hasta un reinicio explícito y no toca otras claves", () => {
    const futuro = '{"version":2,"situacion":"NUEVA","pasoActual":"OTRO"}';
    localStorage.setItem(CLAVE_PREFERENCIAS_TUTORIAL, futuro);
    localStorage.setItem("control-ajeno-tutorial", "conservar");
    const preferencias = new PreferenciasTutorialLocalStorage();
    expect(new CargarPreferenciasTutorial(preferencias).ejecutar().tipo).toBe(
      "INCOMPATIBLE",
    );
    const guardar = new GuardarPreferenciasTutorial(preferencias);
    expect(guardar.ejecutar(crearEstadoTutorialInicial()).tipo).toBe(
      "INCOMPATIBLE",
    );
    expect(localStorage.getItem(CLAVE_PREFERENCIAS_TUTORIAL)).toBe(futuro);
    expect(guardar.ejecutar(crearEstadoTutorialInicial(), true).tipo).toBe(
      "GUARDADO",
    );
    expect(
      JSON.parse(localStorage.getItem(CLAVE_PREFERENCIAS_TUTORIAL)!),
    ).toEqual(crearEstadoTutorialInicial());
    expect(localStorage.getItem("control-ajeno-tutorial")).toBe("conservar");
  });

  it("conserva JSON ilegible y permite recuperarlo sólo explícitamente", () => {
    localStorage.setItem(CLAVE_PREFERENCIAS_TUTORIAL, '{"version":');
    const preferencias = new PreferenciasTutorialLocalStorage();
    expect(preferencias.leer().tipo).toBe("ILEGIBLE");
    expect(new CargarPreferenciasTutorial(preferencias).ejecutar().tipo).toBe(
      "INVALIDO",
    );
    expect(
      new GuardarPreferenciasTutorial(preferencias).ejecutar(
        crearEstadoTutorialInicial(),
      ).tipo,
    ).toBe("INVALIDO");
    expect(localStorage.getItem(CLAVE_PREFERENCIAS_TUTORIAL)).toBe(
      '{"version":',
    );
  });

  it("no escribe si no puede leer el registro anterior", () => {
    const guardar = vi.fn();
    const preferencias: PreferenciasTutorial = {
      leer: () => {
        throw new Error("Lectura bloqueada");
      },
      guardar,
    };
    expect(new CargarPreferenciasTutorial(preferencias).ejecutar().tipo).toBe(
      "NO_DISPONIBLE",
    );
    expect(
      new GuardarPreferenciasTutorial(preferencias).ejecutar(
        crearEstadoTutorialInicial(),
      ).tipo,
    ).toBe("NO_DISPONIBLE");
    expect(guardar).not.toHaveBeenCalled();
  });

  it("informa un fallo de guardado y admite reintentar el progreso actual", () => {
    const guardar = vi.fn().mockImplementationOnce(() => {
      throw new Error("Cuota agotada");
    });
    const preferencias: PreferenciasTutorial = {
      leer: () => ({ tipo: "AUSENTE" }),
      guardar,
    };
    const caso = new GuardarPreferenciasTutorial(preferencias);
    expect(caso.ejecutar(crearEstadoTutorialInicial()).tipo).toBe(
      "NO_DISPONIBLE",
    );
    const actual: EstadoTutorialV1 = {
      version: 1,
      situacion: "POSPUESTO",
      pasoActual: "REVISION",
    };
    expect(caso.ejecutar(actual).tipo).toBe("GUARDADO");
    expect(guardar).toHaveBeenLastCalledWith(actual);
  });

  it("verifica también el contrato de la escritura antes de llamar al puerto", () => {
    const guardar = vi.fn();
    const estadoInvalido = {
      version: 1,
      situacion: "EN_CURSO",
      pasoActual: null,
    } as unknown as EstadoTutorialV1;
    expect(
      new GuardarPreferenciasTutorial({
        leer: () => ({ tipo: "AUSENTE" }),
        guardar,
      }).ejecutar(estadoInvalido).tipo,
    ).toBe("INVALIDO");
    expect(guardar).not.toHaveBeenCalled();
  });

  it("detecta una versión que cambió después de cargar y evita sobrescribirla", () => {
    const preferencias = new PreferenciasTutorialLocalStorage();
    localStorage.setItem(
      CLAVE_PREFERENCIAS_TUTORIAL,
      JSON.stringify(crearEstadoTutorialInicial()),
    );
    expect(new CargarPreferenciasTutorial(preferencias).ejecutar().tipo).toBe(
      "VALIDO",
    );
    localStorage.setItem(CLAVE_PREFERENCIAS_TUTORIAL, '{"version":3}');
    expect(
      new GuardarPreferenciasTutorial(preferencias).ejecutar({
        version: 1,
        situacion: "EN_CURSO",
        pasoActual: "LIBRE",
      }).tipo,
    ).toBe("INCOMPATIBLE");
    expect(localStorage.getItem(CLAVE_PREFERENCIAS_TUTORIAL)).toBe(
      '{"version":3}',
    );
  });
});
