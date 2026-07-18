import { ErrorDominio } from "../compartido/ErrorDominio";
import type { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
} from "../compartido/validaciones";
import { Actividad, type DatosActividad } from "./Actividad";
import { esTipoTarea, type EstadoTarea, type TipoTarea } from "./tipos";

export interface DatosTarea extends Omit<DatosActividad, "tipo"> {
  tipo: TipoTarea;
  tiempoNecesarioMinutos: number;
  fechaLimite?: FechaLocal;
  subtareasIds?: Iterable<Identificador>;
}

export interface DatosRehidratacionTarea extends DatosTarea {
  estado: EstadoTarea;
  resueltaEn?: Date;
}

export class Tarea extends Actividad {
  public readonly tipo: TipoTarea;
  public readonly tiempoNecesarioMinutos: number;
  public readonly fechaLimite: FechaLocal | undefined;
  private readonly subtareasIds: ReadonlySet<Identificador>;
  private _estado: EstadoTarea = "PENDIENTE";
  private _resueltaEn: Date | undefined;

  constructor(datos: DatosTarea) {
    super(datos);
    if (!esTipoTarea(datos.tipo)) {
      throw new ErrorDominio(
        "TIPO_TAREA_INVALIDO",
        "Una tarea debe ser simple, compuesta o proyecto.",
      );
    }
    this.tipo = datos.tipo;
    this.tiempoNecesarioMinutos = exigirEnteroPositivo(
      datos.tiempoNecesarioMinutos,
      "TIEMPO_NECESARIO_INVALIDO",
      "El tiempo necesario debe ser un entero positivo de minutos.",
    );
    this.fechaLimite = datos.fechaLimite;
    this.subtareasIds = new Set(
      [...(datos.subtareasIds ?? [])].map((id) =>
        exigirIdentificador(id, "identificador de subtarea"),
      ),
    );

    if (this.subtareasIds.has(this.id)) {
      throw new ErrorDominio(
        "TAREA_SE_CONTIENE_A_SI_MISMA",
        "Una tarea no puede declararse como su propia subtarea.",
      );
    }
    if (this.tipo === "TAREA_SIMPLE" && this.subtareasIds.size > 0) {
      throw new ErrorDominio(
        "TAREA_SIMPLE_CON_SUBTAREAS",
        "Una tarea simple no puede contener subtareas.",
      );
    }
  }

  public static rehidratar(datos: DatosRehidratacionTarea): Tarea {
    const tarea = new Tarea(datos);
    const estadosValidos: readonly EstadoTarea[] = [
      "PENDIENTE",
      "COMPLETADA",
      "NO_COMPLETADA",
    ];
    if (!estadosValidos.includes(datos.estado)) {
      throw new ErrorDominio(
        "ESTADO_TAREA_INVALIDO",
        "El estado de la tarea no es reconocido.",
      );
    }
    const pendiente = datos.estado === "PENDIENTE";
    if (pendiente === (datos.resueltaEn !== undefined)) {
      throw new ErrorDominio(
        "RESOLUCION_TAREA_INCOHERENTE",
        "Una tarea pendiente no tiene resolución y una resuelta debe conservarla.",
      );
    }
    tarea._estado = datos.estado;
    tarea._resueltaEn = datos.resueltaEn
      ? copiarFecha(datos.resueltaEn, "fecha de resolución")
      : undefined;
    return tarea;
  }

  public get estado(): EstadoTarea {
    return this._estado;
  }

  public get resueltaEn(): Date | undefined {
    return this._resueltaEn ? new Date(this._resueltaEn) : undefined;
  }

  public listarSubtareasIds(): readonly Identificador[] {
    return [...this.subtareasIds];
  }

  public confirmarComplecion(
    fecha: Date,
    todasLasSubtareasCompletadas: boolean,
  ): void {
    this.exigirPendiente();
    if (this.subtareasIds.size > 0 && !todasLasSubtareasCompletadas) {
      throw new ErrorDominio(
        "SUBTAREAS_PENDIENTES",
        "No puede completarse la tarea mientras existan subtareas pendientes.",
      );
    }
    this._estado = "COMPLETADA";
    this._resueltaEn = copiarFecha(fecha, "fecha de resolución");
  }

  public marcarNoCompletada(fecha: Date): void {
    this.exigirPendiente();
    this._estado = "NO_COMPLETADA";
    this._resueltaEn = copiarFecha(fecha, "fecha de resolución");
  }

  private exigirPendiente(): void {
    if (this._estado !== "PENDIENTE") {
      throw new ErrorDominio(
        "ACTIVIDAD_YA_RESUELTA",
        "Una actividad resuelta no puede resolverse nuevamente.",
      );
    }
  }
}
