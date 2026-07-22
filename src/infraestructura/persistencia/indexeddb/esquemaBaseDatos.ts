import { COLECCIONES_RESPALDO } from "../../../aplicacion/respaldo/ContratoRespaldo";
import type { AplicacionRecompensaV1 } from "../registros/AplicacionRecompensaV1";
import type { CanjeRecompensaV1 } from "../registros/CanjeRecompensaV1";
import type { RecompensaAdquiridaV1 } from "../registros/RecompensaAdquiridaV1";
import type { ActividadV1 } from "../registros/ActividadV1";
import type { ActividadV2 } from "../registros/ActividadV2";
import {
  migrarActividadV1AV2,
  rehidratarActividadDesdeV2,
} from "../mapeadores/MapeadorActividadV2";

export const VERSION_BASE_DATOS = 13;
export const ALMACEN_PERFIL_USUARIO = "perfil-usuario";
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
export const ALMACEN_RECOMPENSAS_ADQUIRIDAS = "recompensas-adquiridas";
export const ALMACEN_APLICACIONES_RECOMPENSAS = "aplicaciones-recompensas";
export const INDICE_RECOMPENSAS_ADQUIRIDAS_POR_ESTADO = "por-estado";
export const INDICE_APLICACIONES_POR_UNIDAD = "por-recompensa-adquirida-id";
export const ALMACEN_AJUSTES_COMPROMISOS = "ajustes-compromisos";
export const INDICE_AJUSTES_POR_BLOQUE = "por-bloque-id";
export const INDICE_AJUSTES_POR_CANJE = "por-canje-id";
export const ALMACEN_SESIONES_CRONOMETRO = "sesiones-cronometro";
export const INDICE_SESIONES_POR_BLOQUE = "por-bloque-id";
export const INDICE_SESIONES_POR_OPERACION = "por-operacion-id";
export const INDICE_SESION_ABIERTA = "por-sesion-abierta";
export const ALMACEN_MOVIMIENTOS_RECUPERACION = "movimientos-recuperacion";
export const INDICE_RECUPERACION_POR_OPERACION = "por-operacion-id";
export const INDICE_RECUPERACION_POR_FUENTE = "por-tipo-y-bloque-fuente";
export const ALMACEN_REDUCCIONES_CARGA = "reducciones-carga";
export const INDICE_REDUCCION_POR_BLOQUE = "por-bloque-id";
export const INDICE_REDUCCION_POR_OPERACION = "por-operacion-id";
export const ALMACENES_RESPALDABLES = COLECCIONES_RESPALDO;

export function asegurarAlmacenes(
  baseDatos: IDBDatabase,
  transaccionActualizacion?: IDBTransaction,
): void {
  if (!baseDatos.objectStoreNames.contains(ALMACEN_PERFIL_USUARIO)) {
    baseDatos.createObjectStore(ALMACEN_PERFIL_USUARIO, { keyPath: "id" });
  }
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
  let inventarioCreado = false;
  if (!baseDatos.objectStoreNames.contains(ALMACEN_RECOMPENSAS_ADQUIRIDAS)) {
    const almacen = baseDatos.createObjectStore(
      ALMACEN_RECOMPENSAS_ADQUIRIDAS,
      {
        keyPath: "id",
      },
    );
    almacen.createIndex(INDICE_RECOMPENSAS_ADQUIRIDAS_POR_ESTADO, "estado", {
      unique: false,
    });
    inventarioCreado = true;
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_APLICACIONES_RECOMPENSAS)) {
    const almacen = baseDatos.createObjectStore(
      ALMACEN_APLICACIONES_RECOMPENSAS,
      { keyPath: "id" },
    );
    almacen.createIndex(
      INDICE_APLICACIONES_POR_UNIDAD,
      "recompensaAdquiridaId",
      { unique: true },
    );
    inventarioCreado = true;
  }
  if (inventarioCreado && transaccionActualizacion) {
    migrarCanjesHistoricos(transaccionActualizacion);
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
  if (!baseDatos.objectStoreNames.contains(ALMACEN_MOVIMIENTOS_RECUPERACION)) {
    const almacen = baseDatos.createObjectStore(
      ALMACEN_MOVIMIENTOS_RECUPERACION,
      { keyPath: "id" },
    );
    almacen.createIndex(INDICE_RECUPERACION_POR_OPERACION, "operacionId", {
      unique: true,
    });
    almacen.createIndex(
      INDICE_RECUPERACION_POR_FUENTE,
      ["tipo", "bloqueFuenteId"],
      { unique: true },
    );
  }
  if (!baseDatos.objectStoreNames.contains(ALMACEN_REDUCCIONES_CARGA)) {
    const almacen = baseDatos.createObjectStore(ALMACEN_REDUCCIONES_CARGA, {
      keyPath: "id",
    });
    almacen.createIndex(INDICE_REDUCCION_POR_BLOQUE, "bloqueId", {
      unique: true,
    });
    almacen.createIndex(INDICE_REDUCCION_POR_OPERACION, "operacionId", {
      unique: true,
    });
  }
  if (transaccionActualizacion) {
    migrarActividadesASegundaVersion(transaccionActualizacion);
  }
}

function migrarActividadesASegundaVersion(transaccion: IDBTransaction): void {
  if (!transaccion.objectStoreNames.contains(ALMACEN_ACTIVIDADES)) return;
  const solicitud = transaccion.objectStore(ALMACEN_ACTIVIDADES).openCursor();
  solicitud.onsuccess = () => {
    const cursor = solicitud.result;
    if (!cursor) return;
    try {
      const registro = cursor.value as ActividadV1 | ActividadV2;
      if (Number(registro.versionEsquema) === 1) {
        cursor.update(migrarActividadV1AV2(registro as ActividadV1));
      } else {
        rehidratarActividadDesdeV2(registro as ActividadV2);
      }
      cursor.continue();
    } catch {
      transaccion.abort();
    }
  };
}

function migrarCanjesHistoricos(transaccion: IDBTransaction): void {
  if (!transaccion.objectStoreNames.contains(ALMACEN_CANJES_RECOMPENSAS)) {
    return;
  }
  const canjes = transaccion.objectStore(ALMACEN_CANJES_RECOMPENSAS);
  const adquiridas = transaccion.objectStore(ALMACEN_RECOMPENSAS_ADQUIRIDAS);
  const aplicaciones = transaccion.objectStore(
    ALMACEN_APLICACIONES_RECOMPENSAS,
  );
  const cursor = canjes.openCursor();
  cursor.onsuccess = () => {
    const actual = cursor.result;
    if (!actual) return;
    const canje = actual.value as CanjeRecompensaV1;
    const adquirida: RecompensaAdquiridaV1 = {
      versionEsquema: 1,
      id: canje.id,
      recompensaId: canje.recompensaId,
      puntosGastados: canje.puntosGastados,
      adquiridaEn: canje.canjeadoEn,
      estado: "CONSUMIDA",
      aplicacionId: canje.id,
      consumidaEn: canje.canjeadoEn,
    };
    const aplicacion: AplicacionRecompensaV1 = {
      versionEsquema: 1,
      id: canje.id,
      recompensaAdquiridaId: canje.id,
      recompensaId: canje.recompensaId,
      puntosGastados: canje.puntosGastados,
      aplicadaEn: canje.canjeadoEn,
      fechaObjetivo: canje.fechaObjetivo,
      bloquesAfectados: canje.bloquesAfectados,
    };
    adquiridas.put(adquirida);
    aplicaciones.put(aplicacion);
    actual.continue();
  };
}
