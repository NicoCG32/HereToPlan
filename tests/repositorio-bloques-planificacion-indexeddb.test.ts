import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  BloquePlanificacion,
  FechaLocal,
  PoliticaCompromiso,
} from "../src/dominio";
import { RepositorioBloquesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioBloquesPlanificacionIndexedDB";

describe("RepositorioBloquesPlanificacionIndexedDB", () => {
  it("persiste, actualiza y elimina bloques entre instancias", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const primero = crearRepositorio(fabricaIndexedDB);
    await primero.guardar(crearBloque("bloque-1", "2026-07-20", 45));
    await primero.cerrar();

    const segundo = crearRepositorio(fabricaIndexedDB);
    await expect(segundo.obtenerPorId("bloque-1")).resolves.toMatchObject({
      contextoId: "contexto-libre",
      actividadId: "actividad-1",
      fecha: { valor: "2026-07-20" },
      minutosPlanificados: 45,
      politica: { rigidez: "FLEXIBLE" },
    });
    await segundo.actualizar(crearBloque("bloque-1", "2026-07-21", 60));
    await expect(segundo.listar()).resolves.toMatchObject([
      { fecha: { valor: "2026-07-21" }, minutosPlanificados: 60 },
    ]);
    await segundo.eliminar("bloque-1");
    await expect(segundo.listar()).resolves.toEqual([]);
  });

  it("rechaza duplicados y operaciones sobre bloques ausentes", async () => {
    const repositorio = crearRepositorio(new IDBFactory());
    await repositorio.guardar(crearBloque("bloque-1", "2026-07-20", 45));

    await expect(
      repositorio.guardar(crearBloque("bloque-1", "2026-07-21", 60)),
    ).rejects.toMatchObject({ codigo: "BLOQUE_PLANIFICACION_DUPLICADO" });
    await expect(
      repositorio.actualizar(crearBloque("ausente", "2026-07-21", 60)),
    ).rejects.toMatchObject({ codigo: "BLOQUE_PLANIFICACION_NO_ENCONTRADO" });
    await expect(repositorio.eliminar("ausente")).rejects.toMatchObject({
      codigo: "BLOQUE_PLANIFICACION_NO_ENCONTRADO",
    });
  });

  it("guarda una recurrencia de forma atómica", async () => {
    const repositorio = crearRepositorio(new IDBFactory());
    await repositorio.guardar(crearBloque("existente", "2026-07-20", 45));

    await expect(
      repositorio.guardarTodos([
        crearBloque("nuevo", "2026-07-21", 45),
        crearBloque("existente", "2026-07-22", 45),
      ]),
    ).rejects.toMatchObject({ codigo: "BLOQUE_PLANIFICACION_DUPLICADO" });
    await expect(repositorio.listar()).resolves.toMatchObject([
      { id: "existente" },
    ]);

    await repositorio.guardarTodos([
      crearBloque("nuevo-1", "2026-07-21", 45),
      crearBloque("nuevo-2", "2026-07-22", 45),
    ]);
    await expect(repositorio.listar()).resolves.toHaveLength(3);
  });
});

function crearRepositorio(fabricaIndexedDB: IDBFactory) {
  return new RepositorioBloquesPlanificacionIndexedDB({
    fabricaIndexedDB,
    nombreBaseDatos: "here-to-plan-bloques-pruebas",
  });
}

function crearBloque(
  id: string,
  fecha: string,
  minutosPlanificados: number,
): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-libre",
    actividadId: "actividad-1",
    titulo: "Preparar informe",
    fecha: FechaLocal.crear(fecha),
    minutosPlanificados,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["REPROGRAMAR"],
    }),
    creadoEn: new Date("2026-07-20T10:00:00.000Z"),
  });
}
