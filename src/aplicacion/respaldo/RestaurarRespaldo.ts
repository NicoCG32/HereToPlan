import type { RestauradorEstadoPersistente } from "../puertos/RestauradorEstadoPersistente";
import {
  CasoDeUsoAnalizarImportacionRespaldo,
  type ResultadoAnalisisRespaldo,
} from "./AnalizarImportacionRespaldo";
import {
  COLECCIONES_RESPALDO,
  VERSION_FORMATO_RESPALDO,
  VERSION_FORMATO_RESPALDO_ANTERIOR,
  VERSION_FORMATO_RESPALDO_V1,
  type ContenidoRespaldo,
  type EstadoPersistenteRespaldable,
  type NombreColeccionRespaldo,
  type RegistroRespaldable,
  type RespaldoHereToPlan,
} from "./ContratoRespaldo";

export const CONFIRMACION_RESTAURACION = "RESTAURAR";
export const RUTA_MIGRACION_RESPALDO_V1 =
  "FORMATO_V1_A_ESTADO_PERSISTENTE_ACTUAL";
export const RUTA_MIGRACION_RESPALDO_V2 =
  "FORMATO_V2_A_ESTADO_PERSISTENTE_ACTUAL";
export const RUTA_MIGRACION_RESPALDO_V3 =
  "FORMATO_V3_A_ESTADO_PERSISTENTE_ACTUAL";

export type RutaMigracionRespaldo =
  | typeof RUTA_MIGRACION_RESPALDO_V1
  | typeof RUTA_MIGRACION_RESPALDO_V2
  | typeof RUTA_MIGRACION_RESPALDO_V3;

export interface PlanRestauracionRespaldo {
  readonly versionFormatoOrigen:
    | typeof VERSION_FORMATO_RESPALDO_V1
    | typeof VERSION_FORMATO_RESPALDO_ANTERIOR
    | typeof VERSION_FORMATO_RESPALDO;
  readonly versionBaseDatosOrigen: number;
  readonly creadoEn: string;
  readonly rutaMigracion: RutaMigracionRespaldo;
  readonly totalRegistros: number;
  readonly diagnostico: ResultadoAnalisisRespaldo;
  readonly estadoDestino: EstadoPersistenteRespaldable;
}

export interface ComandoRestaurarRespaldo {
  readonly plan: PlanRestauracionRespaldo;
  readonly confirmacion: string;
}

export interface ResultadoRestauracionRespaldo {
  readonly totalRegistros: number;
  readonly rutaMigracion: RutaMigracionRespaldo;
}

export class ErrorPreparacionRestauracionRespaldo extends Error {
  constructor(public readonly diagnostico: ResultadoAnalisisRespaldo) {
    super(
      diagnostico.estado === "INCOMPATIBLE"
        ? "El respaldo no posee una ruta de migración compatible."
        : "El respaldo contiene errores y no puede prepararse para restauración.",
    );
    this.name = "ErrorPreparacionRestauracionRespaldo";
  }
}

export class ErrorConfirmacionRestauracionRespaldo extends Error {
  constructor() {
    super(`Escribe ${CONFIRMACION_RESTAURACION} para confirmar el reemplazo.`);
    this.name = "ErrorConfirmacionRestauracionRespaldo";
  }
}

export class ErrorRestauracionRespaldo extends Error {
  constructor(public readonly causa?: unknown) {
    super(
      "La restauración falló y se conservó íntegramente el estado anterior.",
    );
    this.name = "ErrorRestauracionRespaldo";
  }
}

export class CasoDeUsoPrepararRestauracionRespaldo {
  constructor(
    private readonly analizar = new CasoDeUsoAnalizarImportacionRespaldo(),
  ) {}

  public ejecutar(texto: string): PlanRestauracionRespaldo {
    const diagnostico = this.analizar.ejecutar(texto);
    if (diagnostico.estado !== "VALIDO") {
      throw new ErrorPreparacionRestauracionRespaldo(diagnostico);
    }

    const respaldo = JSON.parse(texto) as RespaldoHereToPlan;
    const estadoDestino = migrarRespaldo(respaldo);
    const totalRegistros = COLECCIONES_RESPALDO.reduce(
      (total, coleccion) => total + estadoDestino.colecciones[coleccion].length,
      0,
    );

    return Object.freeze({
      versionFormatoOrigen: respaldo.versionFormato,
      versionBaseDatosOrigen: respaldo.origen.versionBaseDatos,
      creadoEn: respaldo.creadoEn,
      rutaMigracion: seleccionarRutaMigracion(respaldo.versionFormato),
      totalRegistros,
      diagnostico,
      estadoDestino,
    });
  }
}

export class CasoDeUsoRestaurarRespaldo {
  constructor(private readonly restaurador: RestauradorEstadoPersistente) {}

