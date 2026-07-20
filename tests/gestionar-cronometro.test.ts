import { describe, expect, it } from "vitest";
import {
  CasoDeUsoConsultarCronometroBloque,
  CasoDeUsoGestionarSesionCronometro,
  ErrorGestionSesionCronometro,
} from "../src/aplicacion";
import {
  BloquePlanificacion,
  CortePlanificacion,
  FechaLocal,
  PoliticaCompromiso,
} from "../src/dominio";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import { RepositorioResolucionesBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioResolucionesBloquesPlanificacionEnMemoria";
import { RepositorioSesionesCronometroEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioSesionesCronometroEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const inicio = new Date("2026-07-20T10:00:00.000Z");

describe("gestión del cronómetro", () => {
  it("inicia, pausa, recupera, reanuda y detiene sin resolver el bloque", async () => {
    const entorno = await crearEntorno();
    const inicioComando = {
      tipo: "INICIAR" as const,
      operacionId: "operacion-iniciar",
      bloqueId: "bloque-1",
    };

    const iniciado = await entorno.gestionar.ejecutar(inicioComando);
    const reintentoInicio = await entorno.gestionar.ejecutar(inicioComando);
    expect(iniciado).toMatchObject({
      sesion: { id: "sesion-1", estado: "ACTIVA" },
      reintentoIdempotente: false,
    });
    expect(reintentoInicio.reintentoIdempotente).toBe(true);

    entorno.reloj.establecer(new Date("2026-07-20T10:10:00.000Z"));
    await entorno.gestionar.ejecutar({
      tipo: "PAUSAR",
      operacionId: "operacion-pausar",
      sesionId: "sesion-1",
    });
    const casoRecuperado = new CasoDeUsoGestionarSesionCronometro(
      entorno.dependencias,
    );
    entorno.reloj.establecer(new Date("2026-07-20T10:30:00.000Z"));
    await casoRecuperado.ejecutar({
      tipo: "REANUDAR",
      operacionId: "operacion-reanudar",
      sesionId: "sesion-1",
    });
    entorno.reloj.establecer(new Date("2026-07-20T10:50:00.000Z"));
    const detenido = await casoRecuperado.ejecutar({
      tipo: "DETENER",
      operacionId: "operacion-detener",
      sesionId: "sesion-1",
    });

    expect(detenido.sesion).toMatchObject({
      estado: "FINALIZADA",
      duracionMilisegundos: 30 * 60 * 1000,
    });
    await expect(entorno.resoluciones.listar()).resolves.toEqual([]);
    const consulta = await entorno.consultar.ejecutar("bloque-1");
    expect(consulta.sesionAbierta).toBeUndefined();
    expect(consulta.duracionTotalMilisegundos).toBe(30 * 60 * 1000);
  });

  it("rechaza bloques sin confirmar y una segunda sesión abierta", async () => {
    const entorno = await crearEntorno();
    await entorno.gestionar.ejecutar({
      tipo: "INICIAR",
      operacionId: "operacion-iniciar",
      bloqueId: "bloque-1",
    });

    await esperarError("SESION_ABIERTA_EN_OTRO_BLOQUE", () =>
      entorno.gestionar.ejecutar({
        tipo: "INICIAR",
        operacionId: "operacion-otra",
        bloqueId: "bloque-1",
      }),
    );
    await esperarError("BLOQUE_NO_CONFIRMADO", () =>
      entorno.gestionar.ejecutar({
        tipo: "INICIAR",
        operacionId: "operacion-borrador",
        bloqueId: "bloque-borrador",
      }),
    );
  });
});

async function crearEntorno() {
  const sesiones = new RepositorioSesionesCronometroEnMemoria();
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  const resoluciones =
    new RepositorioResolucionesBloquesPlanificacionEnMemoria();
  const reloj = new RelojFijo(inicio);
  const bloque = crearBloque("bloque-1");
  const corte = CortePlanificacion.crear({
    id: "corte-1",
    bloques: [bloque],
    creadoEn: new Date("2026-07-20T09:00:00.000Z"),
  });
  corte.iniciarRevision();
  corte.asignar(new Date("2026-07-20T09:00:00.000Z"));
  corte.actualizarSegunReloj(new Date("2026-07-20T09:10:00.000Z"));
  await cortes.guardar(corte);
  const dependencias = {
    repositorioSesiones: sesiones,
    repositorioCortes: cortes,
    repositorioResoluciones: resoluciones,
    repositorioAjustes: { listarAjustes: () => Promise.resolve([]) },
    reloj,
    generadorIdentificadores: new GeneradorIdentificadoresPredefinidos([
      "sesion-1",
      "sesion-2",
    ]),
  };
  return {
    dependencias,
    reloj,
    resoluciones,
    gestionar: new CasoDeUsoGestionarSesionCronometro(dependencias),
    consultar: new CasoDeUsoConsultarCronometroBloque(sesiones, reloj),
  };
}

function crearBloque(id: string): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-1",
    actividadId: "actividad-1",
    titulo: "Escribir informe",
    fecha: FechaLocal.crear("2026-07-20"),
    minutosPlanificados: 60,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["EXCUSAR"],
    }),
    creadoEn: new Date("2026-07-20T08:00:00.000Z"),
  });
}

async function esperarError(
  codigo: ErrorGestionSesionCronometro["codigo"],
  operacion: () => Promise<unknown>,
): Promise<void> {
  try {
    await operacion();
    throw new Error(`Se esperaba ${codigo}.`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ErrorGestionSesionCronometro);
    expect((error as ErrorGestionSesionCronometro).codigo).toBe(codigo);
  }
}
