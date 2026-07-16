import { Agenda } from "../../dominio/agendas/Agenda";
import { ErrorDominio } from "../../dominio/compartido/ErrorDominio";
import { FechaLocal } from "../../dominio/compartido/FechaLocal";
import { PoliticaCompromiso } from "../../dominio/compromisos/PoliticaCompromiso";
import type {
  AutoridadPlazo,
  RigidezCompromiso,
  TipoAjusteCompromiso,
} from "../../dominio/compromisos/tipos";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import type { RepositorioAgendas } from "../puertos/RepositorioAgendas";
import {
  convertirAgendaBorradorEnDto,
  type AgendaBorradorDto,
} from "./AgendaBorradorDto";

export interface BloqueEditableAgendaBorrador {
  readonly id?: string;
  readonly actividadId?: string;
  readonly actividad: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly rigidez: RigidezCompromiso;
  readonly autoridadPlazo: AutoridadPlazo;
  readonly ajustesPermitidos: readonly TipoAjusteCompromiso[];
}

export interface ComandoGuardarBloquesAgendaBorrador {
  readonly agendaId: string;
  readonly bloques: readonly BloqueEditableAgendaBorrador[];
}

export interface ErrorGuardarBloquesAgendaBorrador {
  readonly codigo: string;
  readonly mensaje: string;
  readonly indiceBloque?: number;
}

export type ResultadoGuardarBloquesAgendaBorrador =
  | Readonly<{ exito: true; agenda: AgendaBorradorDto }>
  | Readonly<{ exito: false; error: ErrorGuardarBloquesAgendaBorrador }>;

export interface GuardarBloquesAgendaBorrador {
  ejecutar(
    comando: ComandoGuardarBloquesAgendaBorrador,
  ): Promise<ResultadoGuardarBloquesAgendaBorrador>;
}

export class CasoDeUsoGuardarBloquesAgendaBorrador implements GuardarBloquesAgendaBorrador {
  constructor(
    private readonly repositorio: RepositorioAgendas,
    private readonly generadorIdentificadores: GeneradorIdentificadores,
  ) {}

  public async ejecutar(
    comando: ComandoGuardarBloquesAgendaBorrador,
  ): Promise<ResultadoGuardarBloquesAgendaBorrador> {
    const existente = await this.repositorio.obtenerPorId(comando.agendaId);
    if (!existente) {
      return this.rechazar(
        "AGENDA_NO_ENCONTRADA",
        "La agenda que intentas editar ya no está disponible.",
      );
    }
    if (existente.estado !== "BORRADOR") {
      return this.rechazar(
        "AGENDA_NO_EDITABLE",
        "Solo las agendas en borrador pueden modificarse.",
      );
    }

    const reemplazo = new Agenda({
      id: existente.id,
      nombre: existente.nombre,
      fechaInicio: existente.fechaInicio,
      fechaFin: existente.fechaFin,
      creadaEn: existente.creadaEn,
    });

    for (const [indice, bloque] of comando.bloques.entries()) {
      try {
        reemplazo.agregarBloque({
          id: bloque.id ?? this.generadorIdentificadores.generar(),
          actividadId:
            bloque.actividadId ?? this.generadorIdentificadores.generar(),
          titulo: bloque.actividad,
          fecha: FechaLocal.crear(bloque.fecha),
          minutosPlanificados: bloque.minutosPlanificados,
          politica: new PoliticaCompromiso({
            rigidez: bloque.rigidez,
            autoridadPlazo: bloque.autoridadPlazo,
            ajustesPermitidos: bloque.ajustesPermitidos,
          }),
        });
      } catch (error: unknown) {
        if (error instanceof ErrorDominio) {
          return this.rechazar(error.codigo, error.message, indice);
        }
        throw error;
      }
    }

    await this.repositorio.actualizar(reemplazo);

    return Object.freeze({
      exito: true,
      agenda: convertirAgendaBorradorEnDto(reemplazo),
    });
  }

  private rechazar(
    codigo: string,
    mensaje: string,
    indiceBloque?: number,
  ): ResultadoGuardarBloquesAgendaBorrador {
    return Object.freeze({
      exito: false,
      error: Object.freeze({
        codigo,
        mensaje,
        ...(indiceBloque === undefined ? {} : { indiceBloque }),
      }),
    });
  }
}