  public async ejecutar(
    comando: ComandoRestaurarRespaldo,
  ): Promise<ResultadoRestauracionRespaldo> {
    if (comando.confirmacion !== CONFIRMACION_RESTAURACION) {
      throw new ErrorConfirmacionRestauracionRespaldo();
    }
    try {
      await this.restaurador.reemplazarEstadoCompleto(
        comando.plan.estadoDestino,
      );
    } catch (causa: unknown) {
      throw new ErrorRestauracionRespaldo(causa);
    }
    return Object.freeze({
      totalRegistros: comando.plan.totalRegistros,
      rutaMigracion: comando.plan.rutaMigracion,
    });
  }
}

function migrarRespaldo(
  respaldo: RespaldoHereToPlan,
): EstadoPersistenteRespaldable {
  const pares = COLECCIONES_RESPALDO.map(
    (coleccion) =>
      [
        coleccion,
        congelarRegistros(obtenerRegistrosOrigen(respaldo, coleccion)),
      ] as const,
  );
  return Object.freeze({
    versionBaseDatos: respaldo.origen.versionBaseDatos,
    colecciones: Object.freeze(Object.fromEntries(pares)) as ContenidoRespaldo,
  });
}

function obtenerRegistrosOrigen(
  respaldo: RespaldoHereToPlan,
  coleccion: NombreColeccionRespaldo,
): readonly RegistroRespaldable[] {
  if (coleccion === "actividades") {
    return migrarRegistrosActividad(respaldo.contenido.actividades);
  }
  if (respaldo.versionFormato === VERSION_FORMATO_RESPALDO) {
    return respaldo.contenido[coleccion];
  }
  if (coleccion === "recompensas-adquiridas") {
    return migrarCanjesHistoricos(respaldo.contenido["canjes-recompensas"])
      .adquiridas;
  }
  if (coleccion === "aplicaciones-recompensas") {
    return migrarCanjesHistoricos(respaldo.contenido["canjes-recompensas"])
      .aplicaciones;
  }
  if (
    respaldo.versionFormato === VERSION_FORMATO_RESPALDO_V1 &&
    coleccion === "perfil-usuario"
  ) {
    return [];
  }
  return (
    (
      respaldo.contenido as Readonly<
        Partial<Record<NombreColeccionRespaldo, readonly RegistroRespaldable[]>>
      >
    )[coleccion] ?? []
  );
}

function migrarRegistrosActividad(
  actividades: readonly RegistroRespaldable[],
): readonly RegistroRespaldable[] {
  return actividades.map((actividad) => {
    if (actividad.versionEsquema === 2) return actividad;
    return Object.freeze({
      ...actividad,
      versionEsquema: 2,
      modoSeguimiento: "MANUAL",
    });
  });
}

function seleccionarRutaMigracion(version: number): RutaMigracionRespaldo {
  if (version === VERSION_FORMATO_RESPALDO_V1) {
    return RUTA_MIGRACION_RESPALDO_V1;
  }
  if (version === VERSION_FORMATO_RESPALDO_ANTERIOR) {
    return RUTA_MIGRACION_RESPALDO_V2;
  }
  return RUTA_MIGRACION_RESPALDO_V3;
}

function migrarCanjesHistoricos(
  canjes: readonly RegistroRespaldable[],
): Readonly<{
  adquiridas: readonly RegistroRespaldable[];
  aplicaciones: readonly RegistroRespaldable[];
}> {
  const adquiridas = canjes.map((canje) =>
    Object.freeze({
      versionEsquema: 1,
      id: canje.id,
      recompensaId: canje.recompensaId,
      puntosGastados: canje.puntosGastados,
      adquiridaEn: canje.canjeadoEn,
      estado: "CONSUMIDA",
      aplicacionId: canje.id,
      consumidaEn: canje.canjeadoEn,
    }),
  );
  const aplicaciones = canjes.map((canje) =>
    Object.freeze({
      versionEsquema: 1,
      id: canje.id,
      recompensaAdquiridaId: canje.id,
      recompensaId: canje.recompensaId,
      puntosGastados: canje.puntosGastados,
      aplicadaEn: canje.canjeadoEn,
      fechaObjetivo: canje.fechaObjetivo,
      bloquesAfectados: canje.bloquesAfectados,
    }),
  );
  return Object.freeze({
    adquiridas: Object.freeze(adquiridas),
    aplicaciones: Object.freeze(aplicaciones),
  });
}

function congelarRegistros(
  registros: readonly RegistroRespaldable[],
): readonly RegistroRespaldable[] {
  return Object.freeze(
    registros.map((registro) => congelarProfundamente(registro)),
  );
}

function congelarProfundamente<T>(valor: T): T {
  if (typeof valor !== "object" || valor === null || Object.isFrozen(valor)) {
    return valor;
  }
  for (const anidado of Object.values(valor as Record<string, unknown>)) {
    congelarProfundamente(anidado);
  }
  return Object.freeze(valor);
}
