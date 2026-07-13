import { describe, expect, it } from "vitest";
import {
  Agenda,
  AjusteCompromiso,
  FechaLocal,
  PoliticaCompromiso,
} from "../src/dominio";
import { esperarErrorDominio } from "./esperarErrorDominio";

const inicio = FechaLocal.crear("2026-07-20");
const fin = FechaLocal.crear("2026-07-21");
const instante = new Date("2026-07-20T10:00:00.000Z");

function politicaFlexible(
  ajustesPermitidos: Iterable<
    "EXCUSAR" | "REPROGRAMAR" | "EXTENDER_PLAZO" | "REDUCIR_CARGA"
  > = ["EXCUSAR"],
) {
  return new PoliticaCompromiso({
    rigidez: "FLEXIBLE",
    autoridadPlazo: "PERSONAL",
    ajustesPermitidos,
  });
}

function crearAgenda(cantidadBloques = 1): Agenda {
  const agenda = new Agenda({
    id: "agenda-1",
    nombre: "Agenda de prueba",
    fechaInicio: inicio,
    fechaFin: fin,
    creadaEn: instante,
  });
  for (let indice = 1; indice <= cantidadBloques; indice += 1) {
    agenda.agregarBloque({
      id: `bloque-${indice}`,
      actividadId: `actividad-${indice}`,
      titulo: `Bloque ${indice}`,
      fecha: inicio,
      minutosPlanificados: 30,
      politica: politicaFlexible(),
    });
  }
  return agenda;
}

function crearAjuste(
  id: string,
  bloqueId: string,
  tipo: "EXCUSAR" | "REPROGRAMAR" = "EXCUSAR",
) {
  return new AjusteCompromiso({
    id,
    bloqueId,
    canjeRecompensaId: "canje-1",
    tipo,
    aplicadoEn: instante,
  });
}

describe("agendas y bloques de trabajo", () => {
  it("rechaza rangos invertidos y confirmaciones sin bloques", () => {
    esperarErrorDominio(
      "RANGO_AGENDA_INVALIDO",
      () =>
        new Agenda({
          id: "agenda-invalida",
          nombre: "Rango inválido",
          fechaInicio: fin,
          fechaFin: inicio,
          creadaEn: instante,
        }),
    );

    const agenda = crearAgenda(0);
    esperarErrorDominio("AGENDA_SIN_BLOQUES", () => agenda.confirmar(instante));
  });

  it("protege la identidad y el rango de sus bloques", () => {
    const agenda = crearAgenda();
    esperarErrorDominio("BLOQUE_DUPLICADO", () =>
      agenda.agregarBloque({
        id: "bloque-1",
        actividadId: "otra-actividad",
        titulo: "Duplicado",
        fecha: inicio,
        minutosPlanificados: 15,
        politica: politicaFlexible(),
      }),
    );
    esperarErrorDominio("BLOQUE_FUERA_DE_AGENDA", () =>
      agenda.agregarBloque({
        id: "bloque-fuera",
        actividadId: "actividad-fuera",
        titulo: "Fuera del rango",
        fecha: FechaLocal.crear("2026-07-22"),
        minutosPlanificados: 15,
        politica: politicaFlexible(),
      }),
    );
  });

  it("permite quitar bloques sólo durante el borrador", () => {
    const borrador = crearAgenda();
    borrador.quitarBloque("bloque-1");
    expect(borrador.listarBloques()).toHaveLength(0);
    esperarErrorDominio("BLOQUE_NO_ENCONTRADO", () =>
      borrador.quitarBloque("inexistente"),
    );

    const confirmada = crearAgenda();
    confirmada.confirmar(instante);
    esperarErrorDominio("AGENDA_NO_EDITABLE", () =>
      confirmada.quitarBloque("bloque-1"),
    );
  });

  it("sólo resuelve bloques de agendas confirmadas y una única vez", () => {
    const agenda = crearAgenda(2);
    esperarErrorDominio("AGENDA_NO_CONFIRMADA", () =>
      agenda.completarBloque("bloque-1", instante),
    );

    agenda.confirmar(instante);
    agenda.completarBloque("bloque-1", instante);
    esperarErrorDominio("BLOQUE_YA_RESUELTO", () =>
      agenda.completarBloque("bloque-1", instante),
    );
    expect(agenda.estado).toBe("CONFIRMADA");
  });

  it("finaliza únicamente cuando todos sus bloques están resueltos", () => {
    const agenda = crearAgenda(2);
    agenda.confirmar(instante);
    agenda.marcarBloqueIncumplido("bloque-1", instante);
    expect(agenda.estado).toBe("CONFIRMADA");
    agenda.completarBloque("bloque-2", instante);
    expect(agenda.estado).toBe("FINALIZADA");
    expect(agenda.finalizadaEn?.toISOString()).toBe(instante.toISOString());
  });

  it("valida el lote completo antes de aplicar ajustes", () => {
    const agenda = crearAgenda(2);
    agenda.confirmar(instante);

    esperarErrorDominio("AJUSTES_VACIOS", () => agenda.aplicarAjustes([]));
    esperarErrorDominio("AJUSTE_DUPLICADO", () =>
      agenda.aplicarAjustes([
        crearAjuste("ajuste-1", "bloque-1"),
        crearAjuste("ajuste-1", "bloque-2"),
      ]),
    );
    esperarErrorDominio("BLOQUE_AJUSTADO_DOS_VECES", () =>
      agenda.aplicarAjustes([
        crearAjuste("ajuste-1", "bloque-1"),
        crearAjuste("ajuste-2", "bloque-1"),
      ]),
    );

    expect(agenda.listarBloques().map((bloque) => bloque.estado)).toEqual([
      "PENDIENTE",
      "PENDIENTE",
    ]);
  });

  it("rechaza ajustes ajenos, prohibidos o todavía no implementados", () => {
    const agenda = crearAgenda();
    agenda.confirmar(instante);
    esperarErrorDominio("BLOQUE_NO_ENCONTRADO", () =>
      agenda.aplicarAjustes([crearAjuste("ajuste-ajeno", "otro-bloque")]),
    );

    const noImplementada = new Agenda({
      id: "agenda-no-implementada",
      nombre: "Agenda no implementada",
      fechaInicio: inicio,
      fechaFin: fin,
      creadaEn: instante,
    });
    noImplementada.agregarBloque({
      id: "bloque-1",
      actividadId: "actividad-1",
      titulo: "Bloque reprogramable",
      fecha: inicio,
      minutosPlanificados: 30,
      politica: politicaFlexible(["REPROGRAMAR"]),
    });
    noImplementada.confirmar(instante);
    esperarErrorDominio("AJUSTE_NO_IMPLEMENTADO", () =>
      noImplementada.aplicarAjustes([
        crearAjuste("ajuste-reprogramar", "bloque-1", "REPROGRAMAR"),
      ]),
    );
  });

  it("protege las reglas de rigidez y autoridad externa", () => {
    esperarErrorDominio(
      "COMPROMISO_ESTRICTO_CON_AJUSTES",
      () =>
        new PoliticaCompromiso({
          rigidez: "ESTRICTO",
          autoridadPlazo: "PERSONAL",
          ajustesPermitidos: ["EXCUSAR"],
        }),
    );
    esperarErrorDominio(
      "PLAZO_EXTERNO_EXTENDIBLE",
      () =>
        new PoliticaCompromiso({
          rigidez: "FLEXIBLE",
          autoridadPlazo: "EXTERNA",
          ajustesPermitidos: ["EXTENDER_PLAZO"],
        }),
    );
  });
});
