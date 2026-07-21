export const IDENTIFICADOR_FORMATO_RESPALDO = "HereToPlan.respaldo";
export const VERSION_FORMATO_RESPALDO = 1;

export const COLECCIONES_RESPALDO = [
  "agendas",
  "actividades",
  "contextos-planificacion",
  "bloques-planificacion",
  "cortes-planificacion",
  "resoluciones-bloques-planificacion",
  "transacciones-puntos",
  "canjes-recompensas",
  "ajustes-compromisos",
  "sesiones-cronometro",
  "movimientos-recuperacion",
  "reducciones-carga",
] as const;

export type NombreColeccionRespaldo = (typeof COLECCIONES_RESPALDO)[number];
export type RegistroRespaldable = Readonly<Record<string, unknown>>;
export type ContenidoRespaldo = Readonly<
  Record<NombreColeccionRespaldo, readonly RegistroRespaldable[]>
>;

export interface EstadoPersistenteRespaldable {
  readonly versionBaseDatos: number;
  readonly colecciones: ContenidoRespaldo;
}

export interface RespaldoHereToPlanV1 {
  readonly formato: typeof IDENTIFICADOR_FORMATO_RESPALDO;
  readonly versionFormato: typeof VERSION_FORMATO_RESPALDO;
  readonly creadoEn: string;
  readonly origen: Readonly<{
    aplicacion: "HereToPlan";
    versionBaseDatos: number;
  }>;
  readonly contenido: ContenidoRespaldo;
  readonly metadatos?: Readonly<{
    nota?: string;
  }>;
}

export interface ArchivoRespaldo {
  readonly nombre: string;
  readonly tipoMime: "application/json";
  readonly contenido: string;
  readonly respaldo: RespaldoHereToPlanV1;
}
