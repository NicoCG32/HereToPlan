export const VERSION_BASE_DATOS = 9;
export const ALMACEN_AGENDAS = "agendas";
export const ALMACEN_ACTIVIDADES = "actividades";
export const ALMACEN_CONTEXTOS = "contextos-planificacion";
export const ALMACEN_BLOQUES_PLANIFICACION = "bloques-planificacion";
export const ALMACEN_CORTES_PLANIFICACION = "cortes-planificacion";
export const ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION =
  "resoluciones-bloques-planificacion";
export const INDICE_RESOLUCIONES_POR_OPERACION = "por-operacion-id";
export const ALMACEN_TRANSACCIONES_PUNTOS = "transacciones-puntos";
export const INDICE_TRANSACCIONES_POR_FUENTE = "por-fuente-semantica";
export const ALMACEN_CANJES_RECOMPENSAS = "canjes-recompensas";
export const ALMACEN_AJUSTES_COMPROMISOS = "ajustes-compromisos";
export const INDICE_AJUSTES_POR_BLOQUE = "por-bloque-id";
export const INDICE_AJUSTES_POR_CANJE = "por-canje-id";
export const ALMACEN_SESIONES_CRONOMETRO = "sesiones-cronometro";
export const INDICE_SESIONES_POR_BLOQUE = "por-bloque-id";
export const INDICE_SESIONES_POR_OPERACION = "por-operacion-id";
export const INDICE_SESION_ABIERTA = "por-sesion-abierta";

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
  if (!baseDatos.objectStoreNames.contains(ALMACEN_CORTES_PLANIFICACION)) {
    baseDatos.createObjectStore(ALMACEN_CORTES_PLANIFICACION, {
      keyPath: "id",
    });
  }
  if (
    !baseDatos.objectStoreNames.contains(
      ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
    )
  ) {
    const almacen = baseDatos.createObjectStore(
      ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
      { keyPath: "bloqueId" },
    );
    almacen.createIndex(INDICE_RESOLUCIONES_POR_OPERACION, "operacionId", {
      unique: true,
    });
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_TRANSACCIONES_PUNTOS)) {
    const almacen = baseDatos.createObjectStore(ALMACEN_TRANSACCIONES_PUNTOS, {
      keyPath: "id",
    });
    almacen.createIndex(
      INDICE_TRANSACCIONES_POR_FUENTE,
      ["fuenteTipo", "fuenteId"],
      { unique: true },
    );
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_CANJES_RECOMPENSAS)) {
    baseDatos.createObjectStore(ALMACEN_CANJES_RECOMPENSAS, {
      keyPath: "id",
    });
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_AJUSTES_COMPROMISOS)) {
    const almacen = baseDatos.createObjectStore(ALMACEN_AJUSTES_COMPROMISOS, {
      keyPath: "id",
    });
    almacen.createIndex(INDICE_AJUSTES_POR_BLOQUE, "bloqueId", {
      unique: true,
    });
    almacen.createIndex(INDICE_AJUSTES_POR_CANJE, "canjeRecompensaId", {
      unique: false,
    });
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_SESIONES_CRONOMETRO)) {
    const almacen = baseDatos.createObjectStore(ALMACEN_SESIONES_CRONOMETRO, {
      keyPath: "id",
    });
    almacen.createIndex(INDICE_SESIONES_POR_BLOQUE, "bloqueId", {
      unique: false,
    });
    almacen.createIndex(INDICE_SESIONES_POR_OPERACION, "operacionesIds", {
      unique: true,
      multiEntry: true,
    });
    almacen.createIndex(INDICE_SESION_ABIERTA, "claveAbierta", {
      unique: true,
    });
  }
}
