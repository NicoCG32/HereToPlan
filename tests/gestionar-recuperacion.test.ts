import { describe, expect, it } from "vitest";
import {
  CasoDeUsoAcreditarRecuperacion,
  CasoDeUsoConsultarBancoRecuperacion,
  CasoDeUsoConsumirRecuperacion,
  ErrorGestionRecuperacion,
} from "../src/aplicacion";
import {
  BloquePlanificacion,
  CortePlanificacion,
  FechaLocal,
  PoliticaCompromiso,
  ResolucionBloquePlanificacion,
  SesionCronometro,
} from "../src/dominio";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import { RepositorioRecuperacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioRecuperacionEnMemoria";
import { RepositorioResolucionesBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioResolucionesBloquesPlanificacionEnMemoria";
import { RepositorioSesionesCronometroEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioSesionesCronometroEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

describe("casos de uso del banco de recuperación", () => {
  it("acredita sobretrabajo finalizado y permite reintentar sin duplicarlo", async () => {
    const entorno = await crearEntorno();
    const comando = { operacionId: "operacion-acreditar", bloqueId: "fuente" };

    const primero = await entorno.acreditar.ejecutar(comando);
    const repetido = await entorno.acreditar.ejecutar(comando);
    const banco = await entorno.consultar.ejecutar();

    expect(primero).toMatchObject({
      movimiento: { tipo: "ACREDITACION", minutos: 50 },
      reintentoIdempotente: false,
    });
    expect(repetido.reintentoIdempotente).toBe(true);
    expect(banco).toMatchObject({ saldoMinutos: 50, acreditables: [] });
    expect(banco.reducibles).toEqual([
      expect.objectContaining({ bloqueId: "destino", maximoReducible: 44 }),
    ]);
  });

  it("consume saldo y reduce carga futura como una operación idempotente", async () => {
    const entorno = await crearEntorno();
    await entorno.acreditar.ejecutar({
      operacionId: "operacion-acreditar",
      bloqueId: "fuente",
    });
    const comando = {
      operacionId: "operacion-consumir",
      bloqueId: "destino",
      minutos: 30,
    };

    const primero = await entorno.consumir.ejecutar(comando);
    const repetido = await entorno.consumir.ejecutar(comando);
    const banco = await entorno.consultar.ejecutar();

    expect(primero).toMatchObject({
      movimiento: { tipo: "CONSUMO", minutos: 30 },
      reintentoIdempotente: false,
    });
    expect(repetido.reintentoIdempotente).toBe(true);
    expect(banco.saldoMinutos).toBe(20);
    expect(banco.reducibles).toEqual([]);
    await expect(
      entorno.recuperacion.obtenerReduccionPorBloque("destino"),
    ).resolves.toMatchObject({ minutosReducidos: 30 });
  });

  it("usa la carga efectiva reducida al calcular un excedente posterior", async () => {
    const entorno = await crearEntorno();
    await entorno.acreditar.ejecutar({
      operacionId: "operacion-acreditar",
      bloqueId: "fuente",
    });
    await entorno.consumir.ejecutar({
      operacionId: "operacion-consumir",
      bloqueId: "destino",
      minutos: 30,
    });
    await entorno.resoluciones.guardar(
      new ResolucionBloquePlanificacion({
        bloqueId: "destino",
        operacionId: "operacion-completar-destino",
        resultado: "COMPLETADO",
        resueltoEn: new Date("2026-07-22T12:00:00.000Z"),
      }),
    );
    const sesion = SesionCronometro.iniciar({
      id: "sesion-destino",
      bloqueId: "destino",
      operacionId: "iniciar-destino",
      iniciadaEn: new Date("2026-07-22T10:00:00.000Z"),
    });
    sesion.detener("detener-destino", new Date("2026-07-22T10:45:00.000Z"));
    await entorno.sesiones.guardar(sesion, 0);

    const resultado = await entorno.acreditar.ejecutar({
      operacionId: "operacion-acreditar-destino",
      bloqueId: "destino",
    });

    expect(resultado.movimiento.minutos).toBe(15);
  });

  it("no deja una reducción parcial cuando el saldo es insuficiente", async () => {
    const entorno = await crearEntorno();
    await expect(
      entorno.consumir.ejecutar({
        operacionId: "operacion-consumir",
        bloqueId: "destino",
        minutos: 30,
      }),
    ).rejects.toMatchObject({ codigo: "SALDO_RECUPERACION_INSUFICIENTE" });
    await expect(
      entorno.recuperacion.obtenerReduccionPorBloque("destino"),
    ).resolves.toBeUndefined();
    await expect(entorno.recuperacion.listarMovimientos()).resolves.toEqual([]);
  });

  it("rechaza fuentes no completadas, destinos protegidos y operaciones conflictivas", async () => {
    const entorno = await crearEntorno();
    await esperarError("BLOQUE_NO_COMPLETADO", () =>
      entorno.acreditar.ejecutar({
        operacionId: "operacion-invalida",
        bloqueId: "destino",
      }),
    );
    await entorno.acreditar.ejecutar({
      operacionId: "operacion-acreditar",
      bloqueId: "fuente",
    });
    await esperarError("BLOQUE_NO_REDUCIBLE", () =>
      entorno.consumir.ejecutar({
        operacionId: "operacion-estricta",
        bloqueId: "estricto",
        minutos: 10,
      }),
    );
    await esperarError("OPERACION_CONFLICTIVA", () =>
      entorno.consumir.ejecutar({
        operacionId: "operacion-acreditar",
        bloqueId: "destino",
        minutos: 10,
      }),
    );
  });
});

async function crearEntorno() {
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  const resoluciones =
    new RepositorioResolucionesBloquesPlanificacionEnMemoria();
  const sesiones = new RepositorioSesionesCronometroEnMemoria();
  const ajustes = { listarAjustes: () => Promise.resolve([]) };
  const recuperacion = new RepositorioRecuperacionEnMemoria(
    resoluciones,
    ajustes,
  );
  const corte = CortePlanificacion.crear({
    id: "corte-1",
    bloques: [
      crearBloque("fuente", "2026-07-20", 60, true),
      crearBloque("destino", "2026-07-22", 45, true),
      crearBloque("estricto", "2026-07-23", 30, false),
    ],
    creadoEn: new Date("2026-07-20T08:00:00.000Z"),
  });
  corte.iniciarRevision();
  corte.asignar(new Date("2026-07-20T08:00:00.000Z"));
  corte.actualizarSegunReloj(new Date("2026-07-20T08:10:00.000Z"));
  await cortes.guardar(corte);
  await resoluciones.guardar(
    new ResolucionBloquePlanificacion({
      bloqueId: "fuente",
      operacionId: "operacion-completar",
      resultado: "COMPLETADO",
      resueltoEn: new Date("2026-07-20T12:45:00.000Z"),
    }),
  );
  const sesion = SesionCronometro.iniciar({
    id: "sesion-1",
    bloqueId: "fuente",
    operacionId: "iniciar-sesion",
    iniciadaEn: new Date("2026-07-20T10:00:00.000Z"),
  });
  sesion.detener("detener-sesion", new Date("2026-07-20T12:40:00.000Z"));
  await sesiones.guardar(sesion, 0);
  const dependencias = {
    repositorioRecuperacion: recuperacion,
    repositorioCortes: cortes,
    repositorioResoluciones: resoluciones,
    repositorioSesiones: sesiones,
    repositorioAjustes: ajustes,
    calendarioLocal: { hoy: () => FechaLocal.crear("2026-07-20") },
    reloj: new RelojFijo(new Date("2026-07-20T13:00:00.000Z")),
    generadorIdentificadores: new GeneradorIdentificadoresPredefinidos([
      "movimiento-acreditacion",
      "movimiento-consumo",
      "reduccion-1",
      "movimiento-acreditacion-destino",
    ]),
  };
  return {
    recuperacion,
    resoluciones,
    sesiones,
    consultar: new CasoDeUsoConsultarBancoRecuperacion(dependencias),
    acreditar: new CasoDeUsoAcreditarRecuperacion(dependencias),
    consumir: new CasoDeUsoConsumirRecuperacion(dependencias),
  };
}

function crearBloque(
  id: string,
  fecha: string,
  minutosPlanificados: number,
  reducible: boolean,
): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-1",
    actividadId: `actividad-${id}`,
    titulo: `Bloque ${id}`,
    fecha: FechaLocal.crear(fecha),
    minutosPlanificados,
    politica: new PoliticaCompromiso({
      rigidez: reducible ? "FLEXIBLE" : "ESTRICTO",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: reducible ? ["REDUCIR_CARGA"] : [],
    }),
    creadoEn: new Date("2026-07-20T07:00:00.000Z"),
  });
}

async function esperarError(
  codigo: ErrorGestionRecuperacion["codigo"],
  operacion: () => Promise<unknown>,
) {
  await expect(operacion()).rejects.toMatchObject({ codigo });
}
