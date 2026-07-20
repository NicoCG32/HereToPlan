import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  CasoDeUsoCanjearDiaLibre,
  CasoDeUsoConsultarCalendario,
  CasoDeUsoListarCanjesDiaLibre,
  CasoDeUsoPrepararCanjeDiaLibre,
  type CalendarioLocal,
} from "../src/aplicacion";
import {
  BilleteraPuntos,
  BloquePlanificacion,
  ContextoPlanificacion,
  CortePlanificacion,
  DefinicionRecompensa,
  FechaLocal,
  PoliticaCompromiso,
  ServicioDiaLibrePlanificacion,
  TransaccionPuntos,
} from "../src/dominio";
import { RepositorioContextosPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioContextosPlanificacionEnMemoria";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import { RepositorioActividadesEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioActividadesEnMemoria";
import { RepositorioAgendasEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioAgendasEnMemoria";
import { RepositorioBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioBloquesPlanificacionEnMemoria";
import { RepositorioResolucionesBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioResolucionesBloquesPlanificacionEnMemoria";
import { UnidadTrabajoCanjeDiaLibreEnMemoria } from "../src/infraestructura/persistencia/memoria/UnidadTrabajoCanjeDiaLibreEnMemoria";
import { RepositorioTransaccionesPuntosIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioTransaccionesPuntosIndexedDB";
import { UnidadTrabajoCanjeDiaLibreIndexedDB } from "../src/infraestructura/persistencia/indexeddb/UnidadTrabajoCanjeDiaLibreIndexedDB";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const fechaActual = FechaLocal.crear("2026-07-20");
const fechaObjetivo = FechaLocal.crear("2026-07-21");
const instante = new Date("2026-07-20T10:00:00.000Z");

describe("canje de día libre", () => {
  it("previsualiza costo, saldo y motivos de protección", async () => {
    const entorno = await crearEntorno();
    const vista = await entorno.preparar.ejecutar(fechaObjetivo.toString());

    expect(vista).toMatchObject({
      costoPuntos: 3,
      saldoActual: 5,
      saldoPosterior: 2,
      saldoSuficiente: true,
      puedeCanjear: true,
    });
    expect(vista.afectados.map((bloque) => bloque.id)).toEqual([
      "bloque-flexible",
    ]);
    expect(vista.protegidos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "bloque-estricto",
          motivo: "COMPROMISO_ESTRICTO",
        }),
        expect.objectContaining({
          id: "bloque-externo",
          motivo: "AUTORIDAD_EXTERNA",
        }),
      ]),
    );
  });

  it("confirma una vez y enlaza canje, contexto, ajuste y movimiento", async () => {
    const entorno = await crearEntorno();
    const comando = {
      operacionId: "canje-1",
      fechaObjetivo: fechaObjetivo.toString(),
    };

    const primero = await entorno.canjear.ejecutar(comando);
    const reintento = await entorno.canjear.ejecutar(comando);

    expect(primero).toMatchObject({
      id: "canje-1",
      puntosGastados: 3,
      movimientoId: "gasto-1",
      reintentoIdempotente: false,
      contextosAfectados: [{ id: "contexto-1", nombre: "Proyecto" }],
    });
    expect(reintento).toMatchObject({
      id: "canje-1",
      movimientoId: "gasto-1",
      reintentoIdempotente: true,
    });
    await expect(entorno.unidad.listarCanjes()).resolves.toHaveLength(1);
    await expect(entorno.unidad.listarAjustes()).resolves.toMatchObject([
      { bloqueId: "bloque-flexible", canjeRecompensaId: "canje-1" },
    ]);
    expect(
      BilleteraPuntos.rehidratar(await entorno.unidad.listar()).saldo,
    ).toBe(2);
    await expect(entorno.listar.ejecutar()).resolves.toMatchObject([
      { id: "canje-1", movimientoId: "gasto-1" },
    ]);
    const calendario = await entorno.consultarCalendario.ejecutar({
      seleccion: { tipo: "TODAS" },
      vistaTemporal: "DIA",
      fechaAncla: fechaObjetivo.toString(),
    });
    expect(
      calendario.bloquesVisibles.find(
        (bloque) => bloque.id === "bloque-flexible",
      ),
    ).toMatchObject({
      estado: "EXCUSADO",
      historial: [
        {
          tipo: "AJUSTE",
          resultado: "EXCUSADO",
          canjeRecompensaId: "canje-1",
        },
      ],
    });
  });

  it("serializa gastos concurrentes y revierte íntegramente al perdedor", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const configuracion = {
      fabricaIndexedDB,
      nombreBaseDatos: "canje-atomico",
    };
    const transacciones = new RepositorioTransaccionesPuntosIndexedDB(
      configuracion,
    );
    await transacciones.guardar(crearIngreso("ingreso-1", 3));
    const servicio = new ServicioDiaLibrePlanificacion();
    const billetera = BilleteraPuntos.rehidratar(await transacciones.listar());
    const primero = servicio.preparar({
      idCanje: "canje-a",
      idTransaccion: "gasto-a",
      crearIdAjuste: () => "ajuste-a",
      recompensa: crearRecompensa(),
      billetera,
      bloques: [crearBloqueEvaluable("bloque-a")],
      fechaObjetivo,
      fechaActual,
      fechaCanje: instante,
    });
    const segundo = servicio.preparar({
      idCanje: "canje-b",
      idTransaccion: "gasto-b",
      crearIdAjuste: () => "ajuste-b",
      recompensa: crearRecompensa(),
      billetera,
      bloques: [crearBloqueEvaluable("bloque-b")],
      fechaObjetivo,
      fechaActual,
      fechaCanje: instante,
    });
    const unidadA = new UnidadTrabajoCanjeDiaLibreIndexedDB(configuracion);
    const unidadB = new UnidadTrabajoCanjeDiaLibreIndexedDB(configuracion);

    const resultados = await Promise.allSettled([
      unidadA.confirmar(primero.canje, primero.gasto, primero.ajustes),
      unidadB.confirmar(segundo.canje, segundo.gasto, segundo.ajustes),
    ]);

    expect(
      resultados.filter(({ status }) => status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      resultados.filter(({ status }) => status === "rejected"),
    ).toHaveLength(1);
    expect(await unidadA.listarCanjes()).toHaveLength(1);
    expect(await unidadA.listarAjustes()).toHaveLength(1);
    expect(BilleteraPuntos.rehidratar(await transacciones.listar()).saldo).toBe(
      0,
    );
    await Promise.all([
      unidadA.cerrar(),
      unidadB.cerrar(),
      transacciones.cerrar(),
    ]);
  });
});

async function crearEntorno() {
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  const resoluciones =
    new RepositorioResolucionesBloquesPlanificacionEnMemoria();
  const contextos = new RepositorioContextosPlanificacionEnMemoria();
  const actividades = new RepositorioActividadesEnMemoria();
  const agendas = new RepositorioAgendasEnMemoria();
  const bloques = new RepositorioBloquesPlanificacionEnMemoria();
  const unidad = new UnidadTrabajoCanjeDiaLibreEnMemoria(resoluciones);
  await contextos.guardar(
    ContextoPlanificacion.crearNombrado({
      id: "contexto-1",
      nombre: "Proyecto",
      creadaEn: instante,
    }),
  );
  const bloquesConfirmados = [
    crearBloque("bloque-flexible", "Foco", "FLEXIBLE", "PERSONAL"),
    crearBloque("bloque-estricto", "Entrega", "ESTRICTO", "PERSONAL"),
    crearBloque("bloque-externo", "Reunión", "FLEXIBLE", "EXTERNA"),
  ];
  for (const bloque of bloquesConfirmados) await bloques.guardar(bloque);
  const corte = CortePlanificacion.crear({
    id: "corte-1",
    creadoEn: instante,
    bloques: bloquesConfirmados,
  });
  corte.iniciarRevision();
  corte.asignar(instante);
  corte.actualizarSegunReloj(new Date("2026-07-20T10:10:00.000Z"));
  await cortes.guardar(corte);
  await unidad.guardar(crearIngreso("ingreso-1", 5));
  const dependenciasLectura = {
    repositorioCortes: cortes,
    repositorioResoluciones: resoluciones,
    repositorioTransacciones: unidad,
    repositorioAjustes: unidad,
    repositorioContextos: contextos,
    calendarioLocal: crearCalendarioLocal(),
    recompensa: crearRecompensa(),
  };
  return {
    unidad,
    preparar: new CasoDeUsoPrepararCanjeDiaLibre(dependenciasLectura),
    canjear: new CasoDeUsoCanjearDiaLibre({
      ...dependenciasLectura,
      repositorioCanjes: unidad,
      unidadTrabajo: unidad,
      reloj: new RelojFijo(instante),
      generadorIdentificadores: new GeneradorIdentificadoresPredefinidos([
        "gasto-1",
        "ajuste-1",
      ]),
    }),
    listar: new CasoDeUsoListarCanjesDiaLibre({
      ...dependenciasLectura,
      repositorioCanjes: unidad,
    }),
    consultarCalendario: new CasoDeUsoConsultarCalendario(
      contextos,
      actividades,
      agendas,
      bloques,
      cortes,
      resoluciones,
      crearCalendarioLocal(),
      unidad,
    ),
  };
}

function crearBloque(
  id: string,
  titulo: string,
  rigidez: "ESTRICTO" | "FLEXIBLE",
  autoridadPlazo: "PERSONAL" | "EXTERNA",
): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-1",
    actividadId: `actividad-${id}`,
    titulo,
    fecha: fechaObjetivo,
    minutosPlanificados: 60,
    politica: new PoliticaCompromiso({
      rigidez,
      autoridadPlazo,
      ajustesPermitidos: rigidez === "FLEXIBLE" ? ["EXCUSAR"] : [],
    }),
    creadoEn: instante,
  });
}

function crearBloqueEvaluable(id: string) {
  return {
    id,
    fecha: fechaObjetivo,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["EXCUSAR"],
    }).obtenerVista(),
    estado: "PENDIENTE" as const,
  };
}

function crearRecompensa(): DefinicionRecompensa {
  return new DefinicionRecompensa({
    id: "dia-libre",
    nombre: "Día libre",
    descripcion: "Excusa los compromisos flexibles personales de una fecha.",
    costoPuntos: 3,
    tipoEfecto: "DIA_LIBRE",
  });
}

function crearIngreso(id: string, cantidad: number): TransaccionPuntos {
  return new TransaccionPuntos({
    id,
    tipo: "INGRESO",
    cantidad,
    fuenteTipo: "COMPROMISO_COMPLETADO",
    fuenteId: `bloque-${id}`,
    descripcion: "Ingreso de prueba",
    ocurridaEn: new Date("2026-07-19T10:00:00.000Z"),
  });
}

function crearCalendarioLocal(): CalendarioLocal {
  return { hoy: () => FechaLocal.crear(fechaActual.toString()) };
}
