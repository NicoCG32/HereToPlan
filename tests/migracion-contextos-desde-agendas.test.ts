import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  Agenda,
  ContextoPlanificacion,
  FechaLocal,
  PoliticaCompromiso,
} from "../src/dominio";
import {
  ErrorMigracionContextosDesdeAgendas,
  MigradorContextosDesdeAgendasIndexedDB,
} from "../src/infraestructura/persistencia/indexeddb/MigradorContextosDesdeAgendasIndexedDB";
import { RepositorioContextosPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioContextosPlanificacionIndexedDB";
import {
  ALMACEN_ACTIVIDADES,
  ALMACEN_AGENDAS,
  ALMACEN_CONTEXTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos";
import { convertirAgendaEnV1 } from "../src/infraestructura/persistencia/mapeadores/MapeadorAgendaV1";
import { convertirContextoEnV1 } from "../src/infraestructura/persistencia/mapeadores/MapeadorContextoPlanificacionV1";
import type { AgendaV1 } from "../src/infraestructura/persistencia/registros/AgendaV1";
import type { ContextoPlanificacionV1 } from "../src/infraestructura/persistencia/registros/ContextoPlanificacionV1";

const NOMBRE_BASE_DATOS = "here-to-plan-migracion-contextos";
const CREADA_EN_LIBRE = new Date("2026-07-20T09:00:00.000Z");

describe("migración incremental de AgendaV1 a contextos", () => {
  it("copia solo metadatos y conserva agendas y actividades intactas", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const agenda = crearAgendaConfirmada("agenda-semestre", "Semestre");
    const registroAgenda = convertirAgendaEnV1(agenda);
    const registroActividad = {
      versionEsquema: 1,
      id: "actividad-1",
      titulo: "Preparar examen",
      marcadorConservacion: "sin cambios",
    };
    await prepararBase(
      fabricaIndexedDB,
      [registroAgenda],
      [],
      [registroActividad],
    );

    const resultado =
      await crearMigrador(fabricaIndexedDB).ejecutar(CREADA_EN_LIBRE);

    expect(resultado).toEqual({
      agendasEvaluadas: 1,
      contextosCreados: 2,
      libreCreado: true,
    });
    const registros = await leerTodosLosAlmacenes(fabricaIndexedDB);
    expect(registros.agendas).toEqual([registroAgenda]);
    expect(registros.actividades).toEqual([registroActividad]);
    expect(registros.contextos).toHaveLength(2);

    const repositorioTrasRecarga =
      new RepositorioContextosPlanificacionIndexedDB({
        fabricaIndexedDB,
        nombreBaseDatos: NOMBRE_BASE_DATOS,
      });
    await expect(
      repositorioTrasRecarga.obtenerPorId("agenda-semestre"),
    ).resolves.toMatchObject({
      id: "agenda-semestre",
      nombre: "Semestre",
      tipo: "NOMBRADO",
      fechaInicio: { valor: "2026-08-01" },
      fechaFin: { valor: "2026-12-20" },
    });
  });

  it("es idempotente al repetirse", async () => {
    const fabricaIndexedDB = new IDBFactory();
    await prepararBase(fabricaIndexedDB, [
      convertirAgendaEnV1(crearAgendaConfirmada("agenda-1", "Proyecto")),
    ]);
    const migrador = crearMigrador(fabricaIndexedDB);

    const primera = await migrador.ejecutar(CREADA_EN_LIBRE);
    const segunda = await migrador.ejecutar(
      new Date("2027-01-01T00:00:00.000Z"),
    );

    expect(primera.contextosCreados).toBe(2);
    expect(segunda).toEqual({
      agendasEvaluadas: 1,
      contextosCreados: 0,
      libreCreado: false,
    });
    const registros = await leerTodosLosAlmacenes(fabricaIndexedDB);
    expect(registros.contextos).toHaveLength(2);
    expect(
      registros.contextos.find((contexto) => contexto.id === "contexto-libre"),
    ).toMatchObject({ creadaEn: "2026-07-20T09:00:00.000Z" });
  });

  it("aborta toda escritura cuando una AgendaV1 es incompatible", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const valida = convertirAgendaEnV1(
      crearAgendaConfirmada("agenda-valida", "Válida"),
    );
    const incompatible = {
      ...convertirAgendaEnV1(
        crearAgendaConfirmada("agenda-incompatible", "Incompatible"),
      ),
      versionEsquema: 2,
    } as unknown as AgendaV1;
    await prepararBase(fabricaIndexedDB, [valida, incompatible]);

    await expect(
      crearMigrador(fabricaIndexedDB).ejecutar(CREADA_EN_LIBRE),
    ).rejects.toMatchObject({
      name: "ErrorMapeoAgendaV1",
      codigo: "VERSION_AGENDA_NO_SOPORTADA",
    });

    const registros = await leerTodosLosAlmacenes(fabricaIndexedDB);
    expect(registros.contextos).toEqual([]);
    expect(
      [...registros.agendas].sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual([valida, incompatible].sort((a, b) => a.id.localeCompare(b.id)));
  });

  it("rechaza metadatos divergentes sin crear Libre ni reemplazar el contexto", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const agenda = convertirAgendaEnV1(
      crearAgendaConfirmada("agenda-1", "Nombre de AgendaV1"),
    );
    const conflicto = convertirContextoEnV1(
      ContextoPlanificacion.crearNombrado({
        id: "agenda-1",
        nombre: "Nombre divergente",
        fechaInicio: FechaLocal.crear("2026-08-01"),
        fechaFin: FechaLocal.crear("2026-12-20"),
        creadaEn: new Date("2026-07-20T10:00:00.000Z"),
      }),
    );
    await prepararBase(fabricaIndexedDB, [agenda], [conflicto]);

    await expect(
      crearMigrador(fabricaIndexedDB).ejecutar(CREADA_EN_LIBRE),
    ).rejects.toMatchObject({
      name: "ErrorMigracionContextosDesdeAgendas",
      codigo: "CONFLICTO_CONTEXTO_EXISTENTE",
    } satisfies Partial<ErrorMigracionContextosDesdeAgendas>);

    const registros = await leerTodosLosAlmacenes(fabricaIndexedDB);
    expect(registros.contextos).toEqual([conflicto]);
  });
});

