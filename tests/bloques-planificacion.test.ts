import { describe, expect, it } from "vitest";
import {
  CasoDeUsoAsignarActividad,
  CasoDeUsoEditarBloquePlanificacion,
  CasoDeUsoEliminarBloquePlanificacion,
} from "../src/aplicacion";
import {
  BloquePlanificacion,
  ContextoPlanificacion,
  CortePlanificacion,
  FechaLocal,
  PoliticaCompromiso,
  Tarea,
} from "../src/dominio";
import { RepositorioActividadesEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioActividadesEnMemoria";
import { RepositorioBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioBloquesPlanificacionEnMemoria";
import { RepositorioContextosPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioContextosPlanificacionEnMemoria";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const INSTANTE = new Date("2026-07-20T10:00:00.000Z");

describe("bloques editables de planificación", () => {
  it("conserva contexto, actividad, fecha, minutos y política efectiva", () => {
    const bloque = crearBloque();

    expect(bloque).toMatchObject({
      id: "bloque-1",
      contextoId: "contexto-libre",
      actividadId: "actividad-1",
      titulo: "Preparar informe",
      fecha: { valor: "2026-07-20" },
      minutosPlanificados: 45,
      politica: {
        versionEsquema: 1,
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: ["REPROGRAMAR"],
      },
    });
    expect(bloque.creadoEn).not.toBe(INSTANTE);
  });

  it("asigna en Libre, edita y elimina sin modificar la actividad", async () => {
    const entorno = await crearEntorno();

    const asignacion = await entorno.asignar.ejecutar({
      actividadId: "actividad-1",
      fecha: "2026-07-21",
      minutosPlanificados: 60,
      politica: {
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: ["EXCUSAR", "REPROGRAMAR"],
      },
    });

    expect(asignacion).toMatchObject({
      exito: true,
      bloque: {
        id: "bloque-asignado",
        contextoId: "contexto-libre",
        actividadId: "actividad-1",
        fecha: "2026-07-21",
      },
    });
    const edicion = await entorno.editar.ejecutar({
      bloqueId: "bloque-asignado",
      fecha: "2026-07-22",
      minutosPlanificados: 90,
      politica: { rigidez: "ESTRICTO", autoridadPlazo: "EXTERNA" },
    });
    expect(edicion).toMatchObject({
      exito: true,
      bloque: {
        fecha: "2026-07-22",
        minutosPlanificados: 90,
        politica: { rigidez: "ESTRICTO", autoridadPlazo: "EXTERNA" },
      },
    });
    await expect(
      entorno.actividades.obtenerPorId("actividad-1"),
    ).resolves.toMatchObject({ titulo: "Preparar informe" });
    await expect(entorno.eliminar.ejecutar("bloque-asignado")).resolves.toEqual(
      { exito: true, bloqueId: "bloque-asignado" },
    );
    await expect(entorno.bloques.listar()).resolves.toHaveLength(0);
  });

  it("identifica actividad, contexto, rango y bloque ausentes", async () => {
    const entorno = await crearEntorno();
    await entorno.contextos.guardar(
      ContextoPlanificacion.crearNombrado({
        id: "contexto-julio",
        nombre: "Julio",
        fechaInicio: FechaLocal.crear("2026-07-01"),
        fechaFin: FechaLocal.crear("2026-07-31"),
        creadaEn: INSTANTE,
      }),
    );

    await expect(
      entorno.asignar.ejecutar({
        actividadId: "ausente",
        fecha: "2026-07-20",
        minutosPlanificados: 30,
        politica: { rigidez: "ESTRICTO", autoridadPlazo: "PERSONAL" },
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { campo: "actividadId" },
    });
    await expect(
      entorno.asignar.ejecutar({
        actividadId: "actividad-1",
        contextoId: "ausente",
        fecha: "2026-07-20",
        minutosPlanificados: 30,
        politica: { rigidez: "ESTRICTO", autoridadPlazo: "PERSONAL" },
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { campo: "contextoId" },
    });
    await expect(
      entorno.asignar.ejecutar({
        actividadId: "actividad-1",
        contextoId: "contexto-julio",
        fecha: "2026-08-01",
        minutosPlanificados: 30,
        politica: { rigidez: "ESTRICTO", autoridadPlazo: "PERSONAL" },
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_FUERA_DE_CONTEXTO", campo: "fecha" },
    });
    await expect(
      entorno.editar.ejecutar({
        bloqueId: "ausente",
        fecha: "2026-07-20",
        minutosPlanificados: 30,
        politica: { rigidez: "ESTRICTO", autoridadPlazo: "PERSONAL" },
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { campo: "bloqueId" },
    });
    await expect(entorno.eliminar.ejecutar("ausente")).resolves.toMatchObject({
      exito: false,
      error: { campo: "bloqueId" },
    });
  });

  it("impide editar o quitar un bloque incorporado a un corte asignado", async () => {
    const entorno = await crearEntorno();
    const bloque = crearBloque();
    await entorno.bloques.guardar(bloque);
    const corte = CortePlanificacion.crear({
      id: "corte-protegido",
      bloques: [bloque],
      creadoEn: INSTANTE,
    });
    corte.iniciarRevision();
    corte.asignar(INSTANTE);
    await entorno.cortes.guardar(corte);

    await expect(
      entorno.editar.ejecutar({
        bloqueId: bloque.id,
        fecha: "2026-07-21",
        minutosPlanificados: 60,
        politica: { rigidez: "ESTRICTO", autoridadPlazo: "EXTERNA" },
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_PROTEGIDO_POR_CORTE" },
    });
    await expect(entorno.eliminar.ejecutar(bloque.id)).resolves.toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_PROTEGIDO_POR_CORTE" },
    });
    await expect(entorno.bloques.obtenerPorId(bloque.id)).resolves.toBeTruthy();
  });
});

function crearBloque(): BloquePlanificacion {
  return new BloquePlanificacion({
    id: "bloque-1",
    contextoId: "contexto-libre",
    actividadId: "actividad-1",
    titulo: "Preparar informe",
    fecha: FechaLocal.crear("2026-07-20"),
    minutosPlanificados: 45,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["REPROGRAMAR"],
    }),
    creadoEn: INSTANTE,
  });
}

async function crearEntorno() {
  const bloques = new RepositorioBloquesPlanificacionEnMemoria();
  const actividades = new RepositorioActividadesEnMemoria();
  const contextos = new RepositorioContextosPlanificacionEnMemoria();
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  await contextos.guardar(ContextoPlanificacion.crearLibre(INSTANTE));
  await actividades.guardar(
    new Tarea({
      id: "actividad-1",
      titulo: "Preparar informe",
      tipo: "TAREA_SIMPLE",
      tiempoNecesarioMinutos: 120,
      creadaEn: INSTANTE,
    }),
  );
  return {
    bloques,
    actividades,
    contextos,
    cortes,
    asignar: new CasoDeUsoAsignarActividad(
      bloques,
      actividades,
      contextos,
      new RelojFijo(INSTANTE),
      new GeneradorIdentificadoresPredefinidos([
        "bloque-asignado",
        "bloque-segundo",
      ]),
    ),
    editar: new CasoDeUsoEditarBloquePlanificacion(bloques, contextos, cortes),
    eliminar: new CasoDeUsoEliminarBloquePlanificacion(bloques, cortes),
  };
}
