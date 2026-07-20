import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  CasoDeUsoCompletarBloqueConPuntos,
  CasoDeUsoConsultarBilletera,
} from "../src/aplicacion";
import {
  BloquePlanificacion,
  CortePlanificacion,
  FechaLocal,
  FormulaPuntosBloque,
  PoliticaCompromiso,
} from "../src/dominio";
import {
  ALMACEN_TRANSACCIONES_PUNTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import { RepositorioResolucionesBloquesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioResolucionesBloquesPlanificacionIndexedDB";
import { RepositorioTransaccionesPuntosIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioTransaccionesPuntosIndexedDB";
import { TransaccionCompletarBloqueConPuntosIndexedDB } from "../src/infraestructura/persistencia/indexeddb/TransaccionCompletarBloqueConPuntosIndexedDB";
import type { TransaccionPuntosV1 } from "../src/infraestructura/persistencia/registros/TransaccionPuntosV1";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const RESUELTO_EN = new Date("2026-07-20T12:00:00.000Z");

describe("cumplimiento y acreditación atómicos", () => {
  it("registra juntos la resolución y el ingreso calculado", async () => {
    const entorno = await crearEntorno("cumplimiento-atomico", [
      crearBloque("bloque-1", 45),
    ]);

    const resultado = await entorno.crearCaso(["ingreso-1"]).ejecutar({
      bloqueId: "bloque-1",
      operacionId: "operacion-1",
    });

    expect(resultado).toEqual({
      exito: true,
      cumplimiento: {
        bloqueId: "bloque-1",
        operacionId: "operacion-1",
        resultado: "COMPLETADO",
        resueltoEn: RESUELTO_EN.toISOString(),
        puntosAcreditados: 2,
        reintentoIdempotente: false,
      },
    });
    await expect(
      entorno.resoluciones.obtenerPorBloqueId("bloque-1"),
    ).resolves.toMatchObject({ resultado: "COMPLETADO" });
    await expect(
      listarIngresos(entorno.fabrica, entorno.nombre),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "ingreso-1",
        cantidad: 2,
        fuenteTipo: "COMPROMISO_COMPLETADO",
        fuenteId: "bloque-1",
      }),
    ]);
    const repositorioPuntos = new RepositorioTransaccionesPuntosIndexedDB({
      fabricaIndexedDB: entorno.fabrica,
      nombreBaseDatos: entorno.nombre,
    });
    const billeteraRecargada = await new CasoDeUsoConsultarBilletera(
      repositorioPuntos,
    ).ejecutar();
    expect(billeteraRecargada).toMatchObject({
      saldo: 2,
      movimientos: [{ fuente: { id: "bloque-1" } }],
    });
    await repositorioPuntos.cerrar();
  });

  it("reintenta de forma idempotente sin generar otro ingreso", async () => {
    const entorno = await crearEntorno("cumplimiento-idempotente", [
      crearBloque("bloque-1", 30),
    ]);
    const caso = entorno.crearCaso(["ingreso-unico"]);
    const comando = {
      bloqueId: "bloque-1",
      operacionId: "operacion-idempotente",
    };

    await caso.ejecutar(comando);
    const reintento = await caso.ejecutar(comando);

    expect(reintento).toMatchObject({
      exito: true,
      cumplimiento: {
        puntosAcreditados: 1,
        reintentoIdempotente: true,
      },
    });
    await expect(
      listarIngresos(entorno.fabrica, entorno.nombre),
    ).resolves.toHaveLength(1);
  });

  it("aborta la resolución si el ingreso viola una restricción", async () => {
    const entorno = await crearEntorno("cumplimiento-rollback", [
      crearBloque("bloque-1", 30),
      crearBloque("bloque-2", 60),
    ]);
    await entorno.crearCaso(["ingreso-repetido"]).ejecutar({
      bloqueId: "bloque-1",
      operacionId: "operacion-1",
    });

    const rechazado = await entorno.crearCaso(["ingreso-repetido"]).ejecutar({
      bloqueId: "bloque-2",
      operacionId: "operacion-2",
    });

    expect(rechazado).toMatchObject({
      exito: false,
      error: { codigo: "CONFLICTO_ACREDITACION_PUNTOS" },
    });
    await expect(
      entorno.resoluciones.obtenerPorBloqueId("bloque-2"),
    ).resolves.toBeUndefined();
    await expect(
      listarIngresos(entorno.fabrica, entorno.nombre),
    ).resolves.toHaveLength(1);
  });

  it("reconcilia reintentos concurrentes sin duplicar hechos", async () => {
    const entorno = await crearEntorno("cumplimiento-concurrente", [
      crearBloque("bloque-1", 60),
    ]);
    const caso = entorno.crearCaso(["ingreso-a", "ingreso-b"]);
    const comando = {
      bloqueId: "bloque-1",
      operacionId: "operacion-concurrente",
    };

    const resultados = await Promise.all([
      caso.ejecutar(comando),
      caso.ejecutar(comando),
    ]);

    expect(resultados.every((resultado) => resultado.exito)).toBe(true);
    expect(
      resultados.filter(
        (resultado) =>
          resultado.exito && resultado.cumplimiento.reintentoIdempotente,
      ),
    ).toHaveLength(1);
    await expect(entorno.resoluciones.listar()).resolves.toHaveLength(1);
    await expect(
      listarIngresos(entorno.fabrica, entorno.nombre),
    ).resolves.toHaveLength(1);
  });
});

