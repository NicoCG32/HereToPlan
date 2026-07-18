import { ErrorDominio } from "../compartido/ErrorDominio";
import { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirEnteroPositivo,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";
import {
  PoliticaCompromiso,
  type VistaPoliticaCompromiso,
} from "../compromisos/PoliticaCompromiso";
import type { BloquePlanificacion } from "./BloquePlanificacion";

export const DURACION_GRACIA_MINUTOS = 10;
const DURACION_GRACIA_MILISEGUNDOS = DURACION_GRACIA_MINUTOS * 60 * 1000;

export type EstadoCortePlanificacion =
  "BORRADOR" | "EN_REVISION" | "EN_GRACIA" | "CONFIRMADA";

export interface DatosBloqueCortePlanificacion {
  id: Identificador;
  contextoId: Identificador;
  actividadId: Identificador;
  titulo: string;
  fecha: FechaLocal;
  minutosPlanificados: number;
  politica: VistaPoliticaCompromiso;
  creadoEn: Date;
}

export interface VistaBloqueCortePlanificacion extends Omit<
  DatosBloqueCortePlanificacion,
  "creadoEn"
> {
  readonly creadoEn: Date;
}

interface InstantaneaBloqueCortePlanificacion extends Omit<
  DatosBloqueCortePlanificacion,
  "creadoEn"
> {
  readonly creadoEn: Date;
}

interface DatosCreacionCortePlanificacion {
  id: Identificador;
  bloques: readonly BloquePlanificacion[];
  creadoEn: Date;
}

export interface DatosRehidratacionCortePlanificacion {
  id: Identificador;
  bloques: readonly DatosBloqueCortePlanificacion[];
  estado: EstadoCortePlanificacion;
  creadoEn: Date;
  asignadaEn?: Date;
  confirmarAutomaticamenteEn?: Date;
  confirmadaEn?: Date;
}

export class CortePlanificacion {
  public readonly id: Identificador;
  private readonly _creadoEn: Date;
  private _estado: EstadoCortePlanificacion = "BORRADOR";
  private _asignadaEn: Date | undefined;
  private _confirmarAutomaticamenteEn: Date | undefined;
  private _confirmadaEn: Date | undefined;
  private bloques: readonly InstantaneaBloqueCortePlanificacion[];

  private constructor(
    id: Identificador,
    bloques: readonly DatosBloqueCortePlanificacion[],
    creadoEn: Date,
  ) {
    this.id = exigirIdentificador(id, "identificador del corte");
    this._creadoEn = copiarFecha(creadoEn, "fecha de creación del corte");
    this.bloques = this.copiarBloques(bloques);
  }

  public static crear(
    datos: DatosCreacionCortePlanificacion,
  ): CortePlanificacion {
    return new CortePlanificacion(
      datos.id,
      datos.bloques.map((bloque) => ({
        id: bloque.id,
        contextoId: bloque.contextoId,
        actividadId: bloque.actividadId,
        titulo: bloque.titulo,
        fecha: bloque.fecha,
        minutosPlanificados: bloque.minutosPlanificados,
        politica: bloque.politica,
        creadoEn: bloque.creadoEn,
      })),
      datos.creadoEn,
    );
  }

  public static rehidratar(
    datos: DatosRehidratacionCortePlanificacion,
  ): CortePlanificacion {
    const corte = new CortePlanificacion(
      datos.id,
      datos.bloques,
      datos.creadoEn,
    );
    corte.validarEstadoRehidratado(datos);
    corte._estado = datos.estado;
    corte._asignadaEn = datos.asignadaEn
      ? copiarFecha(datos.asignadaEn, "fecha de asignación")
      : undefined;
    corte._confirmarAutomaticamenteEn = datos.confirmarAutomaticamenteEn
      ? copiarFecha(
          datos.confirmarAutomaticamenteEn,
          "fecha prevista de confirmación",
        )
      : undefined;
    corte._confirmadaEn = datos.confirmadaEn
      ? copiarFecha(datos.confirmadaEn, "fecha de confirmación")
      : undefined;
    return corte;
  }

  public get estado(): EstadoCortePlanificacion {
    return this._estado;
  }

  public get creadoEn(): Date {
    return new Date(this._creadoEn);
  }

  public get asignadaEn(): Date | undefined {
    return this._asignadaEn ? new Date(this._asignadaEn) : undefined;
  }

  public get confirmarAutomaticamenteEn(): Date | undefined {
    return this._confirmarAutomaticamenteEn
      ? new Date(this._confirmarAutomaticamenteEn)
      : undefined;
  }

  public get confirmadaEn(): Date | undefined {
    return this._confirmadaEn ? new Date(this._confirmadaEn) : undefined;
  }

  public listarBloques(): readonly VistaBloqueCortePlanificacion[] {
    return Object.freeze(
      this.bloques.map((bloque) =>
        Object.freeze({
          ...bloque,
          fecha: FechaLocal.crear(bloque.fecha.valor),
          politica: copiarPolitica(bloque.politica),
          creadoEn: new Date(bloque.creadoEn),
        }),
      ),
    );
  }

  public reemplazarBloques(bloques: readonly BloquePlanificacion[]): void {
    this.exigirEstado("BORRADOR", "CORTE_NO_EDITABLE");
    this.bloques = this.copiarBloques(
      bloques.map((bloque) => ({
        id: bloque.id,
        contextoId: bloque.contextoId,
        actividadId: bloque.actividadId,
        titulo: bloque.titulo,
        fecha: bloque.fecha,
        minutosPlanificados: bloque.minutosPlanificados,
        politica: bloque.politica,
        creadoEn: bloque.creadoEn,
      })),
    );
  }

  public iniciarRevision(): void {
    this.exigirEstado("BORRADOR", "TRANSICION_CORTE_INVALIDA");
    this.exigirBloques();
    this._estado = "EN_REVISION";
  }

  public volverABorrador(): void {
    this.exigirEstado("EN_REVISION", "TRANSICION_CORTE_INVALIDA");
    this._estado = "BORRADOR";
  }

  public asignar(instante: Date): void {
    this.exigirEstado("EN_REVISION", "TRANSICION_CORTE_INVALIDA");
    const asignadaEn = copiarFecha(instante, "fecha de asignación");
    if (asignadaEn.getTime() < this._creadoEn.getTime()) {
      throw new ErrorDominio(
        "ASIGNACION_ANTERIOR_A_CREACION",
        "Un corte no puede asignarse antes de su fecha de creación.",
      );
    }
    this._asignadaEn = asignadaEn;
    this._confirmarAutomaticamenteEn = new Date(
      asignadaEn.getTime() + DURACION_GRACIA_MILISEGUNDOS,
    );
    this._estado = "EN_GRACIA";
  }

  public corregir(instante: Date): void {
    this.exigirEstado("EN_GRACIA", "CORTE_NO_CORREGIBLE");
    this.exigirInstanteNoAnteriorAAsignacion(instante);
    this.actualizarSegunReloj(instante);
    if (this._estado === "CONFIRMADA") {
      throw new ErrorDominio(
        "CORTE_NO_CORREGIBLE",
        "Un corte confirmado ya no puede volver a borrador.",
      );
    }

    this._estado = "BORRADOR";
    this._asignadaEn = undefined;
    this._confirmarAutomaticamenteEn = undefined;
  }

  public actualizarSegunReloj(instante: Date): boolean {
    if (this._estado !== "EN_GRACIA") {
      return false;
    }
    const ahora = copiarFecha(instante, "instante del reloj");
    this.exigirInstanteNoAnteriorAAsignacion(ahora);
    const confirmarEn = this._confirmarAutomaticamenteEn!;
    if (ahora.getTime() < confirmarEn.getTime()) {
      return false;
    }

    this._estado = "CONFIRMADA";
    this._confirmadaEn = new Date(confirmarEn);
    return true;
  }

  private copiarBloques(
    bloques: readonly DatosBloqueCortePlanificacion[],
  ): readonly InstantaneaBloqueCortePlanificacion[] {
    const copias = bloques.map((bloque) => {
      const politica = copiarPolitica(bloque.politica);
      return Object.freeze({
        id: exigirIdentificador(bloque.id, "identificador del bloque"),
        contextoId: exigirIdentificador(
          bloque.contextoId,
          "identificador del contexto",
        ),
        actividadId: exigirIdentificador(
          bloque.actividadId,
          "identificador de la actividad",
        ),
        titulo: exigirTexto(
          bloque.titulo,
          "TITULO_BLOQUE_VACIO",
          "El bloque de planificación debe tener un título.",
        ),
        fecha: FechaLocal.crear(bloque.fecha.valor),
        minutosPlanificados: exigirEnteroPositivo(
          bloque.minutosPlanificados,
          "MINUTOS_BLOQUE_INVALIDOS",
          "Los minutos planificados deben ser un entero positivo.",
        ),
        politica,
        creadoEn: copiarFecha(bloque.creadoEn, "fecha de creación del bloque"),
      });
    });
    const ids = copias.map((bloque) => bloque.id);
    if (new Set(ids).size !== ids.length) {
      throw new ErrorDominio(
        "BLOQUE_CORTE_DUPLICADO",
        "Un corte de planificación no puede seleccionar el mismo bloque dos veces.",
      );
    }
    return Object.freeze(copias);
  }

  private validarEstadoRehidratado(
    datos: DatosRehidratacionCortePlanificacion,
  ): void {
    const tieneAsignacion = datos.asignadaEn !== undefined;
    const tieneVencimiento = datos.confirmarAutomaticamenteEn !== undefined;
    const tieneConfirmacion = datos.confirmadaEn !== undefined;

    if (datos.estado === "BORRADOR" || datos.estado === "EN_REVISION") {
      if (tieneAsignacion || tieneVencimiento || tieneConfirmacion) {
        throw this.errorRehidratacion();
      }
      if (datos.estado === "EN_REVISION") {
        this.exigirBloques();
      }
      return;
    }

    this.exigirBloques();
    if (!tieneAsignacion || !tieneVencimiento) {
      throw this.errorRehidratacion();
    }
    const asignadaEn = copiarFecha(datos.asignadaEn!, "fecha de asignación");
    const confirmarEn = copiarFecha(
      datos.confirmarAutomaticamenteEn!,
      "fecha prevista de confirmación",
    );
    if (
      confirmarEn.getTime() !==
        asignadaEn.getTime() + DURACION_GRACIA_MILISEGUNDOS ||
      asignadaEn.getTime() < this._creadoEn.getTime()
    ) {
      throw this.errorRehidratacion();
    }

    if (datos.estado === "EN_GRACIA" && !tieneConfirmacion) {
      return;
    }
    if (
      datos.estado === "CONFIRMADA" &&
      tieneConfirmacion &&
      datos.confirmadaEn!.getTime() === confirmarEn.getTime()
    ) {
      return;
    }
    throw this.errorRehidratacion();
  }

  private exigirBloques(): void {
    if (this.bloques.length === 0) {
      throw new ErrorDominio(
        "CORTE_SIN_BLOQUES",
        "Un corte de planificación requiere al menos un bloque.",
      );
    }
  }

  private exigirEstado(
    esperado: EstadoCortePlanificacion,
    codigo: string,
  ): void {
    if (this._estado !== esperado) {
      throw new ErrorDominio(
        codigo,
        `La operación no es válida cuando el corte está ${this._estado}.`,
      );
    }
  }

  private exigirInstanteNoAnteriorAAsignacion(instante: Date): void {
    const ahora = copiarFecha(instante, "instante del reloj");
    if (ahora.getTime() < this._asignadaEn!.getTime()) {
      throw new ErrorDominio(
        "RELOJ_ANTERIOR_A_ASIGNACION",
        "El reloj no puede retroceder a un instante anterior a la asignación.",
      );
    }
  }

  private errorRehidratacion(): ErrorDominio {
    return new ErrorDominio(
      "CORTE_REHIDRATADO_INVALIDO",
      "El estado y los instantes del corte rehidratado no son coherentes.",
    );
  }
}

function copiarPolitica(
  politica: VistaPoliticaCompromiso,
): VistaPoliticaCompromiso {
  if (politica.versionEsquema !== 1) {
    throw new ErrorDominio(
      "VERSION_POLITICA_NO_SOPORTADA",
      "La versión de la política del bloque no es compatible.",
    );
  }
  return new PoliticaCompromiso({
    rigidez: politica.rigidez,
    autoridadPlazo: politica.autoridadPlazo,
    ajustesPermitidos: politica.ajustesPermitidos,
  }).obtenerVista();
}
