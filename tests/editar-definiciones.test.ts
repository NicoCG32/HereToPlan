import { describe, expect, it } from "vitest";
import {
  CasoDeUsoEditarActividad,
  CasoDeUsoEditarContextoPlanificacion,
  CasoDeUsoEliminarActividad,
} from "../src/aplicacion";
import {
  BloquePlanificacion,
  ContextoPlanificacion,
  FechaLocal,
  Habito,
  PoliticaCompromiso,
  Tarea,
} from "../src/dominio";
import { RepositorioActividadesEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioActividadesEnMemoria";
import { RepositorioAgendasEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioAgendasEnMemoria";
import { RepositorioBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioBloquesPlanificacionEnMemoria";
import { RepositorioContextosPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioContextosPlanificacionEnMemoria";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";

const CREADA_EN = new Date("2026-07-21T10:00:00.000Z");

describe("edición de definiciones", () => {
  it("edita una agenda nombrada conservando identidad y creación", async () => {
    const repositorio = new RepositorioContextosPlanificacionEnMemoria();
    await repositorio.guardar(
      ContextoPlanificacion.crearNombrado({
        id: "semestre",
        nombre: "Semestre inicial",
        creadaEn: CREADA_EN,
      }),
    );

    const resultado = await new CasoDeUsoEditarContextoPlanificacion(
      repositorio,
    ).ejecutar({
      contextoId: "semestre",
      nombre: "  Semestre de primavera  ",
      proposito: "  Cerrar asignaturas  ",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-12-20",
    });

    expect(resultado).toMatchObject({
      exito: true,
      contexto: {
        id: "semestre",
        nombre: "Semestre de primavera",
        proposito: "Cerrar asignaturas",
        creadaEn: CREADA_EN.toISOString(),
      },
    });
  });

  it("rechaza editar Libre, un rango inválido o un contexto ausente", async () => {
    const repositorio = new RepositorioContextosPlanificacionEnMemoria();
    await repositorio.guardar(ContextoPlanificacion.crearLibre(CREADA_EN));
    const editar = new CasoDeUsoEditarContextoPlanificacion(repositorio);

    await expect(
      editar.ejecutar({ contextoId: "contexto-libre", nombre: "Otro" }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "CONTEXTO_LIBRE_NO_ELIMINABLE" },
    });
    await expect(
      editar.ejecutar({ contextoId: "ausente", nombre: "Otro" }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "CONTEXTO_NO_ENCONTRADO" },
    });
  });

  it("edita una tarea conservando estado, subtareas, identidad y creación", async () => {
    const repositorio = new RepositorioActividadesEnMemoria();
    await repositorio.guardar(crearTarea("subtarea", "Paso"));
    await repositorio.guardar(
      new Tarea({
        id: "proyecto",
        titulo: "Proyecto inicial",
        tipo: "PROYECTO",
        tiempoNecesarioMinutos: 60,
        subtareasIds: ["subtarea"],
        creadaEn: CREADA_EN,
      }),
    );

    const resultado = await new CasoDeUsoEditarActividad(repositorio).ejecutar({
      actividadId: "proyecto",
      tipo: "PROYECTO",
      titulo: "Proyecto editado",
      descripcion: "Nueva definición",
      tiempoNecesarioMinutos: 90,
      fechaLimite: "2026-08-15",
    });

    expect(resultado).toMatchObject({
      exito: true,
      actividad: {
        id: "proyecto",
        titulo: "Proyecto editado",
        subtareasIds: ["subtarea"],
        creadaEn: CREADA_EN.toISOString(),
        estado: "PENDIENTE",
      },
    });
  });

  it("edita hábitos y rechaza cambiar entre familias", async () => {
    const repositorio = new RepositorioActividadesEnMemoria();
    await repositorio.guardar(
      new Habito({
        id: "habito",
        titulo: "Caminar",
        tiempoNecesarioMinutos: 20,
        frecuencia: "DIARIA",
        creadaEn: CREADA_EN,
      }),
    );
    const editar = new CasoDeUsoEditarActividad(repositorio);

    await expect(
      editar.ejecutar({
        actividadId: "habito",
        tipo: "HABITO",
        titulo: "Caminar al parque",
        tiempoNecesarioMinutos: 30,
        frecuencia: "PERSONALIZADA",
        diasSemana: [1, 3, 5],
      }),
    ).resolves.toMatchObject({
      exito: true,
      actividad: { frecuencia: "PERSONALIZADA", diasSemana: [1, 3, 5] },
    });
    await expect(
      editar.ejecutar({
        actividadId: "habito",
        tipo: "TAREA_SIMPLE",
        titulo: "Convertida",
        tiempoNecesarioMinutos: 30,
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "TIPO_ACTIVIDAD_NO_EDITABLE" },
    });
  });
});

describe("eliminación de actividades", () => {
  it("elimina una definición sin referencias", async () => {
    const entorno = crearEntornoEliminacion();
    await entorno.actividades.guardar(crearTarea("actividad", "Temporal"));

    await expect(entorno.eliminar.ejecutar("actividad")).resolves.toEqual({
      exito: true,
      actividadId: "actividad",
      titulo: "Temporal",
    });
    await expect(
      entorno.actividades.obtenerPorId("actividad"),
    ).resolves.toBeUndefined();
  });

  it("conserva una actividad referenciada por planificación", async () => {
    const entorno = crearEntornoEliminacion();
    await entorno.actividades.guardar(crearTarea("actividad", "Protegida"));
    await entorno.bloques.guardar(
      new BloquePlanificacion({
        id: "bloque",
        contextoId: "contexto-libre",
        actividadId: "actividad",
        titulo: "Protegida",
        fecha: FechaLocal.crear("2026-07-22"),
        minutosPlanificados: 30,
        politica: new PoliticaCompromiso({
          rigidez: "FLEXIBLE",
          autoridadPlazo: "PERSONAL",
          ajustesPermitidos: ["REPROGRAMAR"],
        }),
        creadoEn: CREADA_EN,
      }),
    );

    await expect(entorno.eliminar.ejecutar("actividad")).resolves.toMatchObject(
      {
        exito: false,
        error: { codigo: "ACTIVIDAD_EN_USO" },
      },
    );
    await expect(
      entorno.actividades.obtenerPorId("actividad"),
    ).resolves.toBeDefined();
  });
});

describe("protección del modo de seguimiento", () => {
  it("rechaza cambiarlo cuando la actividad ya posee historia planificada", async () => {
    const actividades = new RepositorioActividadesEnMemoria();
    const bloques = new RepositorioBloquesPlanificacionEnMemoria();
    await actividades.guardar(crearTarea("actividad", "Preparar entrega"));
    await bloques.guardar(
      new BloquePlanificacion({
        id: "bloque",
        contextoId: "contexto-libre",
        actividadId: "actividad",
        titulo: "Preparar entrega",
        fecha: FechaLocal.crear("2026-07-22"),
        minutosPlanificados: 30,
        politica: new PoliticaCompromiso({
          rigidez: "FLEXIBLE",
          autoridadPlazo: "PERSONAL",
        }),
        creadoEn: CREADA_EN,
      }),
    );

    const resultado = await new CasoDeUsoEditarActividad(
      actividades,
      bloques,
    ).ejecutar({
      actividadId: "actividad",
      tipo: "TAREA_SIMPLE",
      titulo: "Preparar entrega",
      tiempoNecesarioMinutos: 30,
      modoSeguimiento: "CRONOMETRADO",
    });

    expect(resultado).toMatchObject({
      exito: false,
      error: {
        codigo: "MODO_SEGUIMIENTO_CON_HISTORIA",
        campo: "modoSeguimiento",
      },
    });
    await expect(actividades.obtenerPorId("actividad")).resolves.toMatchObject({
      modoSeguimiento: "MANUAL",
    });
  });
});

function crearTarea(id: string, titulo: string): Tarea {
  return new Tarea({
    id,
    titulo,
    tipo: "TAREA_SIMPLE",
    tiempoNecesarioMinutos: 30,
    creadaEn: CREADA_EN,
  });
}

function crearEntornoEliminacion() {
  const actividades = new RepositorioActividadesEnMemoria();
  const agendas = new RepositorioAgendasEnMemoria();
  const bloques = new RepositorioBloquesPlanificacionEnMemoria();
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  return {
    actividades,
    bloques,
    eliminar: new CasoDeUsoEliminarActividad(
      actividades,
      agendas,
      bloques,
      cortes,
    ),
  };
}
