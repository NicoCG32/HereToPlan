import { Agenda } from "../../dominio/agendas/Agenda";
import { ErrorDominio } from "../../dominio/compartido/ErrorDominio";
import { FechaLocal } from "../../dominio/compartido/FechaLocal";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import type { Reloj } from "../puertos/Reloj";
import {
  ErrorAgendaDuplicada,
  type RepositorioAgendas,
} from "../puertos/RepositorioAgendas";

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

const CODIGOS_DOMINIO_ESPERADOS = new Set<CodigoErrorCrearAgendaBorrador>([
  "NOMBRE_AGENDA_VACIO",
  "FECHA_LOCAL_INVALIDA",
  "FECHA_LOCAL_INEXISTENTE",
  "RANGO_AGENDA_INVALIDO",
]);

export class CasoDeUsoCrearAgendaBorrador implements CrearAgendaBorrador {
  constructor(
    private readonly repositorio: RepositorioAgendas,
    private readonly reloj: Reloj,
    private readonly generadorIdentificadores: GeneradorIdentificadores,
  ) {}

  public async ejecutar(
    comando: ComandoCrearAgendaBorrador,
  ): Promise<ResultadoCrearAgendaBorrador> {
    let campoFecha: CampoCrearAgendaBorrador | undefined;

    try {
      campoFecha = "fechaInicio";
      const fechaInicio = FechaLocal.crear(comando.fechaInicio);
      campoFecha = "fechaFin";
      const fechaFin = FechaLocal.crear(comando.fechaFin);
      campoFecha = undefined;

      const id = this.generadorIdentificadores.generar();
      const agenda = new Agenda({
        id,
        nombre: comando.nombre,
        fechaInicio,
        fechaFin,
        creadaEn: this.reloj.ahora(),
      });

      if ((await this.repositorio.obtenerPorId(id)) !== undefined) {
        return this.rechazarIdentificadorDuplicado(id);
      }

      await this.repositorio.guardar(agenda);

      const vista = Object.freeze({
        id: agenda.id,
        nombre: agenda.nombre,
        fechaInicio: agenda.fechaInicio.toString(),
        fechaFin: agenda.fechaFin.toString(),
        estado: "BORRADOR",
        creadaEn: agenda.creadaEn.toISOString(),
      } satisfies AgendaBorradorCreada);

      return Object.freeze({ exito: true, agenda: vista });
    } catch (error: unknown) {
      if (error instanceof ErrorAgendaDuplicada) {
        return this.rechazarIdentificadorDuplicado(error.id);
      }

      if (
        error instanceof ErrorDominio &&
        this.esCodigoEsperado(error.codigo)
      ) {
        return this.rechazarErrorDominio(error, campoFecha);
      }

      throw error;
    }
  }

  private rechazarErrorDominio(
    error: ErrorDominio,
    campoFecha: CampoCrearAgendaBorrador | undefined,
  ): CreacionAgendaBorradorRechazada {
    const codigo = error.codigo as CodigoErrorCrearAgendaBorrador;
    const campo =
      campoFecha ??
      (codigo === "NOMBRE_AGENDA_VACIO"
        ? "nombre"
        : codigo === "RANGO_AGENDA_INVALIDO"
          ? "fechaFin"
          : undefined);
    const detalle = campo
      ? Object.freeze({ codigo, mensaje: error.message, campo })
      : Object.freeze({ codigo, mensaje: error.message });

    return Object.freeze({ exito: false, error: detalle });
  }

  private rechazarIdentificadorDuplicado(
    id: string,
  ): CreacionAgendaBorradorRechazada {
    return Object.freeze({
      exito: false,
      error: Object.freeze({
        codigo: "IDENTIFICADOR_AGENDA_DUPLICADO",
        mensaje: `Ya existe una agenda con el identificador ${id}.`,
      }),
    });
  }

  private esCodigoEsperado(
    codigo: string,
  ): codigo is CodigoErrorCrearAgendaBorrador {
    return CODIGOS_DOMINIO_ESPERADOS.has(
      codigo as CodigoErrorCrearAgendaBorrador,
    );
  }
}
