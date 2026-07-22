import { describe, expect, it, vi } from "vitest";
import {
  CasoDeUsoConsultarImpactoReinicioPlanificacion,
  CasoDeUsoReiniciarPlanificacion,
  ErrorConfirmacionReinicioPlanificacion,
} from "../src/aplicacion";
import { UnidadTrabajoReinicioPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/UnidadTrabajoReinicioPlanificacionEnMemoria";
import { crearEstadoReinicio } from "./datosReinicio";

describe("reinicio de planificación en memoria", () => {
  it("consulta el impacto sin escribir y clasifica eliminación, transformación y conservación", async () => {
    const estado = crearEstadoReinicio();
    const antes = JSON.stringify(estado);
    const unidad = new UnidadTrabajoReinicioPlanificacionEnMemoria(estado);

    const impacto = await new CasoDeUsoConsultarImpactoReinicioPlanificacion(
      unidad,
    ).ejecutar();

    expect(impacto.eliminar).toEqual({
      agendasActivas: 1,
      bloquesAgendaPendientes: 1,
      bloquesPlanificacionActivos: 1,
      cortesActivos: 1,
      sesionesAbiertas: 1,
    });
    expect(impacto.conservar).toMatchObject({
      actividades: 2,
      contextos: 2,
      bloquesHistoricos: 1,
      cortesHistoricos: 1,
      sesionesFinalizadas: 1,
      resoluciones: 1,
      movimientosPuntos: 1,
      recompensasAdquiridas: 1,
      aplicacionesRecompensas: 1,
      perfil: 1,
    });
    expect(JSON.stringify(unidad.leerEstado())).toBe(antes);
  });

  it("exige confirmación y publica sólo el subconjunto autorizado", async () => {
    const unidad = new UnidadTrabajoReinicioPlanificacionEnMemoria(
      crearEstadoReinicio(),
    );
    const impacto = await unidad.consultarImpacto();
    const casoDeUso = new CasoDeUsoReiniciarPlanificacion(unidad);

    expect(() =>
      casoDeUso.ejecutar({
        impacto,
        operacionId: "reinicio-1",
        confirmacion: "reiniciar",
      }),
    ).toThrowError(ErrorConfirmacionReinicioPlanificacion);

    const resultado = await casoDeUso.ejecutar({
      impacto,
      operacionId: "reinicio-1",
      confirmacion: "REINICIAR",
    });
    const colecciones = unidad.leerEstado().colecciones;

    expect(resultado).toMatchObject({
      operacionId: "reinicio-1",
      yaReiniciada: false,
    });
    expect(colecciones["bloques-planificacion"]).toMatchObject([
      { id: "bloque-historico" },
    ]);
    expect(colecciones["cortes-planificacion"]).toMatchObject([
      { id: "corte-historico", bloques: [{ id: "bloque-historico" }] },
    ]);
    expect(colecciones["sesiones-cronometro"]).toMatchObject([
      { id: "sesion-finalizada", estado: "FINALIZADA" },
    ]);
    expect(colecciones.agendas).toMatchObject([
      {
        id: "agenda-historica",
        bloques: [{ id: "bloque-agenda-historico" }],
      },
    ]);
    expect(colecciones.actividades).toHaveLength(2);
    expect(colecciones["perfil-usuario"]).toHaveLength(1);
    expect(colecciones["transacciones-puntos"]).toHaveLength(1);
    expect(colecciones["recompensas-adquiridas"]).toHaveLength(1);
    expect(colecciones["aplicaciones-recompensas"]).toHaveLength(1);
  });

  it("es idempotente ante reintentos y serializa órdenes concurrentes", async () => {
    const unidad = new UnidadTrabajoReinicioPlanificacionEnMemoria(
      crearEstadoReinicio(),
    );
    const impacto = await unidad.consultarImpacto();

    const [primero, segundo] = await Promise.all([
      unidad.reiniciar({
        operacionId: "reinicio-1",
        huellaEsperada: impacto.huella,
      }),
      unidad.reiniciar({
        operacionId: "reinicio-2",
        huellaEsperada: impacto.huella,
      }),
    ]);

    expect([primero.yaReiniciada, segundo.yaReiniciada].sort()).toEqual([
      false,
      true,
    ]);
    expect((await unidad.consultarImpacto()).totalEliminaciones).toBe(0);
  });

  it("conserva el estado completo cuando falla antes de publicar", async () => {
    const estado = crearEstadoReinicio();
    const fallo = vi.fn(() => {
      throw new Error("fallo simulado");
    });
    const unidad = new UnidadTrabajoReinicioPlanificacionEnMemoria(estado, {
      antesDePublicar: fallo,
    });
    const impacto = await unidad.consultarImpacto();

    await expect(
      unidad.reiniciar({
        operacionId: "reinicio-fallido",
        huellaEsperada: impacto.huella,
      }),
    ).rejects.toThrow("fallo simulado");
    expect(fallo).toHaveBeenCalledOnce();
    expect(unidad.leerEstado()).toEqual(estado);
  });
});
