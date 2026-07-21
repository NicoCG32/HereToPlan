import type { RestauradorEstadoPersistente } from "../puertos/RestauradorEstadoPersistente";
import {
  CasoDeUsoAnalizarImportacionRespaldo,
  type ResultadoAnalisisRespaldo,
} from "./AnalizarImportacionRespaldo";
import {
  COLECCIONES_RESPALDO,
  VERSION_FORMATO_RESPALDO,
  type ContenidoRespaldo,
  type EstadoPersistenteRespaldable,
  type RegistroRespaldable,
  type RespaldoHereToPlanV1,
} from "./ContratoRespaldo";

export const CONFIRMACION_RESTAURACION = "RESTAURAR";
export const RUTA_MIGRACION_RESPALDO_V1 =
  "FORMATO_V1_A_ESTADO_PERSISTENTE_ACTUAL";

export interface PlanRestauracionRespaldo {
  readonly versionFormatoOrigen: typeof VERSION_FORMATO_RESPALDO;
  readonly versionBaseDatosOrigen: number;
  readonly creadoEn: string;
  readonly rutaMigracion: typeof RUTA_MIGRACION_RESPALDO_V1;
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
  readonly rutaMigracion: typeof RUTA_MIGRACION_RESPALDO_V1;
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

    const respaldo = JSON.parse(texto) as RespaldoHereToPlanV1;
    const estadoDestino = migrarFormatoV1(respaldo);
    const totalRegistros = COLECCIONES_RESPALDO.reduce(
      (total, coleccion) => total + estadoDestino.colecciones[coleccion].length,
      0,
    );

    return Object.freeze({
      versionFormatoOrigen: VERSION_FORMATO_RESPALDO,
      versionBaseDatosOrigen: respaldo.origen.versionBaseDatos,
      creadoEn: respaldo.creadoEn,
      rutaMigracion: RUTA_MIGRACION_RESPALDO_V1,
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

function migrarFormatoV1(
  respaldo: RespaldoHereToPlanV1,
): EstadoPersistenteRespaldable {
  const pares = COLECCIONES_RESPALDO.map(
    (coleccion) =>
      [coleccion, congelarRegistros(respaldo.contenido[coleccion])] as const,
  );
  return Object.freeze({
    versionBaseDatos: respaldo.origen.versionBaseDatos,
    colecciones: Object.freeze(Object.fromEntries(pares)) as ContenidoRespaldo,
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
