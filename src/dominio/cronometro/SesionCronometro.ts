import { ErrorDominio } from "../compartido/ErrorDominio";
import type { Identificador } from "../compartido/tipos";
import { copiarFecha, exigirIdentificador } from "../compartido/validaciones";

export type EstadoSesionCronometro = "ACTIVA" | "PAUSADA" | "FINALIZADA";
export type TipoOperacionSesionCronometro =
  "INICIAR" | "PAUSAR" | "REANUDAR" | "DETENER";

export interface OperacionSesionCronometro {
  readonly id: Identificador;
  readonly tipo: TipoOperacionSesionCronometro;
  readonly ocurridaEn: Date;
}

export interface IntervaloSesionCronometro {
  readonly iniciadoEn: Date;
  readonly finalizadoEn?: Date;
}

interface DatosInicioSesionCronometro {
  readonly id: Identificador;
  readonly bloqueId: Identificador;
  readonly operacionId: Identificador;
  readonly iniciadaEn: Date;
}

interface DatosRehidratacionSesionCronometro {
  readonly id: Identificador;
  readonly bloqueId: Identificador;
  readonly operaciones: readonly OperacionSesionCronometro[];
}

export class SesionCronometro {
  public readonly id: Identificador;
  public readonly bloqueId: Identificador;
  private _estado: EstadoSesionCronometro = "ACTIVA";
  private _revision = 0;
  private _finalizadaEn: Date | undefined;
  private readonly operaciones: OperacionSesionCronometro[] = [];
  private readonly intervalos: Array<{
    iniciadoEn: Date;
    finalizadoEn?: Date;
  }> = [];

  private constructor(id: Identificador, bloqueId: Identificador) {
    this.id = exigirIdentificador(id, "identificador de sesión");
    this.bloqueId = exigirIdentificador(
      bloqueId,
      "identificador de bloque de la sesión",
    );
  }

  public static iniciar(datos: DatosInicioSesionCronometro): SesionCronometro {
    const sesion = new SesionCronometro(datos.id, datos.bloqueId);
    sesion.aplicarOperacion({
      id: datos.operacionId,
      tipo: "INICIAR",
      ocurridaEn: datos.iniciadaEn,
    });
    return sesion;
  }

  public static rehidratar(
    datos: DatosRehidratacionSesionCronometro,
  ): SesionCronometro {
    if (datos.operaciones.length === 0) {
      throw new ErrorDominio(
        "SESION_SIN_OPERACIONES",
        "Una sesión debe conservar al menos su operación de inicio.",
      );
    }
    const [inicio, ...restantes] = datos.operaciones;
    if (inicio?.tipo !== "INICIAR") {
      throw new ErrorDominio(
        "INICIO_SESION_INVALIDO",
        "La primera operación de una sesión debe ser INICIAR.",
      );
    }
    const sesion = SesionCronometro.iniciar({
      id: datos.id,
      bloqueId: datos.bloqueId,
      operacionId: inicio.id,
      iniciadaEn: inicio.ocurridaEn,
    });
    for (const operacion of restantes) sesion.aplicarOperacion(operacion);
    return sesion;
  }

  public get estado(): EstadoSesionCronometro {
    return this._estado;
  }

  public get revision(): number {
    return this._revision;
  }

  public get iniciadaEn(): Date {
    return new Date(this.operaciones[0]!.ocurridaEn);
  }

  public get finalizadaEn(): Date | undefined {
    return this._finalizadaEn ? new Date(this._finalizadaEn) : undefined;
  }

  public pausar(operacionId: Identificador, ocurridaEn: Date): boolean {
    return this.aplicarOperacion({
      id: operacionId,
      tipo: "PAUSAR",
      ocurridaEn,
    });
  }

  public reanudar(operacionId: Identificador, ocurridaEn: Date): boolean {
    return this.aplicarOperacion({
      id: operacionId,
      tipo: "REANUDAR",
      ocurridaEn,
    });
  }

  public detener(operacionId: Identificador, ocurridaEn: Date): boolean {
    return this.aplicarOperacion({
      id: operacionId,
      tipo: "DETENER",
      ocurridaEn,
    });
  }

  public listarOperaciones(): readonly OperacionSesionCronometro[] {
    return this.operaciones.map((operacion) =>
      Object.freeze({
        ...operacion,
        ocurridaEn: new Date(operacion.ocurridaEn),
      }),
    );
  }

