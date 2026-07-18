export const TIPOS_ACTIVIDAD = [
  "TAREA_SIMPLE",
  "TAREA_COMPUESTA",
  "PROYECTO",
  "HABITO",
] as const;

export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export type TipoTarea = Exclude<TipoActividad, "HABITO">;
export type EstadoTarea = "PENDIENTE" | "COMPLETADA" | "NO_COMPLETADA";
export type TipoFrecuenciaHabito = "DIARIA" | "SEMANAL" | "PERSONALIZADA";

export function esTipoActividad(valor: unknown): valor is TipoActividad {
  return TIPOS_ACTIVIDAD.some((tipo) => tipo === valor);
}

export function esTipoTarea(valor: unknown): valor is TipoTarea {
  return (
    valor === "TAREA_SIMPLE" ||
    valor === "TAREA_COMPUESTA" ||
    valor === "PROYECTO"
  );
}
