import type { RepositorioActividades } from "../puertos/RepositorioActividades";
import { ErrorActividadNoEncontrada } from "../puertos/RepositorioActividades";
import type { RepositorioAgendas } from "../puertos/RepositorioAgendas";
import type { RepositorioBloquesPlanificacion } from "../puertos/RepositorioBloquesPlanificacion";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";

export type ResultadoEliminarActividad =
  | Readonly<{ exito: true; actividadId: string; titulo: string }>
  | Readonly<{
      exito: false;
      error: Readonly<{ codigo: string; mensaje: string }>;
    }>;

export class CasoDeUsoEliminarActividad {
  constructor(
    private readonly actividades: RepositorioActividades,
    private readonly agendas: RepositorioAgendas,
    private readonly bloques: RepositorioBloquesPlanificacion,
    private readonly cortes: RepositorioCortesPlanificacion,
  ) {}

  public async ejecutar(
    actividadId: string,
  ): Promise<ResultadoEliminarActividad> {
    try {
      const actividad = await this.actividades.obtenerPorId(actividadId);
      if (!actividad) throw new ErrorActividadNoEncontrada(actividadId);
      const [agendas, bloques, cortes] = await Promise.all([
        this.agendas.listar(),
        this.bloques.listar(),
        this.cortes.listar(),
      ]);
      const referenciada =
        agendas.some((agenda) =>
          agenda
            .listarBloques()
            .some((bloque) => bloque.actividadId === actividadId),
        ) ||
        bloques.some((bloque) => bloque.actividadId === actividadId) ||
        cortes.some((corte) =>
          corte
            .listarBloques()
            .some((bloque) => bloque.actividadId === actividadId),
        );
      if (referenciada) {
        return rechazar(
          "ACTIVIDAD_EN_USO",
          "La actividad conserva bloques o historia y no puede eliminarse.",
        );
      }
      await this.actividades.eliminar(actividad.id);
      return Object.freeze({
        exito: true,
        actividadId: actividad.id,
        titulo: actividad.titulo,
      });
    } catch (error: unknown) {
      if (error instanceof ErrorActividadNoEncontrada) {
        return rechazar(error.codigo, error.message);
      }
      throw error;
    }
  }
}

function rechazar(codigo: string, mensaje: string): ResultadoEliminarActividad {
  return Object.freeze({
    exito: false,
    error: Object.freeze({ codigo, mensaje }),
  });
}
