import type { ModoSeguimientoDto } from "../../aplicacion";

export function etiquetaModoSeguimiento(modo: ModoSeguimientoDto): string {
  return modo === "CRONOMETRADO" ? "Cronometrada" : "Manual";
}
