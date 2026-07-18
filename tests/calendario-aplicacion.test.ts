import { describe, expect, it } from "vitest";
import {
  calcularRangoVisible,
  CasoDeUsoConsultarCalendario,
  ErrorConsultaCalendario,
  type CalendarioLocal,
} from "../src/aplicacion";
import {
  Agenda,
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

const CREADA_EN = new Date("2026-07-18T10:00:00.000Z");

describe("consulta del calendario general", () => {
  it("proyecta Todas, el rango mensual y los siete días desde hoy", async () => {
    const casoDeUso = await prepararCalendario();

    const calendario = await casoDeUso.ejecutar({
      seleccion: { tipo: "TODAS" },
      vistaTemporal: "MES",
      fechaAncla: "2026-07-15",
      diaSeleccionado: "2026-07-21",
    });

    expect(calendario.seleccion).toEqual({
      tipo: "TODAS",
      nombre: "Todas",
    });
    expect(calendario.rangoVisible).toEqual({
      fechaInicio: "2026-07-01",
      fechaFin: "2026-07-31",
    });
    expect(calendario.diaSeleccionado).toBe("2026-07-21");
    expect(calendario.contextos[0]).toMatchObject({
      id: "contexto-libre",
      tipo: "LIBRE",
    });
    expect(calendario.actividadesAsignables.map(({ id }) => id)).toEqual([
      "actividad-habito",
      "actividad-tarea",
    ]);
    expect(calendario.bloquesVisibles).toHaveLength(2);
    expect(calendario.bloquesVisibles[0]).toMatchObject({
      id: "bloque-semestre",
      actividadId: "actividad-tarea",
      fecha: "2026-07-21",
      estado: "PENDIENTE",
      origen: {
        contextoId: "contexto-semestre",
        nombreContexto: "Semestre académico",
        tipoContexto: "NOMBRADO",
      },
    });
    expect(calendario.listaEquivalente).toBe(calendario.bloquesVisibles);
    expect(calendario.resumenSeleccion).toEqual({
      cantidadBloques: 3,
      minutosPlanificados: 165,
    });
    expect(calendario.proximosSieteDias.map(({ fecha }) => fecha)).toEqual([
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
    ]);
    expect(calendario.proximosSieteDias[0]).toMatchObject({
      fecha: "2026-07-20",
      esHoy: true,
      bloques: [],
      minutosPlanificados: 0,
    });
    expect(calendario.proximosSieteDias[1]).toMatchObject({
      fecha: "2026-07-21",
      esHoy: false,
      minutosPlanificados: 60,
    });
    expect(calendario.proximosSieteDias[6]).toMatchObject({
      fecha: "2026-07-26",
      minutosPlanificados: 45,
    });
    expect(Object.isFrozen(calendario)).toBe(true);
    expect(Object.isFrozen(calendario.bloquesVisibles[0]?.origen)).toBe(true);
    expect(
      Object.isFrozen(
        calendario.bloquesVisibles[0]?.politica.ajustesPermitidos,
      ),
    ).toBe(true);
  });

  it("filtra por contexto sin mezclar bloques y mantiene Libre disponible", async () => {
    const casoDeUso = await prepararCalendario();

    const semestre = await casoDeUso.ejecutar({
      seleccion: {
        tipo: "CONTEXTO",
        contextoId: "contexto-semestre",
      },
      vistaTemporal: "MES",
      fechaAncla: "2026-07-15",
    });
    const libre = await casoDeUso.ejecutar({
      seleccion: { tipo: "CONTEXTO", contextoId: "contexto-libre" },
      vistaTemporal: "SEMANA",
      fechaAncla: "2026-07-23",
    });

    expect(semestre.seleccion).toEqual({
      tipo: "CONTEXTO",
      contextoId: "contexto-semestre",
      nombre: "Semestre académico",
      tipoContexto: "NOMBRADO",
    });
    expect(semestre.resumenSeleccion).toEqual({
      cantidadBloques: 1,
      minutosPlanificados: 60,
    });
    expect(semestre.bloquesVisibles.map(({ id }) => id)).toEqual([
      "bloque-semestre",
    ]);
    expect(libre.seleccion).toMatchObject({
      contextoId: "contexto-libre",
      tipoContexto: "LIBRE",
    });
    expect(libre.bloquesVisibles).toEqual([]);
    expect(
      libre.proximosSieteDias.every((dia) => dia.bloques.length === 0),
    ).toBe(true);
  });

  it("deriva rangos coherentes para día, semana y mes", () => {
    expect(calcularRangoVisible("DIA", FechaLocal.crear("2026-07-23"))).toEqual(
      {
        fechaInicio: "2026-07-23",
        fechaFin: "2026-07-23",
      },
    );
    expect(
      calcularRangoVisible("SEMANA", FechaLocal.crear("2026-07-23")),
    ).toEqual({
      fechaInicio: "2026-07-20",
      fechaFin: "2026-07-26",
    });
    expect(calcularRangoVisible("MES", FechaLocal.crear("2028-02-10"))).toEqual(
      {
        fechaInicio: "2028-02-01",
        fechaFin: "2028-02-29",
      },
    );
  });

  it("integra bloques editables y separa actividades sin programar", async () => {
    const contextos = new RepositorioContextosPlanificacionEnMemoria();
    const actividades = new RepositorioActividadesEnMemoria();
    const agendas = new RepositorioAgendasEnMemoria();
    const bloques = new RepositorioBloquesPlanificacionEnMemoria();
    await contextos.guardar(ContextoPlanificacion.crearLibre(CREADA_EN));
    await actividades.guardar(
      new Tarea({
        id: "actividad-programada",
        titulo: "Programada",
        tipo: "TAREA_SIMPLE",
        tiempoNecesarioMinutos: 30,
        creadaEn: CREADA_EN,
      }),
    );
    await actividades.guardar(
      new Tarea({
        id: "actividad-libre",
        titulo: "Sin programar",
        tipo: "PROYECTO",
        tiempoNecesarioMinutos: 120,
        creadaEn: CREADA_EN,
      }),
    );
    await bloques.guardar(
      new BloquePlanificacion({
        id: "bloque-editable",
        contextoId: "contexto-libre",
        actividadId: "actividad-programada",
        titulo: "Programada",
        fecha: FechaLocal.crear("2026-07-20"),
        minutosPlanificados: 30,
        politica: new PoliticaCompromiso({
          rigidez: "ESTRICTO",
          autoridadPlazo: "PERSONAL",
        }),
        creadoEn: CREADA_EN,
      }),
    );
    const casoDeUso = new CasoDeUsoConsultarCalendario(
      contextos,
      actividades,
      agendas,
      bloques,
      new CalendarioLocalFijo("2026-07-20"),
    );

    const calendario = await casoDeUso.ejecutar({
      seleccion: { tipo: "TODAS" },
      vistaTemporal: "DIA",
      fechaAncla: "2026-07-20",
    });

    expect(calendario.bloquesVisibles).toMatchObject([
      {
        id: "bloque-editable",
        editable: true,
        origen: { contextoId: "contexto-libre", nombreContexto: "Libre" },
      },
    ]);
    expect(calendario.proximosSieteDias[0]?.bloques).toHaveLength(1);
    expect(calendario.listaEquivalente).toBe(calendario.bloquesVisibles);
    expect(calendario.actividadesSinProgramar.map(({ id }) => id)).toEqual([
      "actividad-libre",
    ]);
  });

  it("rechaza una selección inexistente", async () => {
    const casoDeUso = await prepararCalendario();

    await expect(
      casoDeUso.ejecutar({
        seleccion: { tipo: "CONTEXTO", contextoId: "contexto-ausente" },
        vistaTemporal: "DIA",
        fechaAncla: "2026-07-20",
      }),
    ).rejects.toMatchObject({
      name: "ErrorConsultaCalendario",
      codigo: "CONTEXTO_SELECCIONADO_NO_ENCONTRADO",
    } satisfies Partial<ErrorConsultaCalendario>);
  });

  it("rechaza una agenda cuyo contexto no fue migrado", async () => {
    const contextos = new RepositorioContextosPlanificacionEnMemoria();
    const actividades = new RepositorioActividadesEnMemoria();
    const agendas = new RepositorioAgendasEnMemoria();
    await contextos.guardar(ContextoPlanificacion.crearLibre(CREADA_EN));
    await agendas.guardar(crearAgenda("agenda-sin-contexto", "Inconsistente"));
    const casoDeUso = new CasoDeUsoConsultarCalendario(
      contextos,
      actividades,
      agendas,
      new RepositorioBloquesPlanificacionEnMemoria(),
      new CalendarioLocalFijo("2026-07-20"),
    );

    await expect(
      casoDeUso.ejecutar({
        seleccion: { tipo: "TODAS" },
        vistaTemporal: "MES",
        fechaAncla: "2026-07-20",
      }),
    ).rejects.toMatchObject({
      name: "ErrorConsultaCalendario",
      codigo: "CONTEXTO_DE_AGENDA_NO_ENCONTRADO",
    } satisfies Partial<ErrorConsultaCalendario>);
  });
});

class CalendarioLocalFijo implements CalendarioLocal {
  constructor(private readonly fecha: string) {}

  public hoy(): FechaLocal {
    return FechaLocal.crear(this.fecha);
  }
}

async function prepararCalendario(): Promise<CasoDeUsoConsultarCalendario> {
  const contextos = new RepositorioContextosPlanificacionEnMemoria();
  const actividades = new RepositorioActividadesEnMemoria();
  const agendas = new RepositorioAgendasEnMemoria();
  await contextos.guardar(ContextoPlanificacion.crearLibre(CREADA_EN));
  await contextos.guardar(
    ContextoPlanificacion.crearNombrado({
      id: "contexto-semestre",
      nombre: "Semestre académico",
      fechaInicio: FechaLocal.crear("2026-07-01"),
      fechaFin: FechaLocal.crear("2026-12-20"),
      creadaEn: CREADA_EN,
    }),
  );
  await contextos.guardar(
    ContextoPlanificacion.crearNombrado({
      id: "contexto-proyecto",
      nombre: "Proyecto editorial",
      fechaInicio: FechaLocal.crear("2026-07-01"),
      fechaFin: FechaLocal.crear("2026-08-31"),
      creadaEn: CREADA_EN,
    }),
  );
  await actividades.guardar(
    new Tarea({
      id: "actividad-tarea",
      titulo: "Preparar informe",
      tipo: "TAREA_SIMPLE",
      tiempoNecesarioMinutos: 120,
      creadaEn: CREADA_EN,
    }),
  );
  await actividades.guardar(
    new Habito({
      id: "actividad-habito",
      titulo: "Revisar avances",
      tiempoNecesarioMinutos: 30,
      frecuencia: "DIARIA",
      creadaEn: CREADA_EN,
    }),
  );

  const semestre = crearAgenda("contexto-semestre", "Semestre académico");
  agregarBloque(
    semestre,
    "bloque-semestre",
    "actividad-tarea",
    "2026-07-21",
    60,
    "FLEXIBLE",
  );
  await agendas.guardar(semestre);

  const proyecto = crearAgenda("contexto-proyecto", "Proyecto editorial");
  agregarBloque(
    proyecto,
    "bloque-proyecto-semana",
    "actividad-habito",
    "2026-07-26",
    45,
    "ESTRICTO",
  );
  agregarBloque(
    proyecto,
    "bloque-proyecto-agosto",
    "actividad-tarea",
    "2026-08-03",
    60,
    "FLEXIBLE",
  );
  await agendas.guardar(proyecto);

  return new CasoDeUsoConsultarCalendario(
    contextos,
    actividades,
    agendas,
    new RepositorioBloquesPlanificacionEnMemoria(),
    new CalendarioLocalFijo("2026-07-20"),
  );
}

function crearAgenda(id: string, nombre: string): Agenda {
  return new Agenda({
    id,
    nombre,
    fechaInicio: FechaLocal.crear("2026-07-01"),
    fechaFin: FechaLocal.crear("2026-08-31"),
    creadaEn: CREADA_EN,
  });
}

function agregarBloque(
  agenda: Agenda,
  id: string,
  actividadId: string,
  fecha: string,
  minutosPlanificados: number,
  rigidez: "ESTRICTO" | "FLEXIBLE",
): void {
  agenda.agregarBloque({
    id,
    actividadId,
    titulo: `Actividad ${actividadId}`,
    fecha: FechaLocal.crear(fecha),
    minutosPlanificados,
    politica: new PoliticaCompromiso({
      rigidez,
      autoridadPlazo: "PERSONAL",
      ...(rigidez === "FLEXIBLE" ? { ajustesPermitidos: ["EXCUSAR"] } : {}),
    }),
  });
}
