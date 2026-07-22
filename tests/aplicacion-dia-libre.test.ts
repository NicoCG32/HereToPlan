import { describe, expect, it } from "vitest";
import {
  CasoDeUsoAdquirirRecompensa,
  CasoDeUsoAplicarDiaLibre,
  CasoDeUsoInicializarContextosPlanificacion,
  CasoDeUsoPrepararAplicacionDiaLibre,
  type CalendarioLocal,
} from "../src/aplicacion";
import {
  BloquePlanificacion,
  CortePlanificacion,
  FechaLocal,
  PoliticaCompromiso,
  RecompensaDefinida,
  ResolucionBloquePlanificacion,
  TransaccionPuntos,
} from "../src/dominio";
import { RepositorioContextosPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioContextosPlanificacionEnMemoria";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import { RepositorioResolucionesBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioResolucionesBloquesPlanificacionEnMemoria";
import { UnidadTrabajoAdquisicionRecompensaEnMemoria } from "../src/infraestructura/persistencia/memoria/UnidadTrabajoAdquisicionRecompensaEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const ahora = new Date("2026-07-20T10:00:00.000Z");

describe("aplicación de una unidad Día libre", () => {
  it("prepara afectados y protegidos sin consumir la unidad ni escribir ajustes", async () => {
    const entorno = await crearEntorno();

    const vista = await entorno.preparar.ejecutar({
      recompensaAdquiridaId: "unidad-1",
      fechaObjetivo: "2026-07-22",
    });

    expect(vista).toMatchObject({
      unidad: { id: "unidad-1", nombre: "Día libre" },
      puedeAplicar: true,
      afectados: [{ id: "bloque-flexible", contextoNombre: "Libre" }],
      protegidos: [{ id: "bloque-estricto", motivo: "COMPROMISO_ESTRICTO" }],
    });
    await expect(
      entorno.inventario.obtenerAdquiridaPorId("unidad-1"),
    ).resolves.toMatchObject({ estado: "DISPONIBLE" });
    await expect(entorno.inventario.listarAplicaciones()).resolves.toHaveLength(
      0,
    );
    await expect(entorno.inventario.listarAjustes()).resolves.toHaveLength(0);
  });

  it("confirma consumo, aplicación y ajustes una sola vez", async () => {
    const entorno = await crearEntorno();

    const primera = await entorno.aplicar.ejecutar({
      operacionId: "aplicacion-1",
      recompensaAdquiridaId: "unidad-1",
      fechaObjetivo: "2026-07-22",
    });
    const reintento = await entorno.aplicar.ejecutar({
      operacionId: "aplicacion-1",
      recompensaAdquiridaId: "unidad-1",
      fechaObjetivo: "2026-07-22",
    });

    expect(primera).toMatchObject({
      id: "aplicacion-1",
      recompensaAdquiridaId: "unidad-1",
      fechaObjetivo: "2026-07-22",
      bloquesAfectados: [{ id: "bloque-flexible" }],
      contextosAfectados: [{ id: "contexto-libre", nombre: "Libre" }],
      reintentoIdempotente: false,
    });
    expect(reintento.reintentoIdempotente).toBe(true);
    await expect(
      entorno.inventario.obtenerAdquiridaPorId("unidad-1"),
    ).resolves.toMatchObject({
      estado: "CONSUMIDA",
      aplicacionId: "aplicacion-1",
    });
    await expect(entorno.inventario.listarAplicaciones()).resolves.toHaveLength(
      1,
    );
    await expect(entorno.inventario.listarAjustes()).resolves.toMatchObject([
      {
        bloqueId: "bloque-flexible",
        canjeRecompensaId: "aplicacion-1",
        tipo: "EXCUSAR",
      },
    ]);
  });

  it("conserva la unidad si un bloque se resuelve antes de la escritura", async () => {
    const entorno = await crearEntorno();
    await entorno.resoluciones.guardar(
      new ResolucionBloquePlanificacion({
        bloqueId: "bloque-flexible",
        operacionId: "resolucion-concurrente",
        resultado: "COMPLETADO",
        resueltoEn: ahora,
      }),
    );

    await expect(
      entorno.aplicar.ejecutar({
        operacionId: "aplicacion-conflictiva",
        recompensaAdquiridaId: "unidad-1",
        fechaObjetivo: "2026-07-22",
      }),
    ).rejects.toMatchObject({ codigo: "DIA_LIBRE_SIN_COMPROMISOS_ELEGIBLES" });
    await expect(
      entorno.inventario.obtenerAdquiridaPorId("unidad-1"),
    ).resolves.toMatchObject({ estado: "DISPONIBLE" });
    await expect(entorno.inventario.listarAplicaciones()).resolves.toHaveLength(
      0,
    );
    await expect(entorno.inventario.listarAjustes()).resolves.toHaveLength(0);
  });
});

async function crearEntorno() {
  const contextos = new RepositorioContextosPlanificacionEnMemoria();
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  const resoluciones =
    new RepositorioResolucionesBloquesPlanificacionEnMemoria();
  const inventario = new UnidadTrabajoAdquisicionRecompensaEnMemoria(
    resoluciones,
  );
  const reloj = new RelojFijo(ahora);
  const definiciones = [crearDefinicion()];
  await new CasoDeUsoInicializarContextosPlanificacion(
    contextos,
    reloj,
  ).ejecutar();
  await inventario.guardar(
    new TransaccionPuntos({
      id: "ingreso-1",
      tipo: "INGRESO",
      cantidad: 3,
      fuenteTipo: "COMPROMISO_COMPLETADO",
      fuenteId: "bloque-previo",
      descripcion: "Ingreso previo",
      ocurridaEn: new Date("2026-07-19T10:00:00.000Z"),
    }),
  );
  await new CasoDeUsoAdquirirRecompensa({
    definiciones,
    repositorioInventario: inventario,
    repositorioTransacciones: inventario,
    unidadTrabajo: inventario,
    reloj,
    generadorIdentificadores: new GeneradorIdentificadoresPredefinidos([
      "movimiento-adquisicion",
    ]),
  }).ejecutar({ operacionId: "unidad-1", recompensaId: "dia-libre" });
  await cortes.guardar(crearCorteConfirmado());
  const dependencias = {
    definiciones,
    repositorioInventario: inventario,
    repositorioCortes: cortes,
    repositorioResoluciones: resoluciones,
    repositorioAjustes: inventario,
    repositorioContextos: contextos,
    calendarioLocal: new CalendarioLocalFijo("2026-07-20"),
  };
  return {
    inventario,
    resoluciones,
    preparar: new CasoDeUsoPrepararAplicacionDiaLibre(dependencias),
    aplicar: new CasoDeUsoAplicarDiaLibre({
      ...dependencias,
      unidadTrabajo: inventario,
      reloj,
      generadorIdentificadores: new GeneradorIdentificadoresPredefinidos([
        "ajuste-1",
        "ajuste-2",
      ]),
    }),
  };
}

function crearCorteConfirmado(): CortePlanificacion {
  const bloques = [
    crearBloque("bloque-flexible", "Trabajo flexible", "FLEXIBLE"),
    crearBloque("bloque-estricto", "Trabajo estricto", "ESTRICTO"),
  ];
  const corte = CortePlanificacion.crear({
    id: "corte-1",
    bloques,
    creadoEn: new Date("2026-07-19T08:00:00.000Z"),
  });
  corte.iniciarRevision();
  corte.asignar(new Date("2026-07-19T08:00:00.000Z"));
  corte.actualizarSegunReloj(new Date("2026-07-19T08:10:00.000Z"));
  return corte;
}

function crearBloque(
  id: string,
  titulo: string,
  rigidez: "FLEXIBLE" | "ESTRICTO",
): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-libre",
    actividadId: `actividad-${id}`,
    titulo,
    fecha: FechaLocal.crear("2026-07-22"),
    minutosPlanificados: 30,
    politica: new PoliticaCompromiso({
      rigidez,
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: rigidez === "FLEXIBLE" ? ["EXCUSAR"] : [],
    }),
    creadoEn: new Date("2026-07-19T08:00:00.000Z"),
  });
}

function crearDefinicion(): RecompensaDefinida {
  return new RecompensaDefinida({
    id: "dia-libre",
    nombre: "Día libre",
    descripcion: "Excusa compromisos elegibles.",
    costoPuntos: 3,
    tipoEfecto: "DIA_LIBRE",
  });
}

class CalendarioLocalFijo implements CalendarioLocal {
  constructor(private readonly fecha: string) {}

  public hoy(): FechaLocal {
    return FechaLocal.crear(this.fecha);
  }
}
