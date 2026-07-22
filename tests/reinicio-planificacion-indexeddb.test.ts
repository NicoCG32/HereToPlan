import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { LectorEstadoPersistenteIndexedDB } from "../src/infraestructura/persistencia/indexeddb/LectorEstadoPersistenteIndexedDB";
import { RestauradorEstadoPersistenteIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RestauradorEstadoPersistenteIndexedDB";
import { UnidadTrabajoReinicioPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/UnidadTrabajoReinicioPlanificacionIndexedDB";
import { crearEstadoReinicio } from "./datosReinicio";

describe("reinicio atómico en IndexedDB", () => {
  it("retira únicamente planificación activa y conserva economía e historia", async () => {
    const entorno = await crearEntorno("reinicio-indexeddb");
    const impacto = await entorno.unidad.consultarImpacto();

    const resultado = await entorno.unidad.reiniciar({
      operacionId: "reinicio-1",
      huellaEsperada: impacto.huella,
    });
    const estado = await entorno.lector.leerEstadoCompleto();

    expect(resultado.yaReiniciada).toBe(false);
    expect(estado.colecciones["bloques-planificacion"]).toMatchObject([
      { id: "bloque-historico" },
    ]);
    expect(estado.colecciones["cortes-planificacion"]).toMatchObject([
      { id: "corte-historico", bloques: [{ id: "bloque-historico" }] },
    ]);
    expect(estado.colecciones["sesiones-cronometro"]).toMatchObject([
      { id: "sesion-finalizada", estado: "FINALIZADA" },
    ]);
    expect(estado.colecciones["perfil-usuario"]).toHaveLength(1);
    expect(estado.colecciones.actividades).toHaveLength(2);
    expect(estado.colecciones["transacciones-puntos"]).toHaveLength(1);
    expect(estado.colecciones["recompensas-adquiridas"]).toHaveLength(1);
    expect(estado.colecciones["aplicaciones-recompensas"]).toHaveLength(1);

    await cerrar(entorno);
  });

  it("serializa órdenes concurrentes y vuelve equivalente el reintento", async () => {
    const entorno = await crearEntorno("reinicio-concurrente");
    const impacto = await entorno.unidad.consultarImpacto();

    const resultados = await Promise.all([
      entorno.unidad.reiniciar({
        operacionId: "reinicio-1",
        huellaEsperada: impacto.huella,
      }),
      entorno.unidad.reiniciar({
        operacionId: "reinicio-2",
        huellaEsperada: impacto.huella,
      }),
    ]);

    expect(resultados.map(({ yaReiniciada }) => yaReiniciada).sort()).toEqual([
      false,
      true,
    ]);
    expect((await entorno.unidad.consultarImpacto()).totalEliminaciones).toBe(
      0,
    );
    await cerrar(entorno);
  });

  it("aborta toda la transacción ante un fallo de publicación", async () => {
    const antesDePublicar = vi.fn(() => {
      throw new Error("fallo simulado");
    });
    const entorno = await crearEntorno("reinicio-rollback", antesDePublicar);
    const impacto = await entorno.unidad.consultarImpacto();

    await expect(
      entorno.unidad.reiniciar({
        operacionId: "reinicio-fallido",
        huellaEsperada: impacto.huella,
      }),
    ).rejects.toMatchObject({ codigo: "REINICIO_ATOMICO_FALLIDO" });
    expect(antesDePublicar).toHaveBeenCalledOnce();
    const estado = await entorno.lector.leerEstadoCompleto();
    expect(
      estado.colecciones["bloques-planificacion"].some(
        (registro) => registro.id === "bloque-activo",
      ),
    ).toBe(true);
    expect(
      estado.colecciones["bloques-planificacion"].some(
        (registro) => registro.id === "bloque-historico",
      ),
    ).toBe(true);
    expect(
      estado.colecciones["sesiones-cronometro"].some(
        (registro) => registro.id === "sesion-abierta",
      ),
    ).toBe(true);
    await cerrar(entorno);
  });

  it("rechaza una confirmación cuando el impacto quedó desactualizado", async () => {
    const entorno = await crearEntorno("reinicio-impacto-desactualizado");
    const impacto = await entorno.unidad.consultarImpacto();
    const estadoActual = await entorno.lector.leerEstadoCompleto();
    const restaurador = new RestauradorEstadoPersistenteIndexedDB({
      fabricaIndexedDB: entorno.fabricaIndexedDB,
      nombreBaseDatos: entorno.nombreBaseDatos,
    });

    await restaurador.reemplazarEstadoCompleto({
      ...estadoActual,
      colecciones: {
        ...estadoActual.colecciones,
        "bloques-planificacion": [
          ...estadoActual.colecciones["bloques-planificacion"],
          { versionEsquema: 1, id: "bloque-concurrente" },
        ],
      },
    });
    await restaurador.cerrar();

    await expect(
      entorno.unidad.reiniciar({
        operacionId: "reinicio-desactualizado",
        huellaEsperada: impacto.huella,
      }),
    ).rejects.toMatchObject({ codigo: "IMPACTO_REINICIO_DESACTUALIZADO" });
    expect(
      (await entorno.lector.leerEstadoCompleto()).colecciones[
        "bloques-planificacion"
      ],
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "bloque-concurrente" }),
      ]),
    );
    await cerrar(entorno);
  });
});

async function crearEntorno(
  nombreBaseDatos: string,
  antesDePublicar?: () => void,
) {
  const fabricaIndexedDB = new IDBFactory();
  const configuracion = {
    fabricaIndexedDB,
    nombreBaseDatos,
    ...(antesDePublicar ? { antesDePublicar } : {}),
  };
  const restaurador = new RestauradorEstadoPersistenteIndexedDB({
    fabricaIndexedDB,
    nombreBaseDatos,
  });
  await restaurador.reemplazarEstadoCompleto(crearEstadoReinicio());
  await restaurador.cerrar();
  return {
    fabricaIndexedDB,
    nombreBaseDatos,
    unidad: new UnidadTrabajoReinicioPlanificacionIndexedDB(configuracion),
    lector: new LectorEstadoPersistenteIndexedDB({
      fabricaIndexedDB,
      nombreBaseDatos,
    }),
  };
}

async function cerrar(
  entorno: Awaited<ReturnType<typeof crearEntorno>>,
): Promise<void> {
  await entorno.unidad.cerrar();
  await entorno.lector.cerrar();
}
