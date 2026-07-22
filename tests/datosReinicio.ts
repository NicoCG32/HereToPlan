import {
  COLECCIONES_RESPALDO,
  type ContenidoRespaldo,
  type EstadoPersistenteRespaldable,
} from "../src/aplicacion";

export function crearEstadoReinicio(): EstadoPersistenteRespaldable {
  const vacio = Object.fromEntries(
    COLECCIONES_RESPALDO.map((nombre) => [nombre, []]),
  ) as unknown as ContenidoRespaldo;

  return {
    versionBaseDatos: 13,
    colecciones: {
      ...vacio,
      agendas: [
        {
          versionEsquema: 1,
          id: "agenda-activa",
          estado: "BORRADOR",
          bloques: [{ id: "bloque-agenda-activo", estado: "PENDIENTE" }],
          ajustes: [],
        },
        {
          versionEsquema: 1,
          id: "agenda-historica",
          estado: "FINALIZADA",
          bloques: [{ id: "bloque-agenda-historico", estado: "COMPLETADO" }],
          ajustes: [],
        },
      ],
      actividades: [
        { versionEsquema: 2, id: "actividad-1" },
        { versionEsquema: 2, id: "actividad-2" },
      ],
      "contextos-planificacion": [
        { versionEsquema: 1, id: "contexto-libre" },
        { versionEsquema: 1, id: "contexto-proyecto" },
      ],
      "bloques-planificacion": [
        { versionEsquema: 1, id: "bloque-activo" },
        { versionEsquema: 1, id: "bloque-historico" },
      ],
      "cortes-planificacion": [
        {
          versionEsquema: 1,
          id: "corte-activo",
          estado: "EN_GRACIA",
          bloques: [{ id: "bloque-activo" }],
        },
        {
          versionEsquema: 1,
          id: "corte-historico",
          estado: "CONFIRMADA",
          bloques: [{ id: "bloque-activo" }, { id: "bloque-historico" }],
        },
      ],
      "resoluciones-bloques-planificacion": [
        {
          versionEsquema: 1,
          bloqueId: "bloque-historico",
          operacionId: "resolucion-1",
          resultado: "COMPLETADO",
        },
      ],
      "transacciones-puntos": [
        {
          versionEsquema: 1,
          id: "puntos-1",
          fuenteTipo: "BLOQUE",
          fuenteId: "bloque-historico",
        },
      ],
      "sesiones-cronometro": [
        {
          versionEsquema: 1,
          id: "sesion-abierta",
          bloqueId: "bloque-activo",
          estado: "ACTIVA",
          operacionesIds: [],
          claveAbierta: "ABIERTA",
        },
        {
          versionEsquema: 1,
          id: "sesion-finalizada",
          bloqueId: "bloque-historico",
          estado: "FINALIZADA",
          operacionesIds: [],
        },
      ],
      "perfil-usuario": [{ versionEsquema: 1, id: "perfil-local" }],
      "recompensas-adquiridas": [
        { versionEsquema: 1, id: "unidad-1", estado: "DISPONIBLE" },
      ],
      "aplicaciones-recompensas": [
        {
          versionEsquema: 1,
          id: "aplicacion-1",
          recompensaAdquiridaId: "unidad-consumida",
        },
      ],
      "movimientos-recuperacion": [
        {
          versionEsquema: 1,
          id: "movimiento-1",
          operacionId: "movimiento-operacion-1",
          tipo: "ACREDITACION",
          bloqueFuenteId: "bloque-historico",
        },
      ],
    },
  };
}
