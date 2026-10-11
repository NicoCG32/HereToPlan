import { describe, expect, it, vi } from "vitest";
import {
  CasoDeUsoAdquirirRecompensa,
  CasoDeUsoConsultarCatalogoRecompensas,
  CasoDeUsoConsultarInventarioRecompensas,
  ErrorAdquisicionRecompensaDuplicada,
  type RepositorioInventarioRecompensas,
} from "../src/aplicacion";
import {
  AplicacionRecompensa,
  FechaLocal,
  RecompensaAdquirida,
  RecompensaDefinida,
  TransaccionPuntos,
} from "../src/dominio";
import { UnidadTrabajoAdquisicionRecompensaEnMemoria } from "../src/infraestructura/persistencia/memoria/UnidadTrabajoAdquisicionRecompensaEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const instante = new Date("2026-10-10T10:00:00.000Z");
const definicion = new RecompensaDefinida({
  id: "dia-libre",
  nombre: "Día libre",
  descripcion: "Flexibilidad",
  costoPuntos: 3,
  tipoEfecto: "DIA_LIBRE",
});

function caso(
  unidad: UnidadTrabajoAdquisicionRecompensaEnMemoria,
  otras: Partial<
    ConstructorParameters<typeof CasoDeUsoAdquirirRecompensa>[0]
  > = {},
) {
  return new CasoDeUsoAdquirirRecompensa({
    definiciones: [definicion],
    repositorioInventario: unidad,
    repositorioTransacciones: unidad,
    unidadTrabajo: unidad,
    reloj: new RelojFijo(instante),
    generadorIdentificadores: new GeneradorIdentificadoresPredefinidos([
      "gasto-nuevo",
    ]),
    ...otras,
  });
}

function ingreso(): TransaccionPuntos {
  return new TransaccionPuntos({
    id: "ingreso",
    tipo: "INGRESO",
    cantidad: 9,
    fuenteTipo: "COMPROMISO_COMPLETADO",
    fuenteId: "trabajo",
    descripcion: "Cumplimiento",
    ocurridaEn: new Date("2026-10-09T10:00:00.000Z"),
  });
}

function gasto(unidadId: string): TransaccionPuntos {
  return new TransaccionPuntos({
    id: `gasto-${unidadId}`,
    tipo: "GASTO",
    cantidad: 3,
    fuenteTipo: "ADQUISICION_RECOMPENSA",
    fuenteId: unidadId,
    descripcion: "Compra",
    ocurridaEn: instante,
  });
}

function adquirida(id: string): RecompensaAdquirida {
  return new RecompensaAdquirida({
    id,
    recompensaId: definicion.id,
    puntosGastados: 3,
    adquiridaEn: instante,
  });
}

