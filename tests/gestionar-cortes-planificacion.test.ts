import { describe, expect, it } from "vitest";
import {
  CasoDeUsoAsignarCortePlanificacion,
  CasoDeUsoCorregirCortePlanificacion,
  CasoDeUsoRevisarCortePlanificacion,
} from "../src/aplicacion";
import {
  BloquePlanificacion,
  CortePlanificacion,
  FechaLocal,
  PoliticaCompromiso,
} from "../src/dominio";
import { RepositorioBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioBloquesPlanificacionEnMemoria";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const AHORA = new Date("2026-07-20T10:00:00.000Z");

describe("gestión de cortes de planificación", () => {
  it("rechaza selecciones vacías o duplicadas sin persistir efectos", async () => {
    const entorno = await crearEntorno();

    await expect(entorno.revisar.ejecutar({ bloqueIds: [] })).resolves.toEqual({
      exito: false,
      error: {
        codigo: "CORTE_SIN_BLOQUES",
        mensaje:
          "Selecciona al menos un bloque antes de revisar la planificación.",
        campo: "bloques",
      },
    });
    await expect(
      entorno.revisar.ejecutar({ bloqueIds: ["bloque-1", "bloque-1"] }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_CORTE_DUPLICADO" },
    });
    await expect(entorno.cortes.listar()).resolves.toHaveLength(0);
  });

  it("proyecta una revisión ordenada sin crear todavía un corte", async () => {
    const entorno = await crearEntorno();

    const resultado = await entorno.revisar.ejecutar({
      bloqueIds: ["bloque-2", "bloque-1"],
    });

    expect(resultado).toMatchObject({
      exito: true,
      revision: {
        cantidadBloques: 2,
        minutosPlanificados: 105,
        cantidadEstrictos: 1,
        cantidadFlexibles: 1,
        fechaInicio: "2026-07-20",
        fechaFin: "2026-07-21",
      },
    });
    if (resultado.exito) {
      expect(resultado.revision.bloques.map((bloque) => bloque.id)).toEqual([
        "bloque-1",
        "bloque-2",
      ]);
      expect(Object.isFrozen(resultado.revision.bloques)).toBe(true);
    }
    await expect(entorno.cortes.listar()).resolves.toHaveLength(0);
  });

  it("vuelve a validar, asigna y persiste la selección en gracia", async () => {
    const entorno = await crearEntorno();

    const resultado = await entorno.asignar.ejecutar({
      bloqueIds: ["bloque-1", "bloque-2"],
    });

    expect(resultado).toMatchObject({
      exito: true,
      corte: {
        id: "corte-1",
        estado: "EN_GRACIA",
        cantidadBloques: 2,
        asignadaEn: AHORA.toISOString(),
        confirmarAutomaticamenteEn: "2026-07-20T10:10:00.000Z",
        milisegundosRestantes: 600_000,
      },
    });
    await expect(entorno.cortes.obtenerPorId("corte-1")).resolves.toMatchObject(
      {
        estado: "EN_GRACIA",
      },
    );
  });

  it("rechaza una selección que quedó protegida después de la revisión", async () => {
    const entorno = await crearEntorno();
    await expect(
      entorno.revisar.ejecutar({ bloqueIds: ["bloque-1"] }),
    ).resolves.toMatchObject({ exito: true });
    const bloque = await entorno.bloques.obtenerPorId("bloque-1");
    const corteConcurrente = CortePlanificacion.crear({
      id: "corte-concurrente",
      bloques: [bloque!],
      creadoEn: AHORA,
    });
    corteConcurrente.iniciarRevision();
    corteConcurrente.asignar(AHORA);
    await entorno.cortes.guardar(corteConcurrente);

    await expect(
      entorno.asignar.ejecutar({ bloqueIds: ["bloque-1"] }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_PROTEGIDO_POR_CORTE" },
    });
    await expect(entorno.cortes.listar()).resolves.toHaveLength(1);
  });

  it("corrige durante la gracia y reutiliza el mismo corte tras una nueva revisión", async () => {
    const entorno = await crearEntorno();
    await entorno.asignar.ejecutar({ bloqueIds: ["bloque-1"] });
    entorno.reloj.establecer(new Date("2026-07-20T10:05:00.000Z"));

    const correccion = await entorno.corregir.ejecutar({ corteId: "corte-1" });

    expect(correccion).toMatchObject({
      exito: true,
      corte: {
        id: "corte-1",
        estado: "BORRADOR",
        bloqueIds: ["bloque-1"],
      },
    });
    if (correccion.exito) {
      expect(correccion.corte.asignadaEn).toBeUndefined();
      expect(correccion.corte.confirmarAutomaticamenteEn).toBeUndefined();
    }

    await expect(
      entorno.revisar.ejecutar({
        corteId: "corte-1",
        bloqueIds: ["bloque-2"],
      }),
    ).resolves.toMatchObject({
      exito: true,
      revision: { corteId: "corte-1" },
    });
    entorno.reloj.establecer(new Date("2026-07-20T10:06:00.000Z"));
    await expect(
      entorno.asignar.ejecutar({
        corteId: "corte-1",
        bloqueIds: ["bloque-2"],
      }),
    ).resolves.toMatchObject({
      exito: true,
      corte: {
        id: "corte-1",
        estado: "EN_GRACIA",
        bloqueIds: ["bloque-2"],
        confirmarAutomaticamenteEn: "2026-07-20T10:16:00.000Z",
      },
    });
    await expect(entorno.cortes.listar()).resolves.toHaveLength(1);
  });

  it("materializa y persiste el vencimiento antes de rechazar la corrección", async () => {
    const entorno = await crearEntorno();
    await entorno.asignar.ejecutar({ bloqueIds: ["bloque-1"] });
    entorno.reloj.establecer(new Date("2026-07-20T10:10:00.000Z"));

    await expect(
      entorno.corregir.ejecutar({ corteId: "corte-1" }),
    ).resolves.toEqual({
      exito: false,
      error: {
        codigo: "CORTE_NO_CORREGIBLE",
        mensaje:
          "El período de gracia terminó y la planificación quedó confirmada.",
        campo: "corteId",
      },
    });
    await expect(entorno.cortes.obtenerPorId("corte-1")).resolves.toMatchObject(
      {
        estado: "CONFIRMADA",
        confirmadaEn: new Date("2026-07-20T10:10:00.000Z"),
      },
    );
  });
});

async function crearEntorno() {
  const bloques = new RepositorioBloquesPlanificacionEnMemoria();
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  const reloj = new RelojFijo(AHORA);
  await bloques.guardar(crearBloque("bloque-1", "2026-07-20", 45, "FLEXIBLE"));
  await bloques.guardar(crearBloque("bloque-2", "2026-07-21", 60, "ESTRICTO"));
  return {
    bloques,
    cortes,
    reloj,
    revisar: new CasoDeUsoRevisarCortePlanificacion(bloques, cortes),
    asignar: new CasoDeUsoAsignarCortePlanificacion(
      bloques,
      cortes,
      reloj,
      new GeneradorIdentificadoresPredefinidos(["corte-1"]),
    ),
    corregir: new CasoDeUsoCorregirCortePlanificacion(cortes, reloj),
  };
}

function crearBloque(
  id: string,
  fecha: string,
  minutosPlanificados: number,
  rigidez: "ESTRICTO" | "FLEXIBLE",
): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-libre",
    actividadId: `actividad-${id}`,
    titulo: `Trabajo ${id}`,
    fecha: FechaLocal.crear(fecha),
    minutosPlanificados,
    politica: new PoliticaCompromiso({
      rigidez,
      autoridadPlazo: rigidez === "ESTRICTO" ? "EXTERNA" : "PERSONAL",
      ...(rigidez === "FLEXIBLE"
        ? { ajustesPermitidos: ["REPROGRAMAR"] as const }
        : {}),
    }),
    creadoEn: new Date("2026-07-20T09:00:00.000Z"),
  });
}
