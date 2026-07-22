import type {
  ContenidoRespaldo,
  RegistroRespaldable,
} from "../respaldo/ContratoRespaldo";
import type { ImpactoReinicioPlanificacion } from "../puertos/ReinicioPlanificacion";

export interface EstadoPlanificacionTrasReinicio {
  readonly agendas: readonly RegistroRespaldable[];
  readonly bloques: readonly RegistroRespaldable[];
  readonly cortes: readonly RegistroRespaldable[];
  readonly sesiones: readonly RegistroRespaldable[];
}

export function calcularImpactoReinicioPlanificacion(
  colecciones: ContenidoRespaldo,
): ImpactoReinicioPlanificacion {
  const resultado = aplicarPoliticaReinicioPlanificacion(colecciones);
  const eliminar = Object.freeze({
    agendasActivas:
      colecciones.agendas.length - resultado.estado.agendas.length,
    bloquesAgendaPendientes: contarBloquesAgendaPendientes(colecciones.agendas),
    bloquesPlanificacionActivos:
      colecciones["bloques-planificacion"].length -
      resultado.estado.bloques.length,
    cortesActivos:
      colecciones["cortes-planificacion"].length -
      resultado.estado.cortes.length,
    sesionesAbiertas:
      colecciones["sesiones-cronometro"].length -
      resultado.estado.sesiones.length,
  });
  const conservar = Object.freeze({
    actividades: colecciones.actividades.length,
    contextos: colecciones["contextos-planificacion"].length,
    bloquesHistoricos: resultado.estado.bloques.length,
    cortesHistoricos: resultado.estado.cortes.length,
    sesionesFinalizadas: resultado.estado.sesiones.length,
    resoluciones: colecciones["resoluciones-bloques-planificacion"].length,
    movimientosPuntos: colecciones["transacciones-puntos"].length,
    recompensasAdquiridas: colecciones["recompensas-adquiridas"].length,
    aplicacionesRecompensas: colecciones["aplicaciones-recompensas"].length,
    movimientosRecuperacion: colecciones["movimientos-recuperacion"].length,
    perfil: colecciones["perfil-usuario"].length,
  });
  const totalEliminaciones = Object.values(eliminar).reduce(
    (total, cantidad) => total + cantidad,
    0,
  );
  const totalConservados = Object.values(conservar).reduce(
    (total, cantidad) => total + cantidad,
    0,
  );
  return Object.freeze({
    huella: construirHuella(colecciones),
    eliminar,
    conservar,
    totalEliminaciones,
    totalConservados,
    incidencias: Object.freeze(resultado.incidencias),
  });
}

export function aplicarPoliticaReinicioPlanificacion(
  colecciones: ContenidoRespaldo,
): Readonly<{
  estado: EstadoPlanificacionTrasReinicio;
  incidencias: readonly string[];
}> {
  const resoluciones = new Set(
    colecciones["resoluciones-bloques-planificacion"].map((registro) =>
      leerCadena(registro, "bloqueId"),
    ),
  );
  const ajustes = new Set(
    colecciones["ajustes-compromisos"].map((registro) =>
      leerCadena(registro, "bloqueId"),
    ),
  );
  const bloquesHistoricosIds = new Set([...resoluciones, ...ajustes]);
  const agendas = colecciones.agendas.flatMap((agenda) =>
    transformarAgendaHistorica(agenda),
  );
  const bloques = colecciones["bloques-planificacion"].filter((bloque) =>
    bloquesHistoricosIds.has(leerCadena(bloque, "id")),
  );
  const cortes = colecciones["cortes-planificacion"].flatMap((corte) =>
    transformarCorteHistorico(corte, bloquesHistoricosIds),
  );
  const sesiones = colecciones["sesiones-cronometro"].filter(
    (sesion) => sesion.estado === "FINALIZADA",
  );
  const bloquesExistentes = new Set(
    colecciones["bloques-planificacion"].map((registro) =>
      leerCadena(registro, "id"),
    ),
  );
  const referenciasHuerfanas = [...bloquesHistoricosIds].filter(
    (id) => !bloquesExistentes.has(id),
  ).length;
  const incidencias = referenciasHuerfanas
    ? [
        `${referenciasHuerfanas} referencias históricas ya estaban desvinculadas de su bloque antes del reinicio.`,
      ]
    : [];
  return Object.freeze({
    estado: Object.freeze({
      agendas: congelarRegistros(agendas),
      bloques: congelarRegistros(bloques),
      cortes: congelarRegistros(cortes),
      sesiones: congelarRegistros(sesiones),
    }),
    incidencias: Object.freeze(incidencias),
  });
}

