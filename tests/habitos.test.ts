import { describe, expect, it } from "vitest";
import { Agenda, FechaLocal, Habito, PoliticaCompromiso } from "../src/dominio";
import { esperarErrorDominio } from "./esperarErrorDominio";

const COMUNES = {
  id: "habito-1",
  titulo: "Practicar",
  tiempoNecesarioMinutos: 20,
  creadaEn: new Date("2026-07-20T10:00:00.000Z"),
} as const;

describe("hábitos", () => {
  it("modela frecuencias diaria, semanal y personalizada", () => {
    const diario = new Habito({ ...COMUNES, frecuencia: "DIARIA" });
    const semanal = new Habito({
      ...COMUNES,
      id: "habito-2",
      frecuencia: "SEMANAL",
      diasSemana: [3],
    });
    const personalizado = new Habito({
      ...COMUNES,
      id: "habito-3",
      frecuencia: "PERSONALIZADA",
      diasSemana: [5, 1, 3],
    });

    expect(diario.correspondeA(FechaLocal.crear("2026-07-23"))).toBe(true);
    expect(semanal.correspondeA(FechaLocal.crear("2026-07-22"))).toBe(true);
    expect(semanal.correspondeA(FechaLocal.crear("2026-07-23"))).toBe(false);
    expect(personalizado.listarDiasSemana()).toEqual([1, 3, 5]);
    expect(personalizado.correspondeA(FechaLocal.crear("2026-07-24"))).toBe(
      true,
    );
  });

  it("rechaza días inválidos y configuraciones ambiguas", () => {
    esperarErrorDominio(
      "DIA_SEMANA_INVALIDO",
      () =>
        new Habito({
          ...COMUNES,
          frecuencia: "PERSONALIZADA",
          diasSemana: [0, 8],
        }),
    );
    esperarErrorDominio(
      "HABITO_SIN_DIAS",
      () => new Habito({ ...COMUNES, frecuencia: "PERSONALIZADA" }),
    );
    esperarErrorDominio(
      "HABITO_SEMANAL_SIN_DIA_UNICO",
      () =>
        new Habito({
          ...COMUNES,
          frecuencia: "SEMANAL",
          diasSemana: [1, 3],
        }),
    );
    esperarErrorDominio(
      "HABITO_DIARIO_CON_DIAS",
      () =>
        new Habito({
          ...COMUNES,
          frecuencia: "DIARIA",
          diasSemana: [1],
        }),
    );
  });

  it("permanece separado de sus ocurrencias calendarizadas", () => {
    const habito = new Habito({
      ...COMUNES,
      frecuencia: "PERSONALIZADA",
      diasSemana: [1, 5],
    });

    expect(habito.correspondeA(FechaLocal.crear("2026-07-20"))).toBe(true);
    expect("fecha" in habito).toBe(false);
    expect("estado" in habito).toBe(false);

    const agenda = new Agenda({
      id: "agenda-1",
      nombre: "Agenda",
      fechaInicio: FechaLocal.crear("2026-07-20"),
      fechaFin: FechaLocal.crear("2026-07-26"),
      creadaEn: COMUNES.creadaEn,
    });
    agenda.agregarBloque({
      id: "ocurrencia-1",
      actividadId: habito.id,
      titulo: habito.titulo,
      fecha: FechaLocal.crear("2026-07-20"),
      minutosPlanificados: habito.tiempoNecesarioMinutos,
      politica: new PoliticaCompromiso({
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
      }),
    });
    expect(agenda.listarBloques()[0]).toMatchObject({
      actividadId: "habito-1",
      minutosPlanificados: 20,
    });
  });
});
