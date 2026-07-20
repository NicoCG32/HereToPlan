import { describe, expect, it } from "vitest";
import {
  Agenda,
  BilleteraPuntos,
  CanjeRecompensa,
  DefinicionRecompensa,
  FechaLocal,
  FormulaPuntosBloque,
  PoliticaCompromiso,
  ServicioCanjeRecompensas,
  TransaccionPuntos,
} from "../src/dominio";
import { esperarErrorDominio } from "./esperarErrorDominio";

const fecha = FechaLocal.crear("2026-07-21");
const fechaActual = FechaLocal.crear("2026-07-20");
const instante = new Date("2026-07-20T10:00:00.000Z");

function crearTransaccion(
  id: string,
  fuenteId: string,
  tipo: "INGRESO" | "GASTO" = "INGRESO",
  cantidad = 100,
) {
  return new TransaccionPuntos({
    id,
    tipo,
    cantidad,
    fuenteTipo:
      tipo === "INGRESO" ? "COMPROMISO_COMPLETADO" : "CANJE_RECOMPENSA",
    fuenteId,
    descripcion: `Movimiento ${id}`,
    ocurridaEn: instante,
  });
}

function crearRecompensa(costoPuntos = 1500) {
  return new DefinicionRecompensa({
    id: "dia-libre",
    nombre: "Día libre",
    descripcion: "Excusa compromisos flexibles.",
    costoPuntos,
    tipoEfecto: "DIA_LIBRE",
  });
}

function crearAgenda(
  id: string,
  bloqueId: string,
  flexible = true,
  autoridadPlazo: "PERSONAL" | "EXTERNA" = "PERSONAL",
) {
  const agenda = new Agenda({
    id,
    nombre: `Agenda ${id}`,
    fechaInicio: fecha,
    fechaFin: fecha,
    creadaEn: instante,
  });
  agenda.agregarBloque({
    id: bloqueId,
    actividadId: `actividad-${id}`,
    titulo: "Bloque planificado",
    fecha,
    minutosPlanificados: 60,
    politica: new PoliticaCompromiso({
      rigidez: flexible ? "FLEXIBLE" : "ESTRICTO",
      autoridadPlazo,
      ajustesPermitidos: flexible ? ["EXCUSAR"] : [],
    }),
  });
  agenda.confirmar(instante);
  return agenda;
}

function crearBilletera(saldo = 2000) {
  const billetera = new BilleteraPuntos();
  billetera.registrar(
    crearTransaccion("ingreso-inicial", "bloque-anterior", "INGRESO", saldo),
  );
  return billetera;
}

