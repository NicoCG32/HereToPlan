import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  CasoDeUsoAdquirirRecompensa,
  CasoDeUsoConsultarCatalogoRecompensas,
  CasoDeUsoConsultarInventarioRecompensas,
} from "../src/aplicacion";
import {
  AplicacionRecompensa,
  AjusteCompromiso,
  BilleteraPuntos,
  FechaLocal,
  RecompensaAdquirida,
  RecompensaDefinida,
  TransaccionPuntos,
} from "../src/dominio";
import { UnidadTrabajoAdquisicionRecompensaIndexedDB } from "../src/infraestructura/persistencia/indexeddb/UnidadTrabajoAdquisicionRecompensaIndexedDB";
import { RepositorioTransaccionesPuntosIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioTransaccionesPuntosIndexedDB";
import {
  convertirAplicacionRecompensaEnV1,
  rehidratarAplicacionRecompensaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorAplicacionRecompensaV1";
import {
  convertirRecompensaAdquiridaEnV1,
  rehidratarRecompensaAdquiridaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorRecompensaAdquiridaV1";
import { UnidadTrabajoAdquisicionRecompensaEnMemoria } from "../src/infraestructura/persistencia/memoria/UnidadTrabajoAdquisicionRecompensaEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const instante = new Date("2026-07-21T12:00:00.000Z");

describe("inventario de recompensas", () => {
  it("distingue una unidad disponible de una consumida y rehidrata su aplicación", () => {
    const disponible = new RecompensaAdquirida({
      id: "unidad-1",
      recompensaId: "dia-libre",
      puntosGastados: 3,
      adquiridaEn: instante,
    });
    const consumida = new RecompensaAdquirida({
      id: "unidad-2",
      recompensaId: "dia-libre",
      puntosGastados: 3,
      adquiridaEn: instante,
      aplicacionId: "aplicacion-1",
      consumidaEn: new Date("2026-07-22T12:00:00.000Z"),
    });
    const aplicacion = new AplicacionRecompensa({
      id: "aplicacion-1",
      recompensaAdquiridaId: consumida.id,
      recompensaId: "dia-libre",
      puntosGastados: 3,
      aplicadaEn: new Date("2026-07-22T12:00:00.000Z"),
      fechaObjetivo: FechaLocal.crear("2026-07-23"),
      bloquesAfectados: ["bloque-1"],
    });

    expect(disponible.estado).toBe("DISPONIBLE");
    expect(consumida.estado).toBe("CONSUMIDA");
    const aplicada = disponible.consumir(
      "aplicacion-nueva",
      new Date("2026-07-22T12:00:00.000Z"),
    );
    expect(
      aplicada.consumir(
        "aplicacion-nueva",
        new Date("2026-07-22T12:00:00.000Z"),
      ),
    ).toBe(aplicada);
    expect(() =>
      aplicada.consumir(
        "otra-aplicacion",
        new Date("2026-07-22T12:00:00.000Z"),
      ),
    ).toThrow("ya fue consumida");
    expect(
      convertirRecompensaAdquiridaEnV1(
        rehidratarRecompensaAdquiridaDesdeV1(
          convertirRecompensaAdquiridaEnV1(consumida),
        ),
      ),
    ).toEqual(convertirRecompensaAdquiridaEnV1(consumida));
    expect(
      convertirAplicacionRecompensaEnV1(
        rehidratarAplicacionRecompensaDesdeV1(
          convertirAplicacionRecompensaEnV1(aplicacion),
        ),
      ),
    ).toEqual(convertirAplicacionRecompensaEnV1(aplicacion));
    expect(
      () =>
        new RecompensaAdquirida({
          id: "incoherente",
          recompensaId: "dia-libre",
          puntosGastados: 3,
          adquiridaEn: instante,
          aplicacionId: "sin-fecha",
        }),
    ).toThrow("conjuntamente");
  });

  it("adquiere una unidad una sola vez y deriva el saldo desde movimientos", async () => {
    const unidad = new UnidadTrabajoAdquisicionRecompensaEnMemoria();
    await unidad.guardar(crearIngreso("ingreso-1", 5));
    const definiciones = [crearDefinicion()];
    const caso = new CasoDeUsoAdquirirRecompensa({
      definiciones,
      repositorioInventario: unidad,
      repositorioTransacciones: unidad,
      unidadTrabajo: unidad,
      reloj: new RelojFijo(instante),
      generadorIdentificadores: new GeneradorIdentificadoresPredefinidos([
        "movimiento-1",
      ]),
    });

    const primero = await caso.ejecutar({
      operacionId: "unidad-1",
      recompensaId: "dia-libre",
    });
    const reintento = await caso.ejecutar({
      operacionId: "unidad-1",
      recompensaId: "dia-libre",
    });
    const catalogo = await new CasoDeUsoConsultarCatalogoRecompensas(
      definiciones,
      unidad,
    ).ejecutar();
    const inventario = await new CasoDeUsoConsultarInventarioRecompensas(
      definiciones,
      unidad,
    ).ejecutar();

    expect(primero).toMatchObject({
      movimientoId: "movimiento-1",
      saldoPosterior: 2,
      reintentoIdempotente: false,
      recompensa: { id: "unidad-1", estado: "DISPONIBLE" },
    });
    expect(reintento.reintentoIdempotente).toBe(true);
    expect(await unidad.listarAdquiridas()).toHaveLength(1);
    expect(await unidad.listar()).toHaveLength(2);
    expect(BilleteraPuntos.rehidratar(await unidad.listar()).saldo).toBe(2);
    expect(catalogo[0]).toMatchObject({
      saldoActual: 2,
      puedeAdquirir: false,
      motivoNoDisponible: "Necesitas 1 puntos adicionales.",
    });
    expect(inventario.disponibles).toHaveLength(1);
    expect(inventario.aplicaciones).toHaveLength(0);
  });

  it("rechaza saldo insuficiente sin crear gasto ni unidad", async () => {
    const unidad = new UnidadTrabajoAdquisicionRecompensaEnMemoria();
    const caso = new CasoDeUsoAdquirirRecompensa({
      definiciones: [crearDefinicion()],
      repositorioInventario: unidad,
      repositorioTransacciones: unidad,
      unidadTrabajo: unidad,
      reloj: new RelojFijo(instante),
      generadorIdentificadores: new GeneradorIdentificadoresPredefinidos([
        "movimiento-no-persistido",
      ]),
    });

    await expect(
      caso.ejecutar({ operacionId: "unidad-1", recompensaId: "dia-libre" }),
    ).rejects.toMatchObject({ codigo: "SALDO_INSUFICIENTE" });
    await expect(unidad.listarAdquiridas()).resolves.toHaveLength(0);
    await expect(unidad.listar()).resolves.toHaveLength(0);
  });

  it("serializa adquisiciones concurrentes y sólo una consume el saldo", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const configuracion = {
      fabricaIndexedDB,
      nombreBaseDatos: "inventario-concurrente",
    };
    const transacciones = new RepositorioTransaccionesPuntosIndexedDB(
      configuracion,
    );
    await transacciones.guardar(crearIngreso("ingreso-1", 3));
    const unidadA = new UnidadTrabajoAdquisicionRecompensaIndexedDB(
      configuracion,
    );
    const unidadB = new UnidadTrabajoAdquisicionRecompensaIndexedDB(
      configuracion,
    );
    const resultados = await Promise.allSettled([
      unidadA.confirmarAdquisicion(
        crearAdquirida("unidad-a"),
        crearGasto("gasto-a", "unidad-a"),
      ),
      unidadB.confirmarAdquisicion(
        crearAdquirida("unidad-b"),
        crearGasto("gasto-b", "unidad-b"),
      ),
    ]);

    expect(
      resultados.filter((resultado) => resultado.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      resultados.filter((resultado) => resultado.status === "rejected"),
    ).toHaveLength(1);
    expect(await unidadA.listarAdquiridas()).toHaveLength(1);
    expect(BilleteraPuntos.rehidratar(await transacciones.listar()).saldo).toBe(
      0,
    );
    await Promise.all([
      unidadA.cerrar(),
      unidadB.cerrar(),
      transacciones.cerrar(),
    ]);
  });

  it("migra un canje V1 como unidad consumida y aplicación histórica", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const nombreBaseDatos = "inventario-migracion";
    const baseAnterior = await abrirBaseAnterior(
      fabricaIndexedDB,
      nombreBaseDatos,
    );
    baseAnterior.close();
    const inventario = new UnidadTrabajoAdquisicionRecompensaIndexedDB({
      fabricaIndexedDB,
      nombreBaseDatos,
    });

    await expect(inventario.listarAdquiridas()).resolves.toMatchObject([
      {
        id: "canje-historico",
        estado: "CONSUMIDA",
        aplicacionId: "canje-historico",
        puntosGastados: 3,
      },
    ]);
    await expect(inventario.listarAplicaciones()).resolves.toMatchObject([
      {
        id: "canje-historico",
        recompensaAdquiridaId: "canje-historico",
        puntosGastados: 3,
      },
    ]);
    await inventario.cerrar();
  });

  it("confirma aplicación, consumo y ajustes atómicamente en IndexedDB", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const configuracion = {
      fabricaIndexedDB,
      nombreBaseDatos: "inventario-aplicacion",
    };
    const transacciones = new RepositorioTransaccionesPuntosIndexedDB(
      configuracion,
    );
    await transacciones.guardar(crearIngreso("ingreso-aplicacion", 3));
    const inventario = new UnidadTrabajoAdquisicionRecompensaIndexedDB(
      configuracion,
    );
    const adquirida = crearAdquirida("unidad-aplicable");
    await inventario.confirmarAdquisicion(
      adquirida,
      crearGasto("gasto-aplicacion", adquirida.id),
    );
    const aplicadaEn = new Date("2026-07-22T12:00:00.000Z");
    const aplicacion = new AplicacionRecompensa({
      id: "aplicacion-indexeddb",
      recompensaAdquiridaId: adquirida.id,
      recompensaId: adquirida.recompensaId,
      puntosGastados: adquirida.puntosGastados,
      aplicadaEn,
      fechaObjetivo: FechaLocal.crear("2026-07-23"),
      bloquesAfectados: ["bloque-aplicable"],
    });
    const ajuste = new AjusteCompromiso({
      id: "ajuste-indexeddb",
      bloqueId: "bloque-aplicable",
      canjeRecompensaId: aplicacion.id,
      tipo: "EXCUSAR",
      aplicadoEn: aplicadaEn,
    });

    await inventario.confirmarAplicacion(
      adquirida.consumir(aplicacion.id, aplicadaEn),
      aplicacion,
      [ajuste],
    );

    await expect(
      inventario.obtenerAdquiridaPorId(adquirida.id),
    ).resolves.toMatchObject({
      estado: "CONSUMIDA",
      aplicacionId: aplicacion.id,
    });
    await expect(
      inventario.obtenerAplicacionPorId(aplicacion.id),
    ).resolves.toMatchObject({ recompensaAdquiridaId: adquirida.id });
    const conflicto = new AplicacionRecompensa({
      id: "aplicacion-conflictiva",
      recompensaAdquiridaId: adquirida.id,
      recompensaId: adquirida.recompensaId,
      puntosGastados: adquirida.puntosGastados,
      aplicadaEn,
      fechaObjetivo: FechaLocal.crear("2026-07-24"),
      bloquesAfectados: ["otro-bloque"],
    });
    await expect(
      inventario.confirmarAplicacion(
        adquirida.consumir(conflicto.id, aplicadaEn),
        conflicto,
        [
          new AjusteCompromiso({
            id: "otro-ajuste",
            bloqueId: "otro-bloque",
            canjeRecompensaId: conflicto.id,
            tipo: "EXCUSAR",
            aplicadoEn: aplicadaEn,
          }),
        ],
      ),
    ).rejects.toMatchObject({ codigo: "APLICACION_RECOMPENSA_DUPLICADA" });
    await expect(inventario.listarAplicaciones()).resolves.toHaveLength(1);
    await Promise.all([inventario.cerrar(), transacciones.cerrar()]);
  });
});

function crearDefinicion(): RecompensaDefinida {
  return new RecompensaDefinida({
    id: "dia-libre",
    nombre: "Día libre",
    descripcion: "Flexibilidad para una fecha futura.",
    costoPuntos: 3,
    tipoEfecto: "DIA_LIBRE",
  });
}

function crearIngreso(id: string, cantidad: number): TransaccionPuntos {
  return new TransaccionPuntos({
    id,
    tipo: "INGRESO",
    cantidad,
    fuenteTipo: "COMPROMISO_COMPLETADO",
    fuenteId: `bloque-${id}`,
    descripcion: "Ingreso de prueba",
    ocurridaEn: new Date("2026-07-20T12:00:00.000Z"),
  });
}

function crearAdquirida(id: string): RecompensaAdquirida {
  return new RecompensaAdquirida({
    id,
    recompensaId: "dia-libre",
    puntosGastados: 3,
    adquiridaEn: instante,
  });
}

function crearGasto(id: string, unidadId: string): TransaccionPuntos {
  return new TransaccionPuntos({
    id,
    tipo: "GASTO",
    cantidad: 3,
    fuenteTipo: "ADQUISICION_RECOMPENSA",
    fuenteId: unidadId,
    descripcion: "Adquisición de Día libre",
    ocurridaEn: instante,
  });
}

function abrirBaseAnterior(
  fabrica: IDBFactory,
  nombre: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = fabrica.open(nombre, 11);
    solicitud.onupgradeneeded = () => {
      const almacen = solicitud.result.createObjectStore("canjes-recompensas", {
        keyPath: "id",
      });
      almacen.add({
        versionEsquema: 1,
        id: "canje-historico",
        recompensaId: "dia-libre",
        puntosGastados: 3,
        canjeadoEn: instante.toISOString(),
        fechaObjetivo: "2026-07-22",
        bloquesAfectados: ["bloque-1"],
      });
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(
        solicitud.error ?? new Error("No fue posible abrir la base anterior."),
      );
  });
}
