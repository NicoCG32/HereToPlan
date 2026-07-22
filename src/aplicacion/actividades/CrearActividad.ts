import {
  EstructuraTareas,
  ErrorDominio,
  FechaLocal,
  Habito,
  PoliticaCompromiso,
  Tarea,
  type Actividad,
  type ModoSeguimiento,
  type TipoFrecuenciaHabito,
  type TipoTarea,
} from "../../dominio";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import type { Reloj } from "../puertos/Reloj";
import {
  ErrorActividadDuplicada,
  type RepositorioActividades,
} from "../puertos/RepositorioActividades";
import { convertirActividadADto, type ActividadDto } from "./ActividadDto";

interface ComandoActividadBase {
  readonly titulo: string;
  readonly descripcion?: string;
  readonly tiempoNecesarioMinutos: number;
  readonly modoSeguimiento?: ModoSeguimiento;
  readonly politicaPredeterminada?: ComandoPoliticaActividad;
}

export interface ComandoPoliticaActividad {
  readonly rigidez: "ESTRICTO" | "FLEXIBLE";
  readonly autoridadPlazo: "PERSONAL" | "EXTERNA";
  readonly ajustesPermitidos?: readonly (
    "EXCUSAR" | "REPROGRAMAR" | "EXTENDER_PLAZO" | "REDUCIR_CARGA"
  )[];
}

export interface ComandoCrearTarea extends ComandoActividadBase {
  readonly tipo: TipoTarea;
  readonly fechaLimite?: string;
  readonly subtareasIds?: readonly string[];
}

export interface ComandoCrearHabito extends ComandoActividadBase {
  readonly tipo: "HABITO";
  readonly frecuencia: TipoFrecuenciaHabito;
  readonly diasSemana?: readonly number[];
}

export type ComandoCrearActividad = ComandoCrearTarea | ComandoCrearHabito;

export type CodigoErrorCrearActividad =
  | "TITULO_ACTIVIDAD_VACIO"
  | "TIEMPO_NECESARIO_INVALIDO"
  | "TIEMPO_HABITO_INVALIDO"
  | "FECHA_LOCAL_INVALIDA"
  | "FECHA_LOCAL_INEXISTENTE"
  | "TAREA_SE_CONTIENE_A_SI_MISMA"
  | "TAREA_SIMPLE_CON_SUBTAREAS"
  | "SUBTAREA_NO_ENCONTRADA"
  | "CICLO_ENTRE_TAREAS"
  | "FRECUENCIA_HABITO_INVALIDA"
  | "DIA_SEMANA_INVALIDO"
  | "HABITO_DIARIO_CON_DIAS"
  | "HABITO_SEMANAL_SIN_DIA_UNICO"
  | "HABITO_SIN_DIAS"
  | "COMPROMISO_ESTRICTO_CON_AJUSTES"
  | "PLAZO_EXTERNO_EXTENDIBLE"
  | "MODO_SEGUIMIENTO_INVALIDO"
  | "IDENTIFICADOR_ACTIVIDAD_DUPLICADO";

export type CampoCrearActividad =
  | "titulo"
  | "tiempoNecesarioMinutos"
  | "fechaLimite"
  | "subtareasIds"
  | "frecuencia"
  | "diasSemana"
  | "politicaPredeterminada"
  | "modoSeguimiento";

export type ResultadoCrearActividad =
  | Readonly<{ exito: true; actividad: ActividadDto }>
  | Readonly<{
      exito: false;
      error: Readonly<{
        codigo: CodigoErrorCrearActividad;
        mensaje: string;
        campo?: CampoCrearActividad;
      }>;
    }>;

export interface CrearActividad {
  ejecutar(comando: ComandoCrearActividad): Promise<ResultadoCrearActividad>;
}

const CAMPOS_POR_ERROR: Partial<
  Record<CodigoErrorCrearActividad, CampoCrearActividad>
