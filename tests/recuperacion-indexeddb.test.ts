import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  CONFIGURACION_RECUPERACION_INICIAL,
  ErrorPersistenciaRecuperacionDuplicada,
} from "../src/aplicacion";
import {
  ConfiguracionRecuperacion,
  FechaLocal,
  MovimientoRecuperacion,
  ReduccionCarga,
  ResolucionBloquePlanificacion,
} from "../src/dominio";
import { RepositorioRecuperacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioRecuperacionIndexedDB";
import { RepositorioResolucionesBloquesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioResolucionesBloquesPlanificacionIndexedDB";

describe("persistencia IndexedDB del banco de recuperación", () => {
  it("recupera acreditaciones y confirma consumo con reducción en una transacción", async () => {
    const configuracion = crearConfiguracion("flujo");
    const repositorio = new RepositorioRecuperacionIndexedDB(configuracion);
    await repositorio.guardarAcreditacion(
      crearMovimiento("m-1", "op-1", "ACREDITACION", 50, "fuente"),
      CONFIGURACION_RECUPERACION_INICIAL,
    );
    const consumo = crearMovimiento("m-2", "op-2", "CONSUMO", 30, "destino");
    const reduccion = crearReduccion("r-1", consumo);
    await repositorio.confirmarConsumo(consumo, reduccion);
    await repositorio.cerrar();

    const recuperado = new RepositorioRecuperacionIndexedDB(configuracion);
    await expect(recuperado.listarMovimientos()).resolves.toHaveLength(2);
    await expect(
      recuperado.obtenerMovimientoPorOperacionId("op-2"),
    ).resolves.toMatchObject({ id: "m-2", minutos: 30 });
    await expect(
      recuperado.obtenerMovimientoPorFuente("ACREDITACION", "fuente"),
    ).resolves.toMatchObject({ id: "m-1" });
    await expect(
      recuperado.obtenerReduccionPorBloque("destino"),
    ).resolves.toMatchObject({ id: "r-1", minutosReducidos: 30 });
    await expect(recuperado.listarReducciones()).resolves.toHaveLength(1);
    await recuperado.cerrar();
  });

  it("aborta ambas escrituras ante saldo insuficiente", async () => {
    const repositorio = new RepositorioRecuperacionIndexedDB(
      crearConfiguracion("saldo"),
    );
    const consumo = crearMovimiento("m-1", "op-1", "CONSUMO", 10, "destino");

    await expect(
      repositorio.confirmarConsumo(consumo, crearReduccion("r-1", consumo)),
    ).rejects.toMatchObject({ codigo: "SALDO_RECUPERACION_INSUFICIENTE" });
    await expect(repositorio.listarMovimientos()).resolves.toEqual([]);
    await expect(repositorio.listarReducciones()).resolves.toEqual([]);
    await repositorio.cerrar();
  });

  it("impide duplicados y no reduce un bloque resuelto concurrentemente", async () => {
    const configuracion = crearConfiguracion("conflictos");
    const repositorio = new RepositorioRecuperacionIndexedDB(configuracion);
    const ingreso = crearMovimiento(
      "m-1",
      "op-1",
      "ACREDITACION",
      50,
      "fuente",
    );
    await repositorio.guardarAcreditacion(
      ingreso,
      CONFIGURACION_RECUPERACION_INICIAL,
    );
    await expect(
      repositorio.guardarAcreditacion(
        ingreso,
        CONFIGURACION_RECUPERACION_INICIAL,
      ),
    ).rejects.toBeInstanceOf(ErrorPersistenciaRecuperacionDuplicada);
    const resoluciones =
      new RepositorioResolucionesBloquesPlanificacionIndexedDB(configuracion);
    await resoluciones.guardar(
      new ResolucionBloquePlanificacion({
        bloqueId: "destino",
        operacionId: "resolver-destino",
        resultado: "COMPLETADO",
        resueltoEn: new Date("2026-07-20T14:00:00.000Z"),
      }),
    );
    const consumo = crearMovimiento("m-2", "op-2", "CONSUMO", 20, "destino");
    await expect(
      repositorio.confirmarConsumo(consumo, crearReduccion("r-1", consumo)),
    ).rejects.toBeInstanceOf(ErrorPersistenciaRecuperacionDuplicada);
    await expect(repositorio.listarMovimientos()).resolves.toHaveLength(1);
    await expect(repositorio.listarReducciones()).resolves.toEqual([]);
    await repositorio.cerrar();
    await resoluciones.cerrar();
  });

  it("serializa acreditaciones concurrentes sin superar el tope diario", async () => {
    const repositorio = new RepositorioRecuperacionIndexedDB(
      crearConfiguracion("topes"),
    );
    const politica = new ConfiguracionRecuperacion({
      numeradorTasa: 1,
      denominadorTasa: 1,
      maximoDiarioMinutos: 50,
      maximoSemanalMinutos: 100,
    });

    const resultados = await Promise.allSettled([
      repositorio.guardarAcreditacion(
        crearMovimiento("m-1", "op-1", "ACREDITACION", 40, "fuente-1"),
        politica,
      ),
      repositorio.guardarAcreditacion(
        crearMovimiento("m-2", "op-2", "ACREDITACION", 40, "fuente-2"),
        politica,
      ),
    ]);

    expect(
      resultados.filter(({ status }) => status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      resultados.filter(({ status }) => status === "rejected"),
    ).toHaveLength(1);
    await expect(repositorio.listarMovimientos()).resolves.toHaveLength(1);
    await repositorio.cerrar();
  });
});

function crearConfiguracion(sufijo: string) {
  return {
    fabricaIndexedDB: new IDBFactory(),
    nombreBaseDatos: `recuperacion-${sufijo}`,
  };
}

function crearMovimiento(
  id: string,
  operacionId: string,
  tipo: "ACREDITACION" | "CONSUMO",
  minutos: number,
  bloqueFuenteId: string,
) {
  return new MovimientoRecuperacion({
    id,
    operacionId,
    tipo,
    minutos,
    bloqueFuenteId,
    fechaFuente: FechaLocal.crear("2026-07-22"),
    descripcion: `Movimiento ${id}`,
    ocurridoEn: new Date("2026-07-20T13:00:00.000Z"),
  });
}

function crearReduccion(id: string, movimiento: MovimientoRecuperacion) {
  return new ReduccionCarga({
    id,
    operacionId: movimiento.operacionId,
    movimientoId: movimiento.id,
    bloqueId: movimiento.bloqueFuenteId,
    minutosReducidos: movimiento.minutos,
    aplicadaEn: movimiento.ocurridoEn,
  });
}
