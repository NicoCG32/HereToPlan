import { ErrorDominio } from "../compartido/ErrorDominio";
import type { FechaLocal } from "../compartido/FechaLocal";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";
import type { AjusteCompromiso } from "../compromisos/AjusteCompromiso";
import type { TipoAjusteCompromiso } from "../compromisos/tipos";
import {
  BloqueTrabajo,
  type DatosNuevoBloqueTrabajo,
  type VistaBloqueTrabajo,
} from "./BloqueTrabajo";
import type { EstadoAgenda } from "./tipos";

interface DatosAgenda {
  id: Identificador;
  nombre: string;
  fechaInicio: FechaLocal;
  fechaFin: FechaLocal;
  creadaEn: Date;
}

export class Agenda {
  public readonly id: Identificador;
  public readonly nombre: string;
  public readonly fechaInicio: FechaLocal;
  public readonly fechaFin: FechaLocal;
  private readonly _creadaEn: Date;
  private _estado: EstadoAgenda = "BORRADOR";
  private _confirmadaEn: Date | undefined;
  private _finalizadaEn: Date | undefined;
  private readonly bloques = new Map<Identificador, BloqueTrabajo>();
  private readonly ajustes = new Map<Identificador, AjusteCompromiso>();

  constructor(datos: DatosAgenda) {
    if (datos.fechaFin.esAnteriorA(datos.fechaInicio)) {
      throw new ErrorDominio(
        "RANGO_AGENDA_INVALIDO",
        "La fecha final de la agenda no puede ser anterior a la inicial.",
      );
    }

    this.id = exigirIdentificador(datos.id, "identificador de agenda");
    this.nombre = exigirTexto(
      datos.nombre,
      "NOMBRE_AGENDA_VACIO",
      "La agenda debe tener un nombre.",
    );
    this.fechaInicio = datos.fechaInicio;
    this.fechaFin = datos.fechaFin;
    this._creadaEn = copiarFecha(datos.creadaEn, "fecha de creación");
  }

  public get estado(): EstadoAgenda {
    return this._estado;
  }

  public get creadaEn(): Date {
    return new Date(this._creadaEn);
  }

  public get confirmadaEn(): Date | undefined {
    return this._confirmadaEn ? new Date(this._confirmadaEn) : undefined;
  }

  public get finalizadaEn(): Date | undefined {
    return this._finalizadaEn ? new Date(this._finalizadaEn) : undefined;
  }

  public agregarBloque(datos: DatosNuevoBloqueTrabajo): void {
    this.exigirBorrador();
    if (this.bloques.has(datos.id)) {
      throw new ErrorDominio(
        "BLOQUE_DUPLICADO",
        "La agenda ya contiene un bloque con ese identificador.",
      );
    }
    if (
      datos.fecha.esAnteriorA(this.fechaInicio) ||
      datos.fecha.esPosteriorA(this.fechaFin)
    ) {
      throw new ErrorDominio(
        "BLOQUE_FUERA_DE_AGENDA",
        "La fecha del bloque debe estar dentro del rango de la agenda.",
      );
    }
    this.bloques.set(datos.id, new BloqueTrabajo(datos));
  }

  public quitarBloque(bloqueId: Identificador): void {
    this.exigirBorrador();
    if (!this.bloques.delete(bloqueId)) {
      throw new ErrorDominio(
        "BLOQUE_NO_ENCONTRADO",
        "No existe el bloque indicado en la agenda.",
      );
    }
  }

  public confirmar(fecha: Date): void {
    this.exigirBorrador();
    if (this.bloques.size === 0) {
      throw new ErrorDominio(
        "AGENDA_SIN_BLOQUES",
        "Una agenda debe contener al menos un bloque antes de confirmarse.",
      );
    }
    this._estado = "CONFIRMADA";
    this._confirmadaEn = copiarFecha(fecha, "fecha de confirmación");
  }

  public completarBloque(bloqueId: Identificador, fecha: Date): void {
    this.exigirConfirmada();
    this.obtenerBloque(bloqueId).completar(fecha);
    this.finalizarSiCorresponde(fecha);
  }

