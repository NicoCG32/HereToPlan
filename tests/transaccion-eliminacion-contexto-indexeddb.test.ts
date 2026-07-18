import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  Agenda,
  BloquePlanificacion,
  ContextoPlanificacion,
  FechaLocal,
  PoliticaCompromiso,
} from "../src/dominio";
import { RepositorioAgendasIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioAgendasIndexedDB";
import { RepositorioBloquesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioBloquesPlanificacionIndexedDB";
import { RepositorioContextosPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioContextosPlanificacionIndexedDB";
import { TransaccionEliminacionContextoPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/TransaccionEliminacionContextoPlanificacionIndexedDB";

const CONTEXTO_ID = "contexto-proyecto";

describe("TransaccionEliminacionContextoPlanificacionIndexedDB", () => {
  it("traslada borradores y elimina el contexto en una sola transacción", async () => {
    const entorno = await crearEntorno("eliminacion-transferencia");
    const impacto = await entorno.transaccion.consultarImpacto(CONTEXTO_ID);

    await expect(
      entorno.transaccion.ejecutar({
        contextoId: CONTEXTO_ID,
        estrategia: "TRASLADAR_A_LIBRE",
        huellaEsperada: impacto.huella,
      }),
    ).resolves.toEqual({
      cantidadBloquesTrasladados: 1,
      cantidadBloquesEliminados: 0,
      cantidadRegistrosConfirmadosConservados: 1,
    });
    await expect(
      entorno.contextos.obtenerPorId(CONTEXTO_ID),
    ).resolves.toBeUndefined();
    await expect(
      entorno.bloques.obtenerPorId("bloque-editable"),
    ).resolves.toMatchObject({
      contextoId: "contexto-libre",
    });
    await expect(
      entorno.agendas.obtenerPorId(CONTEXTO_ID),
    ).resolves.toMatchObject({
      estado: "CONFIRMADA",
    });
  });

  it("aborta sin escrituras si el impacto cambió antes de confirmar", async () => {
    const entorno = await crearEntorno("eliminacion-impacto-obsoleto");
    const impacto = await entorno.transaccion.consultarImpacto(CONTEXTO_ID);
    await entorno.bloques.guardar(crearBloque("bloque-concurrente"));

    await expect(
      entorno.transaccion.ejecutar({
        contextoId: CONTEXTO_ID,
        estrategia: "ELIMINAR_BORRADORES",
        huellaEsperada: impacto.huella,
      }),
    ).rejects.toMatchObject({
      codigo: "IMPACTO_ELIMINACION_DESACTUALIZADO",
    });
    await expect(
      entorno.contextos.obtenerPorId(CONTEXTO_ID),
    ).resolves.toBeDefined();
    await expect(entorno.bloques.listar()).resolves.toHaveLength(2);
    await expect(
      entorno.agendas.obtenerPorId(CONTEXTO_ID),
    ).resolves.toBeDefined();
  });
});

async function crearEntorno(sufijo: string) {
  const fabricaIndexedDB = new IDBFactory();
  const nombreBaseDatos = `here-to-plan-${sufijo}`;
  const configuracion = { fabricaIndexedDB, nombreBaseDatos };
  const contextos = new RepositorioContextosPlanificacionIndexedDB(
    configuracion,
  );
  const bloques = new RepositorioBloquesPlanificacionIndexedDB(configuracion);
  const agendas = new RepositorioAgendasIndexedDB(configuracion);
  const transaccion = new TransaccionEliminacionContextoPlanificacionIndexedDB(
    configuracion,
  );
  await contextos.guardar(
    ContextoPlanificacion.crearLibre(new Date("2026-07-18T10:00:00.000Z")),
  );
  await contextos.guardar(
    ContextoPlanificacion.crearNombrado({
      id: CONTEXTO_ID,
      nombre: "Proyecto editorial",
      creadaEn: new Date("2026-07-18T10:00:00.000Z"),
    }),
  );
  await bloques.guardar(crearBloque("bloque-editable"));
  await agendas.guardar(crearAgendaConfirmada());
  return { contextos, bloques, agendas, transaccion };
}

function crearBloque(id: string): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: CONTEXTO_ID,
    actividadId: `actividad-${id}`,
    titulo: "Preparar manuscrito",
    fecha: FechaLocal.crear("2026-07-22"),
    minutosPlanificados: 60,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["REPROGRAMAR"],
    }),
    creadoEn: new Date("2026-07-18T10:00:00.000Z"),
  });
}

function crearAgendaConfirmada(): Agenda {
  const agenda = new Agenda({
    id: CONTEXTO_ID,
    nombre: "Proyecto editorial",
    fechaInicio: FechaLocal.crear("2026-07-01"),
    fechaFin: FechaLocal.crear("2026-08-31"),
    creadaEn: new Date("2026-07-01T10:00:00.000Z"),
  });
  agenda.agregarBloque({
    id: "bloque-confirmado",
    actividadId: "actividad-confirmada",
    titulo: "Entregar manuscrito",
    fecha: FechaLocal.crear("2026-07-30"),
    minutosPlanificados: 90,
    politica: new PoliticaCompromiso({
      rigidez: "ESTRICTO",
      autoridadPlazo: "EXTERNA",
    }),
  });
  agenda.confirmar(new Date("2026-07-18T11:00:00.000Z"));
  return agenda;
}
