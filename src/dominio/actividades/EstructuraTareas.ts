import { ErrorDominio } from "../compartido/ErrorDominio";
import type { Identificador } from "../compartido/tipos";
import type { Tarea } from "./Tarea";

export class EstructuraTareas {
  public static validar(tareas: readonly Tarea[]): void {
    const porId = new Map<Identificador, Tarea>();
    for (const tarea of tareas) {
      if (porId.has(tarea.id)) {
        throw new ErrorDominio(
          "TAREA_DUPLICADA_EN_ESTRUCTURA",
          "La estructura no puede contener dos tareas con el mismo identificador.",
        );
      }
      porId.set(tarea.id, tarea);
    }

    for (const tarea of tareas) {
      for (const subtareaId of tarea.listarSubtareasIds()) {
        if (!porId.has(subtareaId)) {
          throw new ErrorDominio(
            "SUBTAREA_NO_ENCONTRADA",
            `La subtarea ${subtareaId} no pertenece al catálogo de tareas.`,
          );
        }
      }
    }

    const visitadas = new Set<Identificador>();
    const enRecorrido = new Set<Identificador>();
    const visitar = (id: Identificador): void => {
      if (enRecorrido.has(id)) {
        throw new ErrorDominio(
          "CICLO_ENTRE_TAREAS",
          "La composición de tareas y proyectos debe ser acíclica.",
        );
      }
      if (visitadas.has(id)) return;

      enRecorrido.add(id);
      const tarea = porId.get(id)!;
      for (const subtareaId of tarea.listarSubtareasIds()) {
        visitar(subtareaId);
      }
      enRecorrido.delete(id);
      visitadas.add(id);
    };

    for (const tarea of tareas) visitar(tarea.id);
  }
}