function transformarAgendaHistorica(
  agenda: RegistroRespaldable,
): readonly RegistroRespaldable[] {
  const bloques = leerArreglo(agenda, "bloques");
  const historicos = bloques.filter((bloque) => bloque.estado !== "PENDIENTE");
  if (agenda.estado !== "FINALIZADA" && historicos.length === 0) return [];
  const ids = new Set(historicos.map((bloque) => leerCadena(bloque, "id")));
  const ajustes = leerArreglo(agenda, "ajustes").filter((ajuste) =>
    ids.has(leerCadena(ajuste, "bloqueId")),
  );
  return [Object.freeze({ ...agenda, bloques: historicos, ajustes })];
}

function transformarCorteHistorico(
  corte: RegistroRespaldable,
  bloquesHistoricosIds: ReadonlySet<string>,
): readonly RegistroRespaldable[] {
  if (corte.estado !== "CONFIRMADA") return [];
  const bloques = leerArreglo(corte, "bloques").filter((bloque) =>
    bloquesHistoricosIds.has(leerCadena(bloque, "id")),
  );
  return bloques.length > 0 ? [Object.freeze({ ...corte, bloques })] : [];
}

function contarBloquesAgendaPendientes(
  agendas: readonly RegistroRespaldable[],
): number {
  return agendas.reduce(
    (total, agenda) =>
      total +
      leerArreglo(agenda, "bloques").filter(
        (bloque) => bloque.estado === "PENDIENTE",
      ).length,
    0,
  );
}

function construirHuella(colecciones: ContenidoRespaldo): string {
  const nombres = [
    "agendas",
    "bloques-planificacion",
    "cortes-planificacion",
    "resoluciones-bloques-planificacion",
    "ajustes-compromisos",
    "sesiones-cronometro",
  ] as const;
  const texto = nombres
    .flatMap((nombre) =>
      colecciones[nombre].map(
        (registro) => `${nombre}:${serializarEstable(registro)}`,
      ),
    )
    .sort()
    .join("|");
  let hash = 2166136261;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return `reinicio-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function serializarEstable(valor: unknown): string {
  if (Array.isArray(valor)) {
    return `[${valor.map(serializarEstable).join(",")}]`;
  }
  if (typeof valor === "object" && valor !== null) {
    return `{${Object.keys(valor)
      .sort()
      .map(
        (clave) =>
          `${JSON.stringify(clave)}:${serializarEstable((valor as Record<string, unknown>)[clave])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(valor) ?? "undefined";
}

function leerArreglo(
  registro: RegistroRespaldable,
  campo: string,
): readonly RegistroRespaldable[] {
  const valor = registro[campo];
  return Array.isArray(valor)
    ? (valor as readonly RegistroRespaldable[])
    : Object.freeze([]);
}

function leerCadena(registro: RegistroRespaldable, campo: string): string {
  const valor = registro[campo];
  return typeof valor === "string" ? valor : "";
}

function congelarRegistros(
  registros: readonly RegistroRespaldable[],
): readonly RegistroRespaldable[] {
  return Object.freeze(registros.map((registro) => Object.freeze(registro)));
}