  public listarIntervalos(): readonly IntervaloSesionCronometro[] {
    return this.intervalos.map((intervalo) =>
      Object.freeze({
        iniciadoEn: new Date(intervalo.iniciadoEn),
        ...(intervalo.finalizadoEn
          ? { finalizadoEn: new Date(intervalo.finalizadoEn) }
          : {}),
      }),
    );
  }

  public duracionMilisegundos(hasta: Date): number {
    const limite = copiarFecha(hasta, "instante de cálculo");
    return this.intervalos.reduce((total, intervalo) => {
      const fin = intervalo.finalizadoEn ?? limite;
      if (fin.getTime() < intervalo.iniciadoEn.getTime()) {
        throw new ErrorDominio(
          "INSTANTE_CRONOMETRO_ANTERIOR",
          "El instante de cálculo no puede preceder al intervalo activo.",
        );
      }
      return total + fin.getTime() - intervalo.iniciadoEn.getTime();
    }, 0);
  }

  private aplicarOperacion(operacion: OperacionSesionCronometro): boolean {
    if (
      operacion.tipo !== "INICIAR" &&
      operacion.tipo !== "PAUSAR" &&
      operacion.tipo !== "REANUDAR" &&
      operacion.tipo !== "DETENER"
    ) {
      throw new ErrorDominio(
        "TIPO_OPERACION_CRONOMETRO_INVALIDO",
        "El tipo de operación del cronómetro no es válido.",
      );
    }
    const id = exigirIdentificador(
      operacion.id,
      "identificador de operación del cronómetro",
    );
    const ocurridaEn = copiarFecha(
      operacion.ocurridaEn,
      "instante de operación del cronómetro",
    );
    const existente = this.operaciones.find((actual) => actual.id === id);
    if (existente) {
      if (
        existente.tipo === operacion.tipo &&
        existente.ocurridaEn.getTime() === ocurridaEn.getTime()
      ) {
        return false;
      }
      throw new ErrorDominio(
        "OPERACION_CRONOMETRO_CONFLICTIVA",
        "El identificador de operación ya describe otra transición.",
      );
    }
    const ultima = this.operaciones.at(-1);
    if (ultima && ocurridaEn.getTime() < ultima.ocurridaEn.getTime()) {
      throw new ErrorDominio(
        "ORDEN_TEMPORAL_CRONOMETRO_INVALIDO",
        "Las operaciones del cronómetro deben conservar su orden temporal.",
      );
    }
    this.transicionar(operacion.tipo, ocurridaEn);
    this.operaciones.push(
      Object.freeze({ id, tipo: operacion.tipo, ocurridaEn }),
    );
    this._revision += 1;
    return true;
  }

  private transicionar(
    tipo: TipoOperacionSesionCronometro,
    ocurridaEn: Date,
  ): void {
    if (tipo === "INICIAR") {
      if (this.operaciones.length > 0) this.errorTransicion(tipo);
      this.intervalos.push({ iniciadoEn: ocurridaEn });
      this._estado = "ACTIVA";
      return;
    }
    if (tipo === "PAUSAR") {
      if (this._estado !== "ACTIVA") this.errorTransicion(tipo);
      this.cerrarIntervaloActivo(ocurridaEn);
      this._estado = "PAUSADA";
      return;
    }
    if (tipo === "REANUDAR") {
      if (this._estado !== "PAUSADA") this.errorTransicion(tipo);
      this.intervalos.push({ iniciadoEn: ocurridaEn });
      this._estado = "ACTIVA";
      return;
    }
    if (this._estado === "FINALIZADA") this.errorTransicion(tipo);
    if (this._estado === "ACTIVA") this.cerrarIntervaloActivo(ocurridaEn);
    this._estado = "FINALIZADA";
    this._finalizadaEn = ocurridaEn;
  }

  private cerrarIntervaloActivo(finalizadoEn: Date): void {
    const intervalo = this.intervalos.at(-1);
    if (!intervalo || intervalo.finalizadoEn) {
      throw new ErrorDominio(
        "INTERVALO_ACTIVO_INEXISTENTE",
        "La sesión no posee un intervalo activo que pueda cerrarse.",
      );
    }
    intervalo.finalizadoEn = finalizadoEn;
  }

  private errorTransicion(tipo: TipoOperacionSesionCronometro): never {
    throw new ErrorDominio(
      "TRANSICION_CRONOMETRO_INVALIDA",
      `No se puede ${tipo.toLowerCase()} una sesión en estado ${this._estado}.`,
    );
  }
}
