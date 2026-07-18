import { describe, expect, it } from "vitest";
import {
  ContextoPlanificacion,
  FechaLocal,
  IDENTIFICADOR_CONTEXTO_LIBRE,
} from "../src/dominio";
import { esperarErrorDominio } from "./esperarErrorDominio";

const CREADA_EN = new Date("2026-07-20T10:00:00.000Z");

describe("contextos de planificación", () => {
  it("crea Libre con identidad estable y sin rango", () => {
    const libre = ContextoPlanificacion.crearLibre(CREADA_EN);

    expect(libre).toMatchObject({
      id: IDENTIFICADOR_CONTEXTO_LIBRE,
      nombre: "Libre",
      tipo: "LIBRE",
      fechaInicio: undefined,
      fechaFin: undefined,
    });
    expect(libre.esLibre()).toBe(true);
    expect(libre.obtenerRango()).toBeUndefined();
    expect(libre.creadaEn).not.toBe(CREADA_EN);
  });

  it("crea contextos nombrados abiertos o con rango personalizado", () => {
    const proyecto = ContextoPlanificacion.crearNombrado({
      id: "contexto-proyecto",
      nombre: "Proyecto editorial",
      proposito: "  Publicar el primer número  ",
      creadaEn: CREADA_EN,
    });
    const semestre = ContextoPlanificacion.crearNombrado({
      id: "contexto-semestre",
      nombre: "Semestre académico",
      fechaInicio: FechaLocal.crear("2026-08-01"),
      fechaFin: FechaLocal.crear("2026-12-20"),
      creadaEn: CREADA_EN,
    });

    expect(proyecto.obtenerRango()).toBeUndefined();
    expect(proyecto.proposito).toBe("Publicar el primer número");
    expect(semestre.obtenerRango()).toMatchObject({
      fechaInicio: { valor: "2026-08-01" },
      fechaFin: { valor: "2026-12-20" },
    });
    expect(semestre.tipo).toBe("NOMBRADO");
  });

  it("normaliza el propósito opcional y limita su extensión", () => {
    const sinProposito = ContextoPlanificacion.crearNombrado({
      id: "contexto-sin-proposito",
      nombre: "Proyecto abierto",
      proposito: "   ",
      creadaEn: CREADA_EN,
    });

    expect(sinProposito.proposito).toBeUndefined();
    esperarErrorDominio("PROPOSITO_CONTEXTO_DEMASIADO_LARGO", () =>
      ContextoPlanificacion.crearNombrado({
        id: "contexto-extenso",
        nombre: "Proyecto extenso",
        proposito: "a".repeat(241),
        creadaEn: CREADA_EN,
      }),
    );
  });

  it("rechaza nombres vacíos, rangos incompletos e invertidos", () => {
    esperarErrorDominio("NOMBRE_CONTEXTO_VACIO", () =>
      ContextoPlanificacion.crearNombrado({
        id: "contexto-1",
        nombre: " ",
        creadaEn: CREADA_EN,
      }),
    );
    esperarErrorDominio("RANGO_CONTEXTO_INCOMPLETO", () =>
      ContextoPlanificacion.crearNombrado({
        id: "contexto-1",
        nombre: "Incompleto",
        fechaInicio: FechaLocal.crear("2026-08-01"),
        creadaEn: CREADA_EN,
      }),
    );
    esperarErrorDominio("RANGO_CONTEXTO_INVALIDO", () =>
      ContextoPlanificacion.crearNombrado({
        id: "contexto-1",
        nombre: "Invertido",
        fechaInicio: FechaLocal.crear("2026-12-20"),
        fechaFin: FechaLocal.crear("2026-08-01"),
        creadaEn: CREADA_EN,
      }),
    );
  });

  it("reserva la identidad de Libre y valida registros rehidratados", () => {
    esperarErrorDominio("IDENTIFICADOR_CONTEXTO_RESERVADO", () =>
      ContextoPlanificacion.crearNombrado({
        id: IDENTIFICADOR_CONTEXTO_LIBRE,
        nombre: "Impostor",
        creadaEn: CREADA_EN,
      }),
    );
    esperarErrorDominio("IDENTIDAD_CONTEXTO_LIBRE_INVALIDA", () =>
      ContextoPlanificacion.rehidratar({
        id: "libre-alternativo",
        nombre: "Libre",
        tipo: "LIBRE",
        creadaEn: CREADA_EN,
      }),
    );
    esperarErrorDominio("CONTEXTO_LIBRE_CON_PROPOSITO", () =>
      ContextoPlanificacion.rehidratar({
        id: IDENTIFICADOR_CONTEXTO_LIBRE,
        nombre: "Libre",
        proposito: "No editable",
        tipo: "LIBRE",
        creadaEn: CREADA_EN,
      }),
    );
  });

  it("impide eliminar Libre y permite eliminar un contexto nombrado", () => {
    const libre = ContextoPlanificacion.crearLibre(CREADA_EN);
    const nombrado = ContextoPlanificacion.crearNombrado({
      id: "contexto-1",
      nombre: "Nombrado",
      creadaEn: CREADA_EN,
    });

    esperarErrorDominio("CONTEXTO_LIBRE_NO_ELIMINABLE", () =>
      libre.exigirEliminable(),
    );
    expect(() => nombrado.exigirEliminable()).not.toThrow();
  });

  it("no incorpora bloques, vistas temporales ni confirmación", () => {
    const contexto = ContextoPlanificacion.crearNombrado({
      id: "contexto-1",
      nombre: "Proyecto",
      creadaEn: CREADA_EN,
    });

    expect("bloques" in contexto).toBe(false);
    expect("estado" in contexto).toBe(false);
    expect("confirmar" in contexto).toBe(false);
    expect("vista" in contexto).toBe(false);
  });
});
