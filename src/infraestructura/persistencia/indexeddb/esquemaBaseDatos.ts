export const VERSION_BASE_DATOS = 4;
export const ALMACEN_AGENDAS = "agendas";
export const ALMACEN_ACTIVIDADES = "actividades";
export const ALMACEN_CONTEXTOS = "contextos-planificacion";
export const ALMACEN_BLOQUES_PLANIFICACION = "bloques-planificacion";

export function asegurarAlmacenes(baseDatos: IDBDatabase): void {
  if (!baseDatos.objectStoreNames.contains(ALMACEN_AGENDAS)) {
    baseDatos.createObjectStore(ALMACEN_AGENDAS, { keyPath: "id" });
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_ACTIVIDADES)) {
    baseDatos.createObjectStore(ALMACEN_ACTIVIDADES, { keyPath: "id" });
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_CONTEXTOS)) {
    baseDatos.createObjectStore(ALMACEN_CONTEXTOS, { keyPath: "id" });
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_BLOQUES_PLANIFICACION)) {
    baseDatos.createObjectStore(ALMACEN_BLOQUES_PLANIFICACION, {
      keyPath: "id",
    });
  }
}
