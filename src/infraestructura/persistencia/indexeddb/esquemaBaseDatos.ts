export const VERSION_BASE_DATOS = 2;
export const ALMACEN_AGENDAS = "agendas";
export const ALMACEN_ACTIVIDADES = "actividades";

export function asegurarAlmacenes(baseDatos: IDBDatabase): void {
  if (!baseDatos.objectStoreNames.contains(ALMACEN_AGENDAS)) {
    baseDatos.createObjectStore(ALMACEN_AGENDAS, { keyPath: "id" });
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_ACTIVIDADES)) {
    baseDatos.createObjectStore(ALMACEN_ACTIVIDADES, { keyPath: "id" });
  }
}
