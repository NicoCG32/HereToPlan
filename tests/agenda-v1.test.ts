import { describe, expect, it, vi } from "vitest";
import {
  Agenda,
  AjusteCompromiso,
  FechaLocal,
  PoliticaCompromiso,
} from "../src/dominio";
import {
  convertirAgendaEnV1,
  ErrorMapeoAgendaV1,
  rehidratarAgendaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorAgendaV1";
import type { AgendaV1 } from "../src/infraestructura/persistencia/registros/AgendaV1";

const inicio = FechaLocal.crear("2026-07-20");
const fin = FechaLocal.crear("2026-07-21");
const creadaEn = new Date("2026-07-19T20:00:00.000Z");
const confirmadaEn = new Date("2026-07-19T21:00:00.000Z");
const primeraResolucion = new Date("2026-07-20T12:00:00.000Z");
const segundaResolucion = new Date("2026-07-21T13:00:00.000Z");

function crearAgendaConDosBloques(): Agenda {
  const agenda = new Agenda({
    id: "agenda-1",
    nombre: "Agenda persistible",
    fechaInicio: inicio,
    fechaFin: fin,
    creadaEn,
  });
  agenda.agregarBloque({
    id: "bloque-1",
    actividadId: "actividad-1",
    titulo: "Bloque estricto",
    fecha: inicio,
    minutosPlanificados: 45,
    politica: new PoliticaCompromiso({
      rigidez: "ESTRICTO",
      autoridadPlazo: "EXTERNA",
    }),
  });
  agenda.agregarBloque({
    id: "bloque-2",
    actividadId: "actividad-2",
    titulo: "Bloque flexible",
    fecha: fin,
    minutosPlanificados: 30,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["EXCUSAR", "REDUCIR_CARGA"],
    }),
  });
  return agenda;
}

function crearAgendaFinalizadaConAjuste(): Agenda {
  const agenda = crearAgendaConDosBloques();
  agenda.confirmar(confirmadaEn);
  agenda.completarBloque("bloque-1", primeraResolucion);
  agenda.aplicarAjustes([
    new AjusteCompromiso({
      id: "ajuste-1",
      bloqueId: "bloque-2",
      canjeRecompensaId: "canje-1",
      tipo: "EXCUSAR",
      aplicadoEn: segundaResolucion,
    }),
  ]);
  return agenda;
}

function serializarYRehidratar(agenda: Agenda): {
  registro: AgendaV1;
  rehidratada: Agenda;
} {
  const registro = convertirAgendaEnV1(agenda);
  const registroPlano = JSON.parse(JSON.stringify(registro)) as AgendaV1;
  return {
    registro,
    rehidratada: rehidratarAgendaDesdeV1(registroPlano),
  };
}

function esperarErrorMapeo(
  codigo: ErrorMapeoAgendaV1["codigo"],
  operacion: () => unknown,
): void {
  try {
    operacion();
    throw new Error(`Se esperaba el error de mapeo ${codigo}.`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ErrorMapeoAgendaV1);
    expect((error as ErrorMapeoAgendaV1).codigo).toBe(codigo);
  }
}