describe("puntos y recompensas", () => {
  it("calcula la puntuación inicial por tramos de treinta minutos y limita cada bloque", () => {
    const formula = new FormulaPuntosBloque();

    expect(formula.calcular(1)).toBe(1);
    expect(formula.calcular(30)).toBe(1);
    expect(formula.calcular(31)).toBe(2);
    expect(formula.calcular(120)).toBe(4);
    expect(formula.calcular(121)).toBe(4);
    expect(formula.calcular(480)).toBe(4);
  });

  it("permite configurar las unidades y rechaza entradas no puntuables", () => {
    const formula = new FormulaPuntosBloque({
      minutosPorPunto: 15,
      maximoPuntosPorBloque: 2,
    });

    expect(formula.calcular(16)).toBe(2);
    esperarErrorDominio("MINUTOS_PUNTUABLES_INVALIDOS", () =>
      formula.calcular(0),
    );
    esperarErrorDominio(
      "MINUTOS_POR_PUNTO_INVALIDOS",
      () =>
        new FormulaPuntosBloque({
          minutosPorPunto: 0,
          maximoPuntosPorBloque: 4,
        }),
    );
  });

  it("rechaza identificadores y fuentes semánticas duplicadas", () => {
    const billetera = crearBilletera();
    esperarErrorDominio("TRANSACCION_DUPLICADA", () =>
      billetera.registrar(crearTransaccion("ingreso-inicial", "otro-bloque")),
    );
    esperarErrorDominio("FUENTE_PUNTOS_DUPLICADA", () =>
      billetera.registrar(crearTransaccion("otro-ingreso", "bloque-anterior")),
    );
  });

  it("expone una colección independiente y calcula ingresos y gastos", () => {
    const billetera = crearBilletera();
    billetera.registrar(crearTransaccion("gasto-1", "canje-1", "GASTO", 500));
    const vista = billetera.listarTransacciones() as TransaccionPuntos[];
    vista.pop();

    expect(billetera.listarTransacciones()).toHaveLength(2);
    expect(billetera.saldo).toBe(1500);
  });

  it("rechaza canjes sin saldo o sin compromisos elegibles", () => {
    const servicio = new ServicioCanjeRecompensas();
    const solicitudBase = {
      idCanje: "canje-1",
      idTransaccion: "gasto-1",
      crearIdAjuste: (_agendaId: string, bloqueId: string) =>
        `ajuste-${bloqueId}`,
      recompensa: crearRecompensa(),
      agendas: [crearAgenda("agenda-1", "bloque-1")],
      fechaObjetivo: fecha,
      fechaActual,
      fechaCanje: instante,
    };

    esperarErrorDominio("SALDO_INSUFICIENTE", () =>
      servicio.prepararCanjeDiaLibre({
        ...solicitudBase,
        billetera: crearBilletera(100),
      }),
    );
    esperarErrorDominio("DIA_LIBRE_SIN_COMPROMISOS_ELEGIBLES", () =>
      servicio.prepararCanjeDiaLibre({
        ...solicitudBase,
        billetera: crearBilletera(),
        agendas: [crearAgenda("agenda-estricta", "bloque-estricto", false)],
      }),
    );
  });

  it("rechaza identificadores de bloque repetidos entre agendas", () => {
    const servicio = new ServicioCanjeRecompensas();
    esperarErrorDominio("BLOQUES_GLOBALES_DUPLICADOS", () =>
      servicio.prepararCanjeDiaLibre({
        idCanje: "canje-1",
        idTransaccion: "gasto-1",
        crearIdAjuste: (_agendaId, bloqueId) => `ajuste-${bloqueId}`,
        recompensa: crearRecompensa(),
        billetera: crearBilletera(),
        agendas: [
          crearAgenda("agenda-1", "bloque-repetido"),
          crearAgenda("agenda-2", "bloque-repetido"),
        ],
        fechaObjetivo: fecha,
        fechaActual,
        fechaCanje: instante,
      }),
    );
  });

  it("exige una fecha futura respecto del día local del canje", () => {
    const servicio = new ServicioCanjeRecompensas();
    const solicitud = {
      idCanje: "canje-1",
      idTransaccion: "gasto-1",
      crearIdAjuste: (_agendaId: string, bloqueId: string) =>
        `ajuste-${bloqueId}`,
      recompensa: crearRecompensa(),
      billetera: crearBilletera(),
      agendas: [crearAgenda("agenda-1", "bloque-1")],
      fechaActual,
      fechaCanje: instante,
    };

    for (const fechaObjetivo of [FechaLocal.crear("2026-07-19"), fechaActual]) {
      esperarErrorDominio("DIA_LIBRE_FUERA_DE_VENTANA", () =>
        servicio.prepararCanjeDiaLibre({ ...solicitud, fechaObjetivo }),
      );
    }
  });

  it("afecta todos los flexibles personales y protege estrictos y externos", () => {
    const resultado = new ServicioCanjeRecompensas().prepararCanjeDiaLibre({
      idCanje: "canje-1",
      idTransaccion: "gasto-1",
      crearIdAjuste: (agendaId, bloqueId) => `ajuste-${agendaId}-${bloqueId}`,
      recompensa: crearRecompensa(),
      billetera: crearBilletera(),
      agendas: [
        crearAgenda("agenda-a", "bloque-a"),
        crearAgenda("agenda-b", "bloque-b"),
        crearAgenda("agenda-estricta", "bloque-estricto", false),
        crearAgenda("agenda-externa", "bloque-externo", true, "EXTERNA"),
      ],
      fechaObjetivo: fecha,
      fechaActual,
      fechaCanje: instante,
    });

    expect([...resultado.canje.listarBloquesAfectados()].sort()).toEqual([
      "bloque-a",
      "bloque-b",
    ]);
    expect(
      resultado.ajustesPorAgenda.flatMap(({ ajustes }) =>
        ajustes.map((ajuste) => ajuste.bloqueId),
      ),
    ).toHaveLength(2);
  });

  it("conserva el costo, la fecha y los bloques del canje", () => {
    const canjeadoEn = new Date(instante);
    const canje = new CanjeRecompensa({
      id: "canje-1",
      recompensaId: "dia-libre",
      puntosGastados: 1500,
      canjeadoEn,
      fechaObjetivo: fecha,
      bloquesAfectados: ["bloque-1", "bloque-2"],
    });
    canjeadoEn.setUTCFullYear(2030);
    const vista = canje.canjeadoEn;
    vista.setUTCFullYear(2031);

    expect(canje.puntosGastados).toBe(1500);
    expect(canje.canjeadoEn.toISOString()).toBe(instante.toISOString());
    expect(canje.listarBloquesAfectados()).toEqual(["bloque-1", "bloque-2"]);
  });

  it("rechaza bloques duplicados dentro de un canje", () => {
    esperarErrorDominio(
      "BLOQUES_CANJE_DUPLICADOS",
      () =>
        new CanjeRecompensa({
          id: "canje-1",
          recompensaId: "dia-libre",
          puntosGastados: 1500,
          canjeadoEn: instante,
          fechaObjetivo: fecha,
          bloquesAfectados: ["bloque-1", "bloque-1"],
        }),
    );
  });

  it("valida el costo y los textos de una recompensa", () => {
    esperarErrorDominio("COSTO_RECOMPENSA_INVALIDO", () => crearRecompensa(0));
    esperarErrorDominio(
      "NOMBRE_RECOMPENSA_VACIO",
      () =>
        new DefinicionRecompensa({
          id: "recompensa-1",
          nombre: " ",
          descripcion: "Descripción",
          costoPuntos: 10,
          tipoEfecto: "DIA_LIBRE",
        }),
    );
  });
});
