export const IDENTIFICADOR_FORMATO_RESPALDO = "HereToPlan.respaldo";
export const VERSION_FORMATO_RESPALDO_V1 = 1;
export const VERSION_FORMATO_RESPALDO_ANTERIOR = 2;
export const VERSION_FORMATO_RESPALDO = 3;

export const COLECCIONES_RESPALDO_V1 = [
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

export const COLECCIONES_RESPALDO_V2 = [
  ...COLECCIONES_RESPALDO_V1,
  "perfil-usuario",
] as const;

export const COLECCIONES_RESPALDO = [
  ...COLECCIONES_RESPALDO_V2,
  "recompensas-adquiridas",
  "aplicaciones-recompensas",
] as const;

export type NombreColeccionRespaldo = (typeof COLECCIONES_RESPALDO)[number];
export type NombreColeccionRespaldoV1 =
  (typeof COLECCIONES_RESPALDO_V1)[number];
export type NombreColeccionRespaldoV2 =
  (typeof COLECCIONES_RESPALDO_V2)[number];
export type RegistroRespaldable = Readonly<Record<string, unknown>>;
export type ContenidoRespaldo = Readonly<
  Record<NombreColeccionRespaldo, readonly RegistroRespaldable[]>
>;
export type ContenidoRespaldoV1 = Readonly<
  Record<NombreColeccionRespaldoV1, readonly RegistroRespaldable[]>
>;
export type ContenidoRespaldoV2 = Readonly<
  Record<NombreColeccionRespaldoV2, readonly RegistroRespaldable[]>
>;

export interface EstadoPersistenteRespaldable {
  readonly versionBaseDatos: number;
  readonly colecciones: ContenidoRespaldo;
}

export interface RespaldoHereToPlanV1 {
  readonly formato: typeof IDENTIFICADOR_FORMATO_RESPALDO;
  readonly versionFormato: typeof VERSION_FORMATO_RESPALDO_V1;
  readonly creadoEn: string;
  readonly origen: Readonly<{
    aplicacion: "HereToPlan";
    versionBaseDatos: number;
  }>;
  readonly contenido: ContenidoRespaldoV1;
  readonly metadatos?: Readonly<{
    nota?: string;
  }>;
}

export interface RespaldoHereToPlanV2 {
  readonly formato: typeof IDENTIFICADOR_FORMATO_RESPALDO;
  readonly versionFormato: typeof VERSION_FORMATO_RESPALDO_ANTERIOR;
  readonly creadoEn: string;
  readonly origen: Readonly<{
    aplicacion: "HereToPlan";
    versionBaseDatos: number;
  }>;
  readonly contenido: ContenidoRespaldoV2;
  readonly metadatos?: Readonly<{
    nota?: string;
  }>;
}

export interface RespaldoHereToPlanV3 {
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

export type RespaldoHereToPlan =
  RespaldoHereToPlanV1 | RespaldoHereToPlanV2 | RespaldoHereToPlanV3;

export interface ArchivoRespaldo {
  readonly nombre: string;
  readonly tipoMime: "application/json";
  readonly contenido: string;
  readonly respaldo: RespaldoHereToPlanV3;
}
