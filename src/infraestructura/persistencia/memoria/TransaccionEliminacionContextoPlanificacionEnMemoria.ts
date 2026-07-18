import {
  ErrorContextoNoEncontrado,
  ErrorImpactoEliminacionDesactualizado,
  type ComandoTransaccionEliminacionContexto,
  type ImpactoPersistenteEliminacionContexto,
  type RepositorioAgendas,
  type RepositorioBloquesPlanificacion,
  type RepositorioContextosPlanificacion,
  type ResultadoTransaccionEliminacionContexto,
  type TransaccionEliminacionContextoPlanificacion,
} from "../../../aplicacion";
import {
  BloquePlanificacion,
  IDENTIFICADOR_CONTEXTO_LIBRE,
  PoliticaCompromiso,
  type Agenda,
} from "../../../dominio";

export class TransaccionEliminacionContextoPlanificacionEnMemoria implements TransaccionEliminacionContextoPlanificacion {
  constructor(
    private readonly contextos: RepositorioContextosPlanificacion,
    private readonly bloques: RepositorioBloquesPlanificacion,
    private readonly agendas: RepositorioAgendas,
  ) {}

  public async consultarImpacto(
    contextoId: string,
  ): Promise<ImpactoPersistenteEliminacionContexto> {
    const contexto = await this.contextos.obtenerPorId(contextoId);
    if (!contexto) throw new ErrorContextoNoEncontrado(contextoId);
    contexto.exigirEliminable();
    const [bloques, agendas] = await Promise.all([
      this.bloques.listar(),
      this.agendas.listar(),
    ]);
    return calcularImpacto(contextoId, bloques, agendas);
  }

  public async ejecutar(
    comando: ComandoTransaccionEliminacionContexto,
  ): Promise<ResultadoTransaccionEliminacionContexto> {
    const contexto = await this.contextos.obtenerPorId(comando.contextoId);
    if (!contexto) throw new ErrorContextoNoEncontrado(comando.contextoId);
    contexto.exigirEliminable();

    if (comando.estrategia === "TRASLADAR_A_LIBRE") {
      const libre = await this.contextos.obtenerPorId(
        IDENTIFICADOR_CONTEXTO_LIBRE,
      );
      if (!libre) {
        throw new Error(
          "El contexto Libre debe existir antes de trasladar la planificación.",
        );
      }
    }

    const [todosLosBloques, agendas] = await Promise.all([
      this.bloques.listar(),
      this.agendas.listar(),
    ]);
    const originales = todosLosBloques.filter(
      (bloque) => bloque.contextoId === comando.contextoId,
    );
    const impacto = calcularImpacto(
      comando.contextoId,
      todosLosBloques,
      agendas,
    );
    if (impacto.huella !== comando.huellaEsperada) {
      throw new ErrorImpactoEliminacionDesactualizado();
    }

    try {
      if (comando.estrategia === "TRASLADAR_A_LIBRE") {
        for (const bloque of originales) {
          await this.bloques.actualizar(trasladarALibre(bloque));
        }
      } else {
        for (const bloque of originales) {
          await this.bloques.eliminar(bloque.id);
        }
      }
      await this.contextos.eliminar(contexto);
    } catch (error: unknown) {
      await this.restaurar(contexto, originales, error);
    }

    return Object.freeze({
      cantidadBloquesTrasladados:
        comando.estrategia === "TRASLADAR_A_LIBRE" ? originales.length : 0,
      cantidadBloquesEliminados:
        comando.estrategia === "ELIMINAR_BORRADORES" ? originales.length : 0,
      cantidadRegistrosConfirmadosConservados:
        impacto.cantidadRegistrosConfirmados,
    });
  }

  private async restaurar(
    contexto: Awaited<
      ReturnType<RepositorioContextosPlanificacion["obtenerPorId"]>
    > & {},
    bloquesOriginales: readonly BloquePlanificacion[],
    causa: unknown,
  ): Promise<never> {
    try {
      if (!(await this.contextos.obtenerPorId(contexto.id))) {
        await this.contextos.guardar(contexto);
      }
      for (const bloque of bloquesOriginales) {
        if (await this.bloques.obtenerPorId(bloque.id)) {
          await this.bloques.actualizar(bloque);
        } else {
          await this.bloques.guardar(bloque);
        }
      }
    } catch (errorRestauracion: unknown) {
      throw new Error(
        `La eliminación falló y no fue posible restaurar completamente la planificación en memoria. Causa original: ${mensajeError(causa)}`,
        { cause: errorRestauracion },
      );
    }
    throw causa instanceof Error
      ? causa
      : new Error("La eliminación atómica de la agenda falló.", {
          cause: causa,
        });
  }
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function calcularImpacto(
  contextoId: string,
  bloques: readonly BloquePlanificacion[],
  agendas: readonly Agenda[],
): ImpactoPersistenteEliminacionContexto {
  const bloquesEditables = bloques
    .filter((bloque) => bloque.contextoId === contextoId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const agendasRelacionadas = agendas
    .filter((agenda) => agenda.id === contextoId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const bloquesHistoricos = agendasRelacionadas.flatMap((agenda) =>
    agenda.listarBloques(),
  );
  const actividadIds = [
    ...new Set(
      [...bloquesEditables, ...bloquesHistoricos].map(
        (bloque) => bloque.actividadId,
      ),
    ),
  ].sort();
  const registrosConfirmados = agendasRelacionadas
    .filter((agenda) => agenda.estado !== "BORRADOR")
    .reduce((total, agenda) => total + agenda.listarBloques().length, 0);
  const componentesHuella = [
    contextoId,
    ...bloquesEditables.map((bloque) => `b:${bloque.id}`),
    ...agendasRelacionadas.map(
      (agenda) =>
        `a:${agenda.id}:${agenda.estado}:${agenda
          .listarBloques()
          .map((bloque) => bloque.id)
          .sort()
          .join(",")}`,
    ),
  ];
  return Object.freeze({
    actividadIds: Object.freeze(actividadIds),
    bloqueIdsEditables: Object.freeze(
      bloquesEditables.map((bloque) => bloque.id),
    ),
    cantidadRegistrosConfirmados: registrosConfirmados,
    huella: componentesHuella.join("|"),
  });
}

function trasladarALibre(bloque: BloquePlanificacion): BloquePlanificacion {
  return new BloquePlanificacion({
    id: bloque.id,
    contextoId: IDENTIFICADOR_CONTEXTO_LIBRE,
    actividadId: bloque.actividadId,
    titulo: bloque.titulo,
    fecha: bloque.fecha,
    minutosPlanificados: bloque.minutosPlanificados,
    politica: new PoliticaCompromiso({
      rigidez: bloque.politica.rigidez,
      autoridadPlazo: bloque.politica.autoridadPlazo,
      ajustesPermitidos: bloque.politica.ajustesPermitidos,
    }),
    creadoEn: bloque.creadoEn,
  });
}