function crearAgendaConfirmada(id: string, nombre: string): Agenda {
  const agenda = new Agenda({
    id,
    nombre,
    fechaInicio: FechaLocal.crear("2026-08-01"),
    fechaFin: FechaLocal.crear("2026-12-20"),
    creadaEn: new Date("2026-07-20T10:00:00.000Z"),
  });
  agenda.agregarBloque({
    id: `bloque-${id}`,
    actividadId: "actividad-1",
    titulo: "Bloque que permanece en AgendaV1",
    fecha: FechaLocal.crear("2026-08-01"),
    minutosPlanificados: 60,
    politica: new PoliticaCompromiso({
      rigidez: "ESTRICTO",
      autoridadPlazo: "EXTERNA",
    }),
  });
  agenda.confirmar(new Date("2026-07-20T11:00:00.000Z"));
  return agenda;
}

function crearMigrador(
  fabricaIndexedDB: IDBFactory,
): MigradorContextosDesdeAgendasIndexedDB {
  return new MigradorContextosDesdeAgendasIndexedDB({
    fabricaIndexedDB,
    nombreBaseDatos: NOMBRE_BASE_DATOS,
  });
}

async function prepararBase(
  fabricaIndexedDB: IDBFactory,
  agendas: readonly AgendaV1[],
  contextos: readonly ContextoPlanificacionV1[] = [],
  actividades: readonly Record<string, unknown>[] = [],
): Promise<void> {
  const baseDatos = await abrirBase(fabricaIndexedDB);
  await new Promise<void>((resolve, reject) => {
    const transaccion = baseDatos.transaction(
      [ALMACEN_AGENDAS, ALMACEN_ACTIVIDADES, ALMACEN_CONTEXTOS],
      "readwrite",
    );
    for (const agenda of agendas) {
      transaccion.objectStore(ALMACEN_AGENDAS).add(agenda);
    }
    for (const actividad of actividades) {
      transaccion.objectStore(ALMACEN_ACTIVIDADES).add(actividad);
    }
    for (const contexto of contextos) {
      transaccion.objectStore(ALMACEN_CONTEXTOS).add(contexto);
    }
    transaccion.oncomplete = () => resolve();
    transaccion.onabort = () =>
      reject(
        transaccion.error ?? new Error("No fue posible preparar la base."),
      );
  });
  baseDatos.close();
}

async function leerTodosLosAlmacenes(fabricaIndexedDB: IDBFactory): Promise<{
  agendas: readonly AgendaV1[];
  actividades: readonly Record<string, unknown>[];
  contextos: readonly ContextoPlanificacionV1[];
}> {
  const baseDatos = await abrirBase(fabricaIndexedDB);
  const resultado = await new Promise<{
    agendas: readonly AgendaV1[];
    actividades: readonly Record<string, unknown>[];
    contextos: readonly ContextoPlanificacionV1[];
  }>((resolve, reject) => {
    const transaccion = baseDatos.transaction(
      [ALMACEN_AGENDAS, ALMACEN_ACTIVIDADES, ALMACEN_CONTEXTOS],
      "readonly",
    );
    const agendas = transaccion.objectStore(ALMACEN_AGENDAS).getAll();
    const actividades = transaccion.objectStore(ALMACEN_ACTIVIDADES).getAll();
    const contextos = transaccion.objectStore(ALMACEN_CONTEXTOS).getAll();
    transaccion.oncomplete = () =>
      resolve({
        agendas: agendas.result as readonly AgendaV1[],
        actividades: actividades.result as readonly Record<string, unknown>[],
        contextos: contextos.result as readonly ContextoPlanificacionV1[],
      });
    transaccion.onabort = () =>
      reject(transaccion.error ?? new Error("No fue posible leer la base."));
  });
  baseDatos.close();
  return resultado;
}

function abrirBase(fabricaIndexedDB: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = fabricaIndexedDB.open(
      NOMBRE_BASE_DATOS,
      VERSION_BASE_DATOS,
    );
    solicitud.onupgradeneeded = () => asegurarAlmacenes(solicitud.result);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(solicitud.error ?? new Error("No fue posible abrir la base."));
  });
}
