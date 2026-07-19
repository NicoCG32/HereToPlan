import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { CasoDeUsoCorregirCortePlanificacion } from "../src/aplicacion";
import { RepositorioCortesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioCortesPlanificacionIndexedDB";
import {
  CORTE_CONFIRMAR_EN,
  crearCorteEnGracia,
} from "./contratoRepositorioCortesPlanificacion";
import { RelojFijo } from "./doblesAplicacion";

describe("reanudación persistente de la corrección", () => {
  it("permite corregir después de cerrar y reabrir antes del vencimiento", async () => {
    const configuracion = {
      fabricaIndexedDB: new IDBFactory(),
      nombreBaseDatos: "correccion-antes-del-vencimiento",
    };
    const primeraCarga = new RepositorioCortesPlanificacionIndexedDB(
      configuracion,
    );
    await primeraCarga.guardar(crearCorteEnGracia("corte-reanudado"));
    await primeraCarga.cerrar();

    const segundaCarga = new RepositorioCortesPlanificacionIndexedDB(
      configuracion,
    );
    const resultado = await new CasoDeUsoCorregirCortePlanificacion(
      segundaCarga,
      new RelojFijo(new Date("2026-07-20T10:09:59.999Z")),
    ).ejecutar({ corteId: "corte-reanudado" });

    expect(resultado).toMatchObject({
      exito: true,
      corte: { estado: "BORRADOR" },
    });
    await segundaCarga.cerrar();
    const terceraCarga = new RepositorioCortesPlanificacionIndexedDB(
      configuracion,
    );
    const recuperado = await terceraCarga.obtenerPorId("corte-reanudado");
    expect(recuperado).toMatchObject({ estado: "BORRADOR" });
    expect(recuperado?.asignadaEn).toBeUndefined();
    expect(recuperado?.confirmarAutomaticamenteEn).toBeUndefined();
    await terceraCarga.cerrar();
  });

  it("confirma y rechaza la corrección al volver después del vencimiento", async () => {
    const configuracion = {
      fabricaIndexedDB: new IDBFactory(),
      nombreBaseDatos: "correccion-despues-del-vencimiento",
    };
    const primeraCarga = new RepositorioCortesPlanificacionIndexedDB(
      configuracion,
    );
    await primeraCarga.guardar(crearCorteEnGracia("corte-vencido"));
    await primeraCarga.cerrar();

    const segundaCarga = new RepositorioCortesPlanificacionIndexedDB(
      configuracion,
    );
    const resultado = await new CasoDeUsoCorregirCortePlanificacion(
      segundaCarga,
      new RelojFijo(new Date("2026-07-20T10:30:00.000Z")),
    ).ejecutar({ corteId: "corte-vencido" });

    expect(resultado).toMatchObject({
      exito: false,
      error: { codigo: "CORTE_NO_CORREGIBLE" },
    });
    const recuperado = await segundaCarga.obtenerPorId("corte-vencido");
    expect(recuperado).toMatchObject({ estado: "CONFIRMADA" });
    expect(recuperado?.confirmadaEn?.toISOString()).toBe(
      CORTE_CONFIRMAR_EN.toISOString(),
    );
    await segundaCarga.cerrar();
  });
});