  public marcarBloqueIncumplido(
    bloqueId: Identificador,
    fecha: Date,
  ): void {
    this.exigirConfirmada();
    this.obtenerBloque(bloqueId).marcarIncumplido(fecha);
    this.finalizarSiCorresponde(fecha);
  }

  public aplicarAjustes(ajustes: readonly AjusteCompromiso[]): void {
    this.exigirConfirmada();
    if (ajustes.length === 0) {
      throw new ErrorDominio(
        "AJUSTES_VACIOS",
        "Debe indicarse al menos un ajuste para aplicar.",
      );
    }

    const idsAjuste = ajustes.map((ajuste) => ajuste.id);
    const idsBloque = ajustes.map((ajuste) => ajuste.bloqueId);
    if (new Set(idsAjuste).size !== idsAjuste.length) {
      throw new ErrorDominio(
        "AJUSTE_DUPLICADO",
        "No puede aplicarse dos veces el mismo ajuste.",
      );
    }
    if (new Set(idsBloque).size !== idsBloque.length) {
      throw new ErrorDominio(
        "BLOQUE_AJUSTADO_DOS_VECES",
        "Un bloque no puede recibir dos ajustes en la misma operación.",
      );
    }
    if (ajustes.some((ajuste) => this.ajustes.has(ajuste.id))) {
      throw new ErrorDominio(
        "AJUSTE_YA_REGISTRADO",
        "Uno de los ajustes ya fue registrado en la agenda.",
      );
    }

    for (const ajuste of ajustes) {
      this.obtenerBloque(ajuste.bloqueId).validarAjuste(ajuste);
    }
    for (const ajuste of ajustes) {
      this.obtenerBloque(ajuste.bloqueId).aplicarAjuste(ajuste);
      this.ajustes.set(ajuste.id, ajuste);
    }

    this.finalizarSiCorresponde(ajustes[0]!.aplicadoEn);
  }

  public listarBloques(): readonly VistaBloqueTrabajo[] {
    return [...this.bloques.values()].map((bloque) => bloque.obtenerVista());
  }

  public listarBloquesElegibles(
    fecha: FechaLocal,
    tipoAjuste: TipoAjusteCompromiso,
  ): readonly VistaBloqueTrabajo[] {
    if (this._estado !== "CONFIRMADA") {
      return [];
    }
    return this.listarBloques().filter(
      (bloque) =>
        bloque.estado === "PENDIENTE" &&
        bloque.fecha.esIgualA(fecha) &&
        bloque.politica.rigidez === "FLEXIBLE" &&
        bloque.politica.ajustesPermitidos.includes(tipoAjuste),
    );
  }

  public listarAjustes(): readonly AjusteCompromiso[] {
    return [...this.ajustes.values()];
  }

  private obtenerBloque(bloqueId: Identificador): BloqueTrabajo {
    const bloque = this.bloques.get(bloqueId);
    if (!bloque) {
      throw new ErrorDominio(
        "BLOQUE_NO_ENCONTRADO",
        "No existe el bloque indicado en la agenda.",
      );
    }
    return bloque;
  }

  private exigirBorrador(): void {
    if (this._estado !== "BORRADOR") {
      throw new ErrorDominio(
        "AGENDA_NO_EDITABLE",
        "Una agenda confirmada no puede volver a editarse.",
      );
    }
  }

  private exigirConfirmada(): void {
    if (this._estado !== "CONFIRMADA") {
      throw new ErrorDominio(
        "AGENDA_NO_CONFIRMADA",
        "La operación requiere una agenda confirmada y vigente.",
      );
    }
  }

  private finalizarSiCorresponde(fecha: Date): void {
    const todosResueltos = [...this.bloques.values()].every(
      (bloque) => bloque.estado !== "PENDIENTE",
    );
    if (todosResueltos) {
      this._estado = "FINALIZADA";
      this._finalizadaEn = copiarFecha(fecha, "fecha de finalización");
    }
  }
}