> = {
  TITULO_ACTIVIDAD_VACIO: "titulo",
  TIEMPO_NECESARIO_INVALIDO: "tiempoNecesarioMinutos",
  TIEMPO_HABITO_INVALIDO: "tiempoNecesarioMinutos",
  FECHA_LOCAL_INVALIDA: "fechaLimite",
  FECHA_LOCAL_INEXISTENTE: "fechaLimite",
  TAREA_SE_CONTIENE_A_SI_MISMA: "subtareasIds",
  TAREA_SIMPLE_CON_SUBTAREAS: "subtareasIds",
  SUBTAREA_NO_ENCONTRADA: "subtareasIds",
  CICLO_ENTRE_TAREAS: "subtareasIds",
  FRECUENCIA_HABITO_INVALIDA: "frecuencia",
  DIA_SEMANA_INVALIDO: "diasSemana",
  HABITO_DIARIO_CON_DIAS: "diasSemana",
  HABITO_SEMANAL_SIN_DIA_UNICO: "diasSemana",
  HABITO_SIN_DIAS: "diasSemana",
  COMPROMISO_ESTRICTO_CON_AJUSTES: "politicaPredeterminada",
  PLAZO_EXTERNO_EXTENDIBLE: "politicaPredeterminada",
  MODO_SEGUIMIENTO_INVALIDO: "modoSeguimiento",
};

export class CasoDeUsoCrearActividad implements CrearActividad {
  constructor(
    private readonly repositorio: RepositorioActividades,
    private readonly reloj: Reloj,
    private readonly generadorIdentificadores: GeneradorIdentificadores,
  ) {}

  public async ejecutar(
    comando: ComandoCrearActividad,
  ): Promise<ResultadoCrearActividad> {
    const id = this.generadorIdentificadores.generar();

    try {
      if ((await this.repositorio.obtenerPorId(id)) !== undefined) {
        return this.rechazarDuplicado(id);
      }

      const actividad = await this.crearEntidad(id, comando);
      await this.repositorio.guardar(actividad);
      return Object.freeze({
        exito: true,
        actividad: convertirActividadADto(actividad),
      });
    } catch (error: unknown) {
      if (error instanceof ErrorActividadDuplicada) {
        return this.rechazarDuplicado(error.id);
      }
      if (error instanceof ErrorDominio) {
        const codigo = error.codigo as CodigoErrorCrearActividad;
        if (codigo in CAMPOS_POR_ERROR) {
          const campo = CAMPOS_POR_ERROR[codigo];
          return Object.freeze({
            exito: false,
            error: Object.freeze({
              codigo,
              mensaje: error.message,
              ...(campo ? { campo } : {}),
            }),
          });
        }
      }
      throw error;
    }
  }

  private async crearEntidad(
    id: string,
    comando: ComandoCrearActividad,
  ): Promise<Actividad> {
    const comunes = {
      id,
      titulo: comando.titulo,
      ...(comando.descripcion !== undefined
        ? { descripcion: comando.descripcion }
        : {}),
      tiempoNecesarioMinutos: comando.tiempoNecesarioMinutos,
      modoSeguimiento: comando.modoSeguimiento ?? "MANUAL",
      creadaEn: this.reloj.ahora(),
      ...(comando.politicaPredeterminada
        ? {
            politicaPredeterminada: new PoliticaCompromiso({
              rigidez: comando.politicaPredeterminada.rigidez,
              autoridadPlazo: comando.politicaPredeterminada.autoridadPlazo,
              ...(comando.politicaPredeterminada.ajustesPermitidos
                ? {
                    ajustesPermitidos:
                      comando.politicaPredeterminada.ajustesPermitidos,
                  }
                : {}),
            }),
          }
        : {}),
    };

    if (comando.tipo === "HABITO") {
      return new Habito({
        ...comunes,
        frecuencia: comando.frecuencia,
        ...(comando.diasSemana ? { diasSemana: comando.diasSemana } : {}),
      });
    }

    const tarea = new Tarea({
      ...comunes,
      tipo: comando.tipo,
      ...(comando.fechaLimite
        ? { fechaLimite: FechaLocal.crear(comando.fechaLimite) }
        : {}),
      ...(comando.subtareasIds ? { subtareasIds: comando.subtareasIds } : {}),
    });
    const existentes = (await this.repositorio.listar()).filter(
      (actividad): actividad is Tarea => actividad instanceof Tarea,
    );
    EstructuraTareas.validar([...existentes, tarea]);
    return tarea;
  }

  private rechazarDuplicado(id: string): ResultadoCrearActividad {
    return Object.freeze({
      exito: false,
      error: Object.freeze({
        codigo: "IDENTIFICADOR_ACTIVIDAD_DUPLICADO",
        mensaje: `Ya existe una actividad con el identificador ${id}.`,
      }),
    });
  }
}
