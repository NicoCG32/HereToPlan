import { describe, expect, it } from "vitest";
import {
  Agenda,
  BilleteraPuntos,
  DefinicionRecompensa,
  ErrorDominio,
  FechaLocal,
  PoliticaCompromiso,
  ServicioCanjeRecompensas,
  TransaccionPuntos,
} from "../src/dominio";

const fecha = FechaLocal.crear("2026-07-20");
const instante = new Date("2026-07-12T20:00:00.000Z");

function politicaEstricta() {
  return new PoliticaCompromiso({
    rigidez: "ESTRICTO",
    autoridadPlazo: "PERSONAL",
  });
}

function politicaFlexible() {
  return new PoliticaCompromiso({
    rigidez: "FLEXIBLE",
    autoridadPlazo: "PERSONAL",
    ajustesPermitidos: ["EXCUSAR"],
  });
}

function crearAgendaConBloques() {
  const agenda = new Agenda({
    id: "agenda-1",
    nombre: "Semana de planificación",
    fechaInicio: fecha,
    fechaFin: fecha,
    creadaEn: instante,
  });
  agenda.agregarBloque({
    id: "bloque-flexible",
    actividadId: "actividad-1",
    titulo: "Avanzar proyecto personal",
    fecha,
    minutosPlanificados: 60,
    politica: politicaFlexible(),
  });
  agenda.agregarBloque({
    id: "bloque-estricto",
    actividadId: "actividad-2",
    titulo: "Presentar evaluación externa",
    fecha,
    minutosPlanificados: 90,
    politica: politicaEstricta(),
  });
  agenda.confirmar(instante);
  return agenda;
}

function crearBilleteraConSaldo(cantidad = 2000) {
  const billetera = new BilleteraPuntos();
  billetera.registrar(
    new TransaccionPuntos({
      id: "ingreso-1",
      tipo: "INGRESO",
      cantidad,
      fuenteTipo: "COMPROMISO_COMPLETADO",
      fuenteId: "bloque-anterior",
      descripcion: "Puntos iniciales para la prueba",
      ocurridaEn: instante,
    }),
  );
  return billetera;
}

describe("base del dominio", () => {
  it("impide editar una agenda confirmada", () => {
    const agenda = crearAgendaConBloques();

    expect(() =>
      agenda.agregarBloque({
        id: "bloque-tardio",
        actividadId: "actividad-3",
        titulo: "Cambio posterior",
        fecha,
        minutosPlanificados: 30,
        politica: politicaFlexible(),
      }),
    ).toThrowError(ErrorDominio);
  });

  it("selecciona para el día libre solo compromisos flexibles", () => {
    const agenda = crearAgendaConBloques();

    expect(
      agenda
        .listarBloquesElegibles(fecha, "EXCUSAR")
        .map((bloque) => bloque.id),
    ).toEqual(["bloque-flexible"]);
  });

  it("entrega vistas que no alteran el agregado", () => {
    const agenda = crearAgendaConBloques();
    const vista = agenda.listarBloques()[0];
    if (!vista) {
      throw new Error("La prueba requiere al menos un bloque.");
    }

    (vista as { estado: string }).estado = "EXCUSADO";

    expect(agenda.listarBloques()[0]?.estado).toBe("PENDIENTE");
  });

  it("prepara un canje sin mutar agendas ni billetera", () => {
    const agenda = crearAgendaConBloques();
    const billetera = crearBilleteraConSaldo();
    const recompensa = new DefinicionRecompensa({
      id: "dia-libre",
      nombre: "Día libre",
      descripcion: "Excusa compromisos flexibles de una fecha.",
      costoPuntos: 1500,
      tipoEfecto: "DIA_LIBRE",
    });

    const resultado = new ServicioCanjeRecompensas().prepararCanjeDiaLibre({
      idCanje: "canje-1",
      idTransaccion: "gasto-1",
      crearIdAjuste: (_agendaId, bloqueId) => `ajuste-${bloqueId}`,
      recompensa,
      billetera,
      agendas: [agenda],
      fechaObjetivo: fecha,
      fechaCanje: instante,
    });

    expect(resultado.canje.puntosGastados).toBe(1500);
    expect(resultado.gasto.obtenerVariacion()).toBe(-1500);
    expect(resultado.ajustesPorAgenda[0]?.ajustes).toHaveLength(1);
    expect(agenda.listarBloques()[0]?.estado).toBe("PENDIENTE");
    expect(billetera.saldo).toBe(2000);
  });

  it("excusa el flexible, conserva el estricto y descuenta puntos", () => {
    const agenda = crearAgendaConBloques();
    const billetera = crearBilleteraConSaldo();
    const recompensa = new DefinicionRecompensa({
      id: "dia-libre",
      nombre: "Día libre",
      descripcion: "Excusa compromisos flexibles de una fecha.",
      costoPuntos: 1500,
      tipoEfecto: "DIA_LIBRE",
    });
    const resultado = new ServicioCanjeRecompensas().prepararCanjeDiaLibre({
      idCanje: "canje-2",
      idTransaccion: "gasto-2",
      crearIdAjuste: (_agendaId, bloqueId) => `ajuste-2-${bloqueId}`,
      recompensa,
      billetera,
      agendas: [agenda],
      fechaObjetivo: fecha,
      fechaCanje: instante,
    });
    const ajustes = resultado.ajustesPorAgenda[0]?.ajustes;
    if (!ajustes) {
      throw new Error("La prueba requiere ajustes preparados.");
    }

    agenda.aplicarAjustes(ajustes);
    billetera.registrar(resultado.gasto);

    const estados = Object.fromEntries(
      agenda.listarBloques().map((bloque) => [bloque.id, bloque.estado]),
    );
    expect(estados["bloque-flexible"]).toBe("EXCUSADO");
    expect(estados["bloque-estricto"]).toBe("PENDIENTE");
    expect(billetera.saldo).toBe(500);
  });

  it("impide un saldo negativo", () => {
    const billetera = crearBilleteraConSaldo(500);

    expect(() =>
      billetera.registrar(
        new TransaccionPuntos({
          id: "gasto-imposible",
          tipo: "GASTO",
          cantidad: 1500,
          fuenteTipo: "CANJE_RECOMPENSA",
          fuenteId: "canje-imposible",
          descripcion: "Gasto superior al saldo",
          ocurridaEn: instante,
        }),
      ),
    ).toThrowError(ErrorDominio);
  });
});
