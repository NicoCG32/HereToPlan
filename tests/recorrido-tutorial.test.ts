import { describe, expect, it } from "vitest";
import {
  RECORRIDO_TUTORIAL,
  VERSION_ESTADO_TUTORIAL,
  cerrarTutorial,
  completarPasoTutorial,
  continuarTutorial,
  crearEstadoTutorial,
  iniciarTutorial,
  omitirTutorial,
  posponerTutorial,
  reiniciarTutorial,
} from "../src/presentacion/tutorial/RecorridoTutorial";

describe("contrato del recorrido tutorial", () => {
  it("enseña el recorrido completo en destinos estables", () => {
    expect(RECORRIDO_TUTORIAL.map(({ id }) => id)).toEqual([
      "NAVEGACION",
      "LIBRE",
      "AGENDA_OPCIONAL",
      "ACTIVIDAD",
      "ASIGNACION",
      "REVISION",
      "CONFIRMACION",
      "EJECUCION",
    ]);
    expect(
      RECORRIDO_TUTORIAL.every(
        ({ proposito, condicionEntrada, termino, destino }) =>
          proposito.length > 0 &&
          condicionEntrada.length > 0 &&
          termino.length > 0 &&
          ["/calendario", "/crear"].includes(destino),
      ),
    ).toBe(true);
  });

  it("mantiene un estado versionado independiente de perfil y calendario", () => {
    expect(crearEstadoTutorial()).toEqual({
      version: VERSION_ESTADO_TUTORIAL,
      situacion: "NO_INICIADO",
      pasoActual: null,
    });
    expect(Object.keys(crearEstadoTutorial()).sort()).toEqual([
      "pasoActual",
      "situacion",
      "version",
    ]);
  });

  it("inicia, pospone, continúa y cierra sin alterar el progreso", () => {
    const iniciado = iniciarTutorial(crearEstadoTutorial());
    const pospuesto = posponerTutorial(iniciado);
    const continuado = continuarTutorial(pospuesto);

    expect(iniciado.pasoActual).toBe("NAVEGACION");
    expect(pospuesto).toMatchObject({
      situacion: "POSPUESTO",
      pasoActual: "NAVEGACION",
    });
    expect(continuado).toMatchObject({
      situacion: "EN_CURSO",
      pasoActual: "NAVEGACION",
    });
    expect(cerrarTutorial(continuado)).toBe(continuado);
  });

  it("avanza sólo el paso vigente y termina tras la ejecución", () => {
    let estado = iniciarTutorial(crearEstadoTutorial());
    expect(() => completarPasoTutorial(estado, "LIBRE")).toThrow("no coincide");
    for (const paso of RECORRIDO_TUTORIAL)
      estado = completarPasoTutorial(estado, paso.id);

    expect(estado).toMatchObject({
      situacion: "COMPLETADO",
      pasoActual: null,
    });
  });

  it("distingue omitir de reiniciar", () => {
    const omitido = omitirTutorial(iniciarTutorial(crearEstadoTutorial()));
    expect(omitido).toMatchObject({ situacion: "OMITIDO", pasoActual: null });
    expect(reiniciarTutorial()).toEqual(crearEstadoTutorial());
  });

  it("rechaza transiciones que no corresponden al estado", () => {
    expect(() => posponerTutorial(crearEstadoTutorial())).toThrow(
      "NO_INICIADO",
    );
    expect(() => continuarTutorial(crearEstadoTutorial())).toThrow(
      "NO_INICIADO",
    );
  });
});