async function crearEntorno(nombre: string, bloques: BloquePlanificacion[]) {
  const fabrica = new IDBFactory();
  const configuracion = { fabricaIndexedDB: fabrica, nombreBaseDatos: nombre };
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  const resoluciones = new RepositorioResolucionesBloquesPlanificacionIndexedDB(
    configuracion,
  );
  const transaccion = new TransaccionCompletarBloqueConPuntosIndexedDB(
    configuracion,
  );
  const corte = CortePlanificacion.crear({
    id: "corte-1",
    bloques,
    creadoEn: new Date("2026-07-20T10:00:00.000Z"),
  });
  corte.iniciarRevision();
  corte.asignar(new Date("2026-07-20T10:00:00.000Z"));
  corte.actualizarSegunReloj(new Date("2026-07-20T10:10:00.000Z"));
  await cortes.guardar(corte);
  return {
    fabrica,
    nombre,
    resoluciones,
    crearCaso: (idsTransacciones: readonly string[]) =>
      new CasoDeUsoCompletarBloqueConPuntos(
        cortes,
        resoluciones,
        transaccion,
        new RelojFijo(RESUELTO_EN),
        new GeneradorIdentificadoresPredefinidos(idsTransacciones),
        new FormulaPuntosBloque(),
      ),
  };
}

function crearBloque(id: string, minutosPlanificados: number) {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-libre",
    actividadId: `actividad-${id}`,
    titulo: `Trabajo ${id}`,
    fecha: FechaLocal.crear("2026-07-20"),
    minutosPlanificados,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["REPROGRAMAR"],
    }),
    creadoEn: new Date("2026-07-20T09:00:00.000Z"),
  });
}

function listarIngresos(
  fabrica: IDBFactory,
  nombreBaseDatos: string,
): Promise<readonly TransaccionPuntosV1[]> {
  return new Promise((resolve, reject) => {
    const apertura = fabrica.open(nombreBaseDatos, VERSION_BASE_DATOS);
    apertura.onupgradeneeded = () => asegurarAlmacenes(apertura.result);
    apertura.onerror = () =>
      reject(
        apertura.error ?? new Error("No fue posible abrir la base de prueba."),
      );
    apertura.onsuccess = () => {
      const baseDatos = apertura.result;
      const transaccion = baseDatos.transaction(
        ALMACEN_TRANSACCIONES_PUNTOS,
        "readonly",
      );
      const solicitud = transaccion
        .objectStore(ALMACEN_TRANSACCIONES_PUNTOS)
        .getAll();
      transaccion.oncomplete = () => {
        baseDatos.close();
        resolve(solicitud.result as readonly TransaccionPuntosV1[]);
      };
      transaccion.onabort = () => {
        baseDatos.close();
        reject(
          transaccion.error ??
            new Error("No fue posible leer los ingresos de prueba."),
        );
      };
    };
  });
}