describe("AgendaV1", () => {
  it("serializa y rehidrata una agenda borrador sin perder información", () => {
    const agenda = crearAgendaConDosBloques();
    const { registro, rehidratada } = serializarYRehidratar(agenda);

    expect(registro.versionEsquema).toBe(1);
    expect(registro.estado).toBe("BORRADOR");
    expect(registro.confirmadaEn).toBeUndefined();
    expect(registro.finalizadaEn).toBeUndefined();
    expect(Object.isFrozen(registro)).toBe(true);
    expect(Object.isFrozen(registro.bloques)).toBe(true);
    expect(rehidratada).not.toBe(agenda);
    expect(convertirAgendaEnV1(rehidratada)).toEqual(registro);
  });

  it("conserva una agenda confirmada con resoluciones parciales", () => {
    const agenda = crearAgendaConDosBloques();
    agenda.confirmar(confirmadaEn);
    agenda.completarBloque("bloque-1", primeraResolucion);
    const { registro, rehidratada } = serializarYRehidratar(agenda);

    expect(registro.estado).toBe("CONFIRMADA");
    expect(registro.confirmadaEn).toBe("2026-07-19T21:00:00.000Z");
    expect(registro.bloques[0]?.resueltoEn).toBe("2026-07-20T12:00:00.000Z");
    expect(convertirAgendaEnV1(rehidratada)).toEqual(registro);
  });

  it("conserva una agenda finalizada y la relación entre ajuste y bloque", () => {
    const agenda = crearAgendaFinalizadaConAjuste();
    const { registro, rehidratada } = serializarYRehidratar(agenda);

    expect(registro.estado).toBe("FINALIZADA");
    expect(registro.finalizadaEn).toBe("2026-07-21T13:00:00.000Z");
    expect(registro.ajustes).toEqual([
      {
        id: "ajuste-1",
        bloqueId: "bloque-2",
        canjeRecompensaId: "canje-1",
        tipo: "EXCUSAR",
        aplicadoEn: "2026-07-21T13:00:00.000Z",
      },
    ]);
    expect(convertirAgendaEnV1(rehidratada)).toEqual(registro);
  });

  it("rehidrata el estado histórico sin reproducir operaciones de negocio", () => {
    const registro = convertirAgendaEnV1(crearAgendaFinalizadaConAjuste());
    const confirmar = vi.spyOn(Agenda.prototype, "confirmar");
    const completar = vi.spyOn(Agenda.prototype, "completarBloque");
    const aplicarAjustes = vi.spyOn(Agenda.prototype, "aplicarAjustes");

    try {
      const rehidratada = rehidratarAgendaDesdeV1(registro);

      expect(rehidratada.estado).toBe("FINALIZADA");
      expect(confirmar).not.toHaveBeenCalled();
      expect(completar).not.toHaveBeenCalled();
      expect(aplicarAjustes).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("preserva fechas civiles sin reinterpretarlas por zona horaria", () => {
    const { registro, rehidratada } = serializarYRehidratar(
      crearAgendaConDosBloques(),
    );

    expect(registro.fechaInicio).toBe("2026-07-20");
    expect(registro.fechaFin).toBe("2026-07-21");
    expect(rehidratada.fechaInicio.toString()).toBe("2026-07-20");
    expect(rehidratada.fechaFin.toString()).toBe("2026-07-21");
  });

  it("rechaza versiones desconocidas e instantes no normalizados", () => {
    const registro = convertirAgendaEnV1(crearAgendaConDosBloques());
    const versionDesconocida = {
      ...registro,
      versionEsquema: 2,
    } as unknown as AgendaV1;
    const instanteNoNormalizado = {
      ...registro,
      creadaEn: "2026-07-19T17:00:00-03:00",
    };

    esperarErrorMapeo("VERSION_AGENDA_NO_SOPORTADA", () =>
      rehidratarAgendaDesdeV1(versionDesconocida),
    );
    esperarErrorMapeo("REGISTRO_AGENDA_INVALIDO", () =>
      rehidratarAgendaDesdeV1(instanteNoNormalizado),
    );
  });

  it("rechaza estados históricos internamente incoherentes", () => {
    const agenda = crearAgendaConDosBloques();
    agenda.confirmar(confirmadaEn);
    agenda.completarBloque("bloque-1", primeraResolucion);
    const registro = convertirAgendaEnV1(agenda);
    const finalizadaConPendientes = {
      ...registro,
      estado: "FINALIZADA",
      finalizadaEn: segundaResolucion.toISOString(),
    } as const;

    esperarErrorMapeo("REGISTRO_AGENDA_INVALIDO", () =>
      rehidratarAgendaDesdeV1(finalizadaConPendientes),
    );
  });

  it("rechaza bloques duplicados, fuera de rango o con resolución incoherente", () => {
    const registro = convertirAgendaEnV1(crearAgendaConDosBloques());
    const primerBloque = registro.bloques[0]!;
    const registrosInvalidos: readonly AgendaV1[] = [
      { ...registro, bloques: [primerBloque, primerBloque] },
      {
        ...registro,
        bloques: [{ ...primerBloque, fecha: "2026-07-22" }],
      },
      {
        ...registro,
        bloques: [
          {
            ...primerBloque,
            resueltoEn: primeraResolucion.toISOString(),
          },
        ],
      },
      {
        ...registro,
        bloques: [
          {
            ...primerBloque,
            estado: "DESCONOCIDO",
            resueltoEn: primeraResolucion.toISOString(),
          } as unknown as AgendaV1["bloques"][number],
        ],
      },
    ];

    for (const registroInvalido of registrosInvalidos) {
      esperarErrorMapeo("REGISTRO_AGENDA_INVALIDO", () =>
        rehidratarAgendaDesdeV1(registroInvalido),
      );
    }
  });

  it("rechaza un bloque excusado que perdió su ajuste histórico", () => {
    const registro = convertirAgendaEnV1(crearAgendaFinalizadaConAjuste());
    const sinAjustes = { ...registro, ajustes: [] };

    esperarErrorMapeo("REGISTRO_AGENDA_INVALIDO", () =>
      rehidratarAgendaDesdeV1(sinAjustes),
    );
  });
});
