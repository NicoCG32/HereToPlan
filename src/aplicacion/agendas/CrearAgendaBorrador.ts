export type CampoCrearAgendaBorrador = "nombre" | "fechaInicio" | "fechaFin";

export type CodigoErrorCrearAgendaBorrador =
  | "NOMBRE_AGENDA_VACIO"
  | "FECHA_LOCAL_INVALIDA"
  | "FECHA_LOCAL_INEXISTENTE"
  | "RANGO_AGENDA_INVALIDO"
  | "IDENTIFICADOR_AGENDA_DUPLICADO";

export interface ComandoCrearAgendaBorrador {
  readonly nombre: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
}

export interface AgendaBorradorCreada {
  readonly id: string;
  readonly nombre: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly estado: "BORRADOR";
  readonly creadaEn: string;
}

export interface ErrorCrearAgendaBorrador {
  readonly codigo: CodigoErrorCrearAgendaBorrador;
  readonly mensaje: string;
  readonly campo?: CampoCrearAgendaBorrador;
}

export interface CreacionAgendaBorradorExitosa {
  readonly exito: true;
  readonly agenda: AgendaBorradorCreada;
}

export interface CreacionAgendaBorradorRechazada {
  readonly exito: false;
  readonly error: ErrorCrearAgendaBorrador;
}

export type ResultadoCrearAgendaBorrador =
  CreacionAgendaBorradorExitosa | CreacionAgendaBorradorRechazada;

export interface CrearAgendaBorrador {
  ejecutar(
    comando: ComandoCrearAgendaBorrador,
  ): Promise<ResultadoCrearAgendaBorrador>;
}
