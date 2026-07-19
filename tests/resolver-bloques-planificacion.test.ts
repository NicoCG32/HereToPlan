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
  ResolucionBloquePlanificacion,
} from "../src/dominio";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import { RepositorioResolucionesBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioResolucionesBloquesPlanificacionEnMemoria";
import { RelojFijo } from "./doblesAplicacion";

const ASIGNADA_EN = new Date("2026-07-20T10:00:00.000Z");
const CONFIRMADA_EN = new Date("2026-07-20T10:10:00.000Z");
const RESUELTA_EN = new Date("2026-07-20T11:00:00.000Z");

describe("resolución manual de bloques confirmados", () => {
  it("completa un bloque pendiente usando el instante del reloj", async () => {
    const entorno = await crearEntorno("CONFIRMADA");

    const resultado = await entorno.completar.ejecutar({
      bloqueId: "bloque-1",
      operacionId: "operacion-completar-1",
    });

    expect(resultado).toEqual({
      exito: true,
      resolucion: {
        bloqueId: "bloque-1",
        operacionId: "operacion-completar-1",
        resultado: "COMPLETADO",
        resueltoEn: RESUELTA_EN.toISOString(),
        reintentoIdempotente: false,
      },
    });
    await expect(entorno.resoluciones.listar()).resolves.toHaveLength(1);
  });

  it("marca incumplido sin producir otro efecto de dominio", async () => {
    const entorno = await crearEntorno("CONFIRMADA");

    await expect(
      entorno.incumplir.ejecutar({
        bloqueId: "bloque-1",
        operacionId: "operacion-incumplir-1",
      }),
    ).resolves.toMatchObject({
      exito: true,
      resolucion: {
        resultado: "INCUMPLIDO",
        reintentoIdempotente: false,
      },
    });
    await expect(
      entorno.resoluciones.obtenerPorBloqueId("bloque-1"),
    ).resolves.toMatchObject({ resultado: "INCUMPLIDO" });
  });

  it("rechaza bloques que todavía no pertenecen a un corte confirmado", async () => {
    const entorno = await crearEntorno("EN_GRACIA");

    await expect(
      entorno.completar.ejecutar({
        bloqueId: "bloque-1",
        operacionId: "operacion-anticipada",
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_NO_CONFIRMADO", campo: "bloqueId" },
    });
    await expect(entorno.resoluciones.listar()).resolves.toHaveLength(0);
  });

  it("devuelve la resolución original al repetir exactamente la misma operación", async () => {
    const entorno = await crearEntorno("CONFIRMADA");
    const comando = {
      bloqueId: "bloque-1",
      operacionId: "operacion-idempotente",
    };
    const primera = await entorno.completar.ejecutar(comando);
    entorno.reloj.establecer(new Date("2026-07-21T12:00:00.000Z"));

    const repetida = await entorno.completar.ejecutar(comando);

    expect(primera).toMatchObject({
      exito: true,
      resolucion: { reintentoIdempotente: false },
    });
    expect(repetida).toEqual({
      exito: true,
      resolucion: {
        bloqueId: "bloque-1",
        operacionId: "operacion-idempotente",
        resultado: "COMPLETADO",
        resueltoEn: RESUELTA_EN.toISOString(),
        reintentoIdempotente: true,
      },
    });
    await expect(entorno.resoluciones.listar()).resolves.toHaveLength(1);
  });

  it("rechaza otra operación sobre un bloque ya resuelto", async () => {
    const entorno = await crearEntorno("CONFIRMADA");
    await entorno.completar.ejecutar({
      bloqueId: "bloque-1",
      operacionId: "operacion-original",
    });

    await expect(
      entorno.incumplir.ejecutar({
        bloqueId: "bloque-1",
        operacionId: "operacion-distinta",
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_YA_RESUELTO", campo: "bloqueId" },
    });
    await expect(entorno.resoluciones.listar()).resolves.toHaveLength(1);
  });

  it("rechaza reutilizar una operación para otro bloque o resultado", async () => {
    const entorno = await crearEntorno("CONFIRMADA");
    await entorno.completar.ejecutar({
      bloqueId: "bloque-1",
      operacionId: "operacion-no-reutilizable",
    });

    for (const comando of [
      { bloqueId: "bloque-2", resultado: "completar" },
      { bloqueId: "bloque-1", resultado: "incumplir" },
    ] as const) {
      const casoDeUso =
        comando.resultado === "completar"
          ? entorno.completar
          : entorno.incumplir;
      await expect(
        casoDeUso.ejecutar({
          bloqueId: comando.bloqueId,
          operacionId: "operacion-no-reutilizable",
        }),
      ).resolves.toMatchObject({
        exito: false,
        error: {
          codigo: "OPERACION_RESOLUCION_EN_CONFLICTO",
          campo: "operacionId",
        },
      });
    }
  });

  it("reconcilia reintentos concurrentes sin duplicar la resolución", async () => {
    const entorno = await crearEntorno("CONFIRMADA");
    const comando = {
      bloqueId: "bloque-1",
      operacionId: "operacion-concurrente",
    };

    const resultados = await Promise.all([
      entorno.completar.ejecutar(comando),
      entorno.completar.ejecutar(comando),
    ]);

    expect(resultados.every((resultado) => resultado.exito)).toBe(true);
    expect(
      resultados.filter(
        (resultado) =>
          resultado.exito && resultado.resolucion.reintentoIdempotente,
      ),
    ).toHaveLength(1);
    await expect(entorno.resoluciones.listar()).resolves.toHaveLength(1);
  });

  it("rechaza identificadores inválidos y bloques inexistentes sin persistir", async () => {
    const entorno = await crearEntorno("CONFIRMADA");

    await expect(
      entorno.completar.ejecutar({ bloqueId: " ", operacionId: "operacion" }),
    ).resolves.toMatchObject({ exito: false, error: { campo: "bloqueId" } });
    await expect(
      entorno.completar.ejecutar({
        bloqueId: "bloque-ausente",
        operacionId: "operacion-ausente",
      }),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_PLANIFICACION_NO_ENCONTRADO" },
    });
    await expect(entorno.resoluciones.listar()).resolves.toHaveLength(0);
  });

  it("protege las invariantes al rehidratar una resolución", () => {
    expect(
      () =>
        new ResolucionBloquePlanificacion({
          bloqueId: "bloque-1",
          operacionId: "operacion-1",
          resultado: "DESCONOCIDO" as "COMPLETADO",
          resueltoEn: RESUELTA_EN,
        }),
    ).toThrowError(/COMPLETADO o INCUMPLIDO/);
  });
});

async function crearEntorno(estado: "EN_GRACIA" | "CONFIRMADA") {
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  const resoluciones =
    new RepositorioResolucionesBloquesPlanificacionEnMemoria();
  const reloj = new RelojFijo(RESUELTA_EN);
  const bloques = [crearBloque("bloque-1"), crearBloque("bloque-2")];
  const corte = CortePlanificacion.crear({
    id: "corte-1",
    bloques,
    creadoEn: new Date("2026-07-20T09:00:00.000Z"),
  });
  corte.iniciarRevision();
  corte.asignar(ASIGNADA_EN);
  if (estado === "CONFIRMADA") corte.actualizarSegunReloj(CONFIRMADA_EN);
  await cortes.guardar(corte);
  return {
    cortes,
    resoluciones,
    reloj,
    completar: new CasoDeUsoCompletarBloquePlanificacion(
      cortes,
      resoluciones,
      reloj,
    ),
    incumplir: new CasoDeUsoMarcarBloqueIncumplido(cortes, resoluciones, reloj),
  };
}

function crearBloque(id: string): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-libre",
    actividadId: `actividad-${id}`,
    titulo: `Trabajo ${id}`,
    fecha: FechaLocal.crear("2026-07-20"),
    minutosPlanificados: 45,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["REPROGRAMAR"],
    }),
    creadoEn: new Date("2026-07-20T09:00:00.000Z"),
  });
}
