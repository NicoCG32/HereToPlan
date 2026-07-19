import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  CasoDeUsoCompletarBloquePlanificacion,
  CasoDeUsoMarcarBloqueIncumplido,
} from "../src/aplicacion";
import {
  BloquePlanificacion,
  CortePlanificacion,
  FechaLocal,
  PoliticaCompromiso,
} from "../src/dominio";
import { RepositorioCortesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioCortesPlanificacionIndexedDB";
import { RepositorioResolucionesBloquesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioResolucionesBloquesPlanificacionIndexedDB";
import { RelojFijo } from "./doblesAplicacion";

const NOMBRE_BASE_DATOS = "here-to-plan-resoluciones-pruebas";
const RESUELTA_EN = new Date("2026-07-20T11:00:00.000Z");

describe("resolución persistente e idempotente de bloques", () => {
  it("conserva la operación original después de cerrar y reabrir IndexedDB", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const primera = crearRepositorios(fabricaIndexedDB);
    await primera.cortes.guardar(crearCorteConfirmado());
    const completar = new CasoDeUsoCompletarBloquePlanificacion(
      primera.cortes,
      primera.resoluciones,
      new RelojFijo(RESUELTA_EN),
    );
    const comando = {
      bloqueId: "bloque-persistente",
      operacionId: "operacion-persistente",
    };
    await expect(completar.ejecutar(comando)).resolves.toMatchObject({
      exito: true,
      resolucion: { reintentoIdempotente: false },
    });
    await Promise.all([primera.cortes.cerrar(), primera.resoluciones.cerrar()]);

    const recarga = crearRepositorios(fabricaIndexedDB);
    const completarTrasRecarga = new CasoDeUsoCompletarBloquePlanificacion(
      recarga.cortes,
      recarga.resoluciones,
      new RelojFijo(new Date("2026-07-21T15:00:00.000Z")),
    );
    const incumplirTrasRecarga = new CasoDeUsoMarcarBloqueIncumplido(
      recarga.cortes,
      recarga.resoluciones,
      new RelojFijo(new Date("2026-07-21T15:00:00.000Z")),
    );

    await expect(completarTrasRecarga.ejecutar(comando)).resolves.toEqual({
      exito: true,
      resolucion: {
        bloqueId: "bloque-persistente",
        operacionId: "operacion-persistente",
        resultado: "COMPLETADO",
        resueltoEn: RESUELTA_EN.toISOString(),
        reintentoIdempotente: true,
      },
    });
    await expect(
      incumplirTrasRecarga.ejecutar({
        bloqueId: "bloque-persistente",
        operacionId: "otra-operacion",
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_YA_RESUELTO" },
    });
    await expect(recarga.resoluciones.listar()).resolves.toHaveLength(1);
  });
});

function crearRepositorios(fabricaIndexedDB: IDBFactory) {
  const configuracion = {
    fabricaIndexedDB,
    nombreBaseDatos: NOMBRE_BASE_DATOS,
  };
  return {
    cortes: new RepositorioCortesPlanificacionIndexedDB(configuracion),
    resoluciones: new RepositorioResolucionesBloquesPlanificacionIndexedDB(
      configuracion,
    ),
  };
}

function crearCorteConfirmado(): CortePlanificacion {
  const bloque = new BloquePlanificacion({
    id: "bloque-persistente",
    contextoId: "contexto-libre",
    actividadId: "actividad-persistente",
    titulo: "Trabajo persistente",
    fecha: FechaLocal.crear("2026-07-20"),
    minutosPlanificados: 45,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["REPROGRAMAR"],
    }),
    creadoEn: new Date("2026-07-20T09:00:00.000Z"),
  });
  const corte = CortePlanificacion.crear({
    id: "corte-persistente",
    bloques: [bloque],
    creadoEn: new Date("2026-07-20T09:00:00.000Z"),
  });
  corte.iniciarRevision();
  corte.asignar(new Date("2026-07-20T10:00:00.000Z"));
  corte.actualizarSegunReloj(new Date("2026-07-20T10:10:00.000Z"));
  return corte;
}
