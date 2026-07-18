import { describe, expect, it } from "vitest";
import {
  CasoDeUsoConsultarImpactoEliminacionContexto,
  CasoDeUsoEliminarContextoPlanificacion,
  type RepositorioContextosPlanificacion,
} from "../src/aplicacion";
import {
  Agenda,
  BloquePlanificacion,
  ContextoPlanificacion,
  FechaLocal,
  IDENTIFICADOR_CONTEXTO_LIBRE,
  PoliticaCompromiso,
} from "../src/dominio";
import { RepositorioAgendasEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioAgendasEnMemoria";
import { RepositorioBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioBloquesPlanificacionEnMemoria";
import { RepositorioContextosPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioContextosPlanificacionEnMemoria";
import { TransaccionEliminacionContextoPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/TransaccionEliminacionContextoPlanificacionEnMemoria";

const INSTANTE = new Date("2026-07-18T12:00:00.000Z");
const CONTEXTO_ID = "contexto-semestre";

describe("eliminación segura de contextos de planificación", () => {
  it("calcula el impacto distinguiendo bloques editables e historial confirmado", async () => {
    const entorno = await crearEntorno();

    const resultado = await entorno.consultar.ejecutar(CONTEXTO_ID);

    expect(resultado.exito).toBe(true);
    if (!resultado.exito) return;
    expect(resultado.impacto).toMatchObject({
      contextoId: CONTEXTO_ID,
      nombre: "Semestre académico",
      proposito: "Coordinar estudio y docencia",
      fechaInicio: "2026-07-01",
      fechaFin: "2026-12-20",
      cantidadActividades: 3,
      cantidadBloquesEditables: 2,
      cantidadRegistrosConfirmados: 1,
    });
    expect(typeof resultado.impacto.huella).toBe("string");
  });

  it("traslada los borradores a Libre y conserva el historial confirmado", async () => {
    const entorno = await crearEntorno();
    const impacto = await obtenerImpacto(entorno);

    const resultado = await entorno.eliminar.ejecutar({
      contextoId: CONTEXTO_ID,
      estrategia: "TRASLADAR_A_LIBRE",
      huellaImpacto: impacto.huella,
    });

    expect(resultado).toMatchObject({
      exito: true,
      resultado: {
        cantidadBloquesTrasladados: 2,
        cantidadBloquesEliminados: 0,
        cantidadRegistrosConfirmadosConservados: 1,
      },
    });
    await expect(
      entorno.contextos.obtenerPorId(CONTEXTO_ID),
    ).resolves.toBeUndefined();
    await expect(entorno.bloques.listar()).resolves.toSatisfy(
      (bloques: readonly BloquePlanificacion[]) =>
        bloques.every(
          (bloque) => bloque.contextoId === IDENTIFICADOR_CONTEXTO_LIBRE,
        ),
    );
    await expect(
      entorno.agendas.obtenerPorId(CONTEXTO_ID),
    ).resolves.toMatchObject({
      estado: "CONFIRMADA",
    });
  });

  it("exige confirmación reforzada antes de eliminar los borradores", async () => {
    const entorno = await crearEntorno();
    const impacto = await obtenerImpacto(entorno);

    await expect(
      entorno.eliminar.ejecutar({
        contextoId: CONTEXTO_ID,
        estrategia: "ELIMINAR_BORRADORES",
        huellaImpacto: impacto.huella,
        confirmacionReforzada: "Semestre",
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: {
        codigo: "CONFIRMACION_REFORZADA_REQUERIDA",
        campo: "confirmacion",
      },
    });
    await expect(
      entorno.contextos.obtenerPorId(CONTEXTO_ID),
    ).resolves.toBeDefined();
    await expect(entorno.bloques.listar()).resolves.toHaveLength(2);

    await expect(
      entorno.eliminar.ejecutar({
        contextoId: CONTEXTO_ID,
        estrategia: "ELIMINAR_BORRADORES",
        huellaImpacto: impacto.huella,
        confirmacionReforzada: "Semestre académico",
      }),
    ).resolves.toMatchObject({
      exito: true,
      resultado: {
        cantidadBloquesEliminados: 2,
        cantidadRegistrosConfirmadosConservados: 1,
      },
    });
    await expect(entorno.bloques.listar()).resolves.toHaveLength(0);
    await expect(
      entorno.agendas.obtenerPorId(CONTEXTO_ID),
    ).resolves.toBeDefined();
  });

  it("rechaza eliminar Libre incluso por una invocación indirecta", async () => {
    const entorno = await crearEntorno();

    await expect(
      entorno.consultar.ejecutar(IDENTIFICADOR_CONTEXTO_LIBRE),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "CONTEXTO_LIBRE_NO_ELIMINABLE", campo: "contexto" },
    });
    await expect(
      entorno.eliminar.ejecutar({
        contextoId: IDENTIFICADOR_CONTEXTO_LIBRE,
        estrategia: "TRASLADAR_A_LIBRE",
        huellaImpacto: "cualquier-huella",
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "CONTEXTO_LIBRE_NO_ELIMINABLE" },
    });
  });

  it("rechaza un impacto obsoleto sin modificar el estado", async () => {
    const entorno = await crearEntorno();
    const impacto = await obtenerImpacto(entorno);
    await entorno.bloques.guardar(crearBloque("bloque-nuevo", "actividad-d"));

    await expect(
      entorno.eliminar.ejecutar({
        contextoId: CONTEXTO_ID,
        estrategia: "TRASLADAR_A_LIBRE",
        huellaImpacto: impacto.huella,
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "IMPACTO_ELIMINACION_DESACTUALIZADO" },
    });
    await expect(
      entorno.contextos.obtenerPorId(CONTEXTO_ID),
    ).resolves.toBeDefined();
    await expect(entorno.bloques.listar()).resolves.toHaveLength(3);
  });

  it("restaura los bloques si falla la eliminación del contexto", async () => {
    const base = new RepositorioContextosPlanificacionEnMemoria();
    const repositorioConFallo: RepositorioContextosPlanificacion = {
      guardar: (contexto) => base.guardar(contexto),
      obtenerPorId: (id) => base.obtenerPorId(id),
      listar: () => base.listar(),
      eliminar: () => Promise.reject(new Error("Fallo de escritura simulado")),
    };
    const entorno = await crearEntorno(repositorioConFallo);
    const impacto = await obtenerImpacto(entorno);

    await expect(
      entorno.eliminar.ejecutar({
        contextoId: CONTEXTO_ID,
        estrategia: "TRASLADAR_A_LIBRE",
        huellaImpacto: impacto.huella,
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "ELIMINACION_CONTEXTO_FALLIDA" },
    });
    await expect(base.obtenerPorId(CONTEXTO_ID)).resolves.toBeDefined();
    await expect(entorno.bloques.listar()).resolves.toSatisfy(
      (bloques: readonly BloquePlanificacion[]) =>
        bloques.every((bloque) => bloque.contextoId === CONTEXTO_ID),
    );
  });
});

async function crearEntorno(
  contextos: RepositorioContextosPlanificacion = new RepositorioContextosPlanificacionEnMemoria(),
) {
  const bloques = new RepositorioBloquesPlanificacionEnMemoria();
  const agendas = new RepositorioAgendasEnMemoria();
  await contextos.guardar(ContextoPlanificacion.crearLibre(INSTANTE));
  await contextos.guardar(
    ContextoPlanificacion.crearNombrado({
      id: CONTEXTO_ID,
      nombre: "Semestre académico",
      proposito: "Coordinar estudio y docencia",
      fechaInicio: FechaLocal.crear("2026-07-01"),
      fechaFin: FechaLocal.crear("2026-12-20"),
      creadaEn: INSTANTE,
    }),
  );
  await bloques.guardar(crearBloque("bloque-a", "actividad-a"));
  await bloques.guardar(crearBloque("bloque-b", "actividad-b"));
  const historica = crearAgendaConfirmada();
  await agendas.guardar(historica);
  const transaccion = new TransaccionEliminacionContextoPlanificacionEnMemoria(
    contextos,
    bloques,
    agendas,
  );
  return {
    contextos,
    bloques,
    agendas,
    consultar: new CasoDeUsoConsultarImpactoEliminacionContexto(
      contextos,
      transaccion,
    ),
    eliminar: new CasoDeUsoEliminarContextoPlanificacion(
      contextos,
      transaccion,
    ),
  };
}

async function obtenerImpacto(
  entorno: Awaited<ReturnType<typeof crearEntorno>>,
) {
  const resultado = await entorno.consultar.ejecutar(CONTEXTO_ID);
  if (!resultado.exito) throw new Error(resultado.error.mensaje);
  return resultado.impacto;
}

function crearBloque(id: string, actividadId: string): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: CONTEXTO_ID,
    actividadId,
    titulo: `Bloque ${id}`,
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

function crearAgendaConfirmada(): Agenda {
  const agenda = new Agenda({
    id: CONTEXTO_ID,
    nombre: "Semestre académico",
    fechaInicio: FechaLocal.crear("2026-07-01"),
    fechaFin: FechaLocal.crear("2026-12-20"),
    creadaEn: INSTANTE,
  });
  agenda.agregarBloque({
    id: "bloque-confirmado",
    actividadId: "actividad-c",
    titulo: "Examen confirmado",
    fecha: FechaLocal.crear("2026-07-22"),
    minutosPlanificados: 90,
    politica: new PoliticaCompromiso({
      rigidez: "ESTRICTO",
      autoridadPlazo: "EXTERNA",
    }),
  });
  agenda.confirmar(new Date("2026-07-18T13:00:00.000Z"));
  return agenda;
}