describe("reintentos y conflictos de adquisición", () => {
  it("rechaza una definición ausente sin gastar ni crear inventario", async () => {
    const unidad = new UnidadTrabajoAdquisicionRecompensaEnMemoria();
    await unidad.guardar(ingreso());
    await expect(
      caso(unidad).ejecutar({ operacionId: "unidad", recompensaId: "ausente" }),
    ).rejects.toMatchObject({ codigo: "RECOMPENSA_NO_DEFINIDA" });
    await expect(unidad.listar()).resolves.toHaveLength(1);
    await expect(unidad.listarAdquiridas()).resolves.toHaveLength(0);
  });

  it("no reutiliza una compra registrada para otra definición", async () => {
    const unidad = new UnidadTrabajoAdquisicionRecompensaEnMemoria();
    await unidad.guardar(ingreso());
    await unidad.confirmarAdquisicion(adquirida("unidad"), gasto("unidad"));
    const otra = new RecompensaDefinida({
      id: "otra",
      nombre: "Otra definición",
      descripcion: "Catálogo",
      costoPuntos: 3,
      tipoEfecto: "DIA_LIBRE",
    });
    await expect(
      caso(unidad, { definiciones: [definicion, otra] }).ejecutar({
        operacionId: "unidad",
        recompensaId: otra.id,
      }),
    ).rejects.toMatchObject({ codigo: "OPERACION_ADQUISICION_CONFLICTIVA" });
    await expect(unidad.listar()).resolves.toHaveLength(2);
    await expect(unidad.listarAdquiridas()).resolves.toHaveLength(1);
  });

  it.each(["vacío", "ingreso", "gasto de otra unidad"])(
    "no presenta una compra sin movimiento asociado: %s",
    async (estado) => {
      const unidad = new UnidadTrabajoAdquisicionRecompensaEnMemoria();
      if (estado !== "vacío") await unidad.guardar(ingreso());
      if (estado === "gasto de otra unidad")
        await unidad.confirmarAdquisicion(
          adquirida("otra-unidad"),
          gasto("otra-unidad"),
        );
      const inventario: RepositorioInventarioRecompensas = {
        obtenerAdquiridaPorId: () => Promise.resolve(adquirida("incompleta")),
        listarAdquiridas: () => Promise.resolve([adquirida("incompleta")]),
        obtenerAplicacionPorId: () => Promise.resolve(undefined),
        listarAplicaciones: () => Promise.resolve([]),
      };
      const antes = await unidad.listar();
      await expect(
        caso(unidad, { repositorioInventario: inventario }).ejecutar({
          operacionId: "incompleta",
          recompensaId: definicion.id,
        }),
      ).rejects.toMatchObject({ codigo: "OPERACION_ADQUISICION_CONFLICTIVA" });
      expect(await unidad.listar()).toEqual(antes);
    },
  );

  it("propaga un fallo técnico sin informar compra ni disminuir saldo", async () => {
    const unidad = new UnidadTrabajoAdquisicionRecompensaEnMemoria();
    await unidad.guardar(ingreso());
    const causa = new Error("Escritura no disponible");
    await expect(
      caso(unidad, {
        unidadTrabajo: {
          confirmarAdquisicion: vi.fn().mockRejectedValue(causa),
        },
      }).ejecutar({ operacionId: "unidad", recompensaId: definicion.id }),
    ).rejects.toBe(causa);
    await expect(unidad.listar()).resolves.toHaveLength(1);
    await expect(unidad.listarAdquiridas()).resolves.toHaveLength(0);
  });

  it("informa una colisión de saldo sin inventar una unidad ganadora", async () => {
    const unidad = new UnidadTrabajoAdquisicionRecompensaEnMemoria();
    await unidad.guardar(ingreso());
    await expect(
      caso(unidad, {
        unidadTrabajo: {
          confirmarAdquisicion: vi
            .fn()
            .mockRejectedValue(new ErrorAdquisicionRecompensaDuplicada()),
        },
      }).ejecutar({ operacionId: "unidad", recompensaId: definicion.id }),
    ).rejects.toMatchObject({ codigo: "OPERACION_ADQUISICION_CONFLICTIVA" });
    await expect(unidad.listar()).resolves.toHaveLength(1);
    await expect(unidad.listarAdquiridas()).resolves.toHaveLength(0);
  });

  it("recupera una compra concurrente equivalente con su gasto original", async () => {
    const unidad = new UnidadTrabajoAdquisicionRecompensaEnMemoria();
    await unidad.guardar(ingreso());
    const resultado = await caso(unidad, {
      unidadTrabajo: {
        confirmarAdquisicion: async (recompensa, movimiento) => {
          await unidad.confirmarAdquisicion(recompensa, movimiento);
          throw new ErrorAdquisicionRecompensaDuplicada();
        },
      },
    }).ejecutar({ operacionId: "unidad", recompensaId: definicion.id });
    expect(resultado).toMatchObject({
      reintentoIdempotente: true,
      movimientoId: "gasto-nuevo",
      saldoPosterior: 6,
      recompensa: { id: "unidad" },
    });
    await expect(unidad.listar()).resolves.toHaveLength(2);
    await expect(unidad.listarAdquiridas()).resolves.toHaveLength(1);
  });

  it("habilita el catálogo cuando el saldo cubre el costo", async () => {
    const unidad = new UnidadTrabajoAdquisicionRecompensaEnMemoria();
    await unidad.guardar(ingreso());
    const catalogo = await new CasoDeUsoConsultarCatalogoRecompensas(
      [definicion],
      unidad,
    ).ejecutar();
    expect(catalogo[0]).toMatchObject({ puedeAdquirir: true, saldoActual: 9 });
    expect(catalogo[0]).not.toHaveProperty("motivoNoDisponible");
  });

  it("conserva nombres históricos y orden estable al retirar una definición del catálogo", async () => {
    const crearHistorica = (id: string, fecha: string) =>
      new RecompensaAdquirida({
        id,
        recompensaId: "retirada",
        puntosGastados: 3,
        adquiridaEn: new Date(fecha),
        aplicacionId: `aplicacion-${id}`,
        consumidaEn:
          id === "b" ? instante : new Date("2026-10-11T10:00:00.000Z"),
      });
    const unidades = [
      crearHistorica("c", instante.toISOString()),
      crearHistorica("b", "2026-10-09T10:00:00.000Z"),
      crearHistorica("a", instante.toISOString()),
    ];
    const aplicaciones = unidades.map(
      (u) =>
        new AplicacionRecompensa({
          id: u.aplicacionId!,
          recompensaAdquiridaId: u.id,
          recompensaId: u.recompensaId,
          puntosGastados: 3,
          aplicadaEn:
            u.id === "b" ? instante : new Date("2026-10-11T10:00:00.000Z"),
          fechaObjetivo: FechaLocal.crear("2026-10-12"),
          bloquesAfectados: [`bloque-${u.id}`],
        }),
    );
    const repositorio: RepositorioInventarioRecompensas = {
      obtenerAdquiridaPorId: (id) =>
        Promise.resolve(unidades.find((u) => u.id === id)),
      listarAdquiridas: () => Promise.resolve(unidades),
      obtenerAplicacionPorId: (id) =>
        Promise.resolve(aplicaciones.find((a) => a.id === id)),
      listarAplicaciones: () => Promise.resolve(aplicaciones),
    };
    const inventario = await new CasoDeUsoConsultarInventarioRecompensas(
      [],
      repositorio,
    ).ejecutar();
    expect(inventario.disponibles).toHaveLength(0);
    expect(
      inventario.consumidas
        .map((u) => u.id)
        .slice(0, 2)
        .sort(),
    ).toEqual(["a", "c"]);
    expect(inventario.consumidas.at(-1)?.id).toBe("b");
    expect(inventario.aplicaciones.at(-1)?.id).toBe("aplicacion-b");
    const invertido = await new CasoDeUsoConsultarInventarioRecompensas([], {
      ...repositorio,
      listarAdquiridas: () => Promise.resolve([...unidades].reverse()),
      listarAplicaciones: () => Promise.resolve([...aplicaciones].reverse()),
    }).ejecutar();
    expect(invertido).toEqual(inventario);
    expect(
      inventario.consumidas.every((u) => u.nombre === "Recompensa histórica"),
    ).toBe(true);
    expect(
      inventario.aplicaciones.every((a) => a.nombre === "Recompensa histórica"),
    ).toBe(true);
    expect(inventario.consumidas[0]).toMatchObject({
      aplicacionId: `aplicacion-${inventario.consumidas[0]?.id}`,
      consumidaEn: "2026-10-11T10:00:00.000Z",
    });
  });
});
