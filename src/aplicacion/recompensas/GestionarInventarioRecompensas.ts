import {
  BilleteraPuntos,
  RecompensaAdquirida,
  TransaccionPuntos,
  type RecompensaDefinida,
} from "../../dominio";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import {
  ErrorAdquisicionRecompensaDuplicada,
  type RepositorioInventarioRecompensas,
  type UnidadTrabajoAdquisicionRecompensa,
} from "../puertos/InventarioRecompensas";
import type { Reloj } from "../puertos/Reloj";
import type { RepositorioTransaccionesPuntos } from "../puertos/RepositorioTransaccionesPuntos";

export interface RecompensaCatalogoDto {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly costoPuntos: number;
  readonly tipoEfecto: string;
  readonly saldoActual: number;
  readonly puedeAdquirir: boolean;
  readonly motivoNoDisponible?: string;
}

export interface RecompensaAdquiridaDto {
  readonly id: string;
  readonly recompensaId: string;
  readonly nombre: string;
  readonly puntosGastados: number;
  readonly adquiridaEn: string;
  readonly estado: "DISPONIBLE" | "CONSUMIDA";
  readonly aplicacionId?: string;
  readonly consumidaEn?: string;
}

export interface AplicacionRecompensaDto {
  readonly id: string;
  readonly recompensaAdquiridaId: string;
  readonly recompensaId: string;
  readonly nombre: string;
  readonly puntosGastados: number;
  readonly aplicadaEn: string;
  readonly fechaObjetivo: string;
  readonly bloquesAfectados: readonly string[];
}

export interface InventarioRecompensasDto {
  readonly disponibles: readonly RecompensaAdquiridaDto[];
  readonly consumidas: readonly RecompensaAdquiridaDto[];
  readonly aplicaciones: readonly AplicacionRecompensaDto[];
}

export interface AdquisicionRecompensaDto {
  readonly recompensa: RecompensaAdquiridaDto;
  readonly movimientoId: string;
  readonly saldoPosterior: number;
  readonly reintentoIdempotente: boolean;
}

export class ErrorAdquisicionRecompensaAplicacion extends Error {
  constructor(
    public readonly codigo:
      "RECOMPENSA_NO_DEFINIDA" | "OPERACION_ADQUISICION_CONFLICTIVA",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorAdquisicionRecompensaAplicacion";
  }
}

export class CasoDeUsoConsultarCatalogoRecompensas {
  constructor(
    private readonly definiciones: readonly RecompensaDefinida[],
    private readonly repositorioTransacciones: RepositorioTransaccionesPuntos,
  ) {}

  public async ejecutar(): Promise<readonly RecompensaCatalogoDto[]> {
    const billetera = BilleteraPuntos.rehidratar(
      await this.repositorioTransacciones.listar(),
    );
    return Object.freeze(
      this.definiciones.map((definicion) => {
        const puedeAdquirir = billetera.saldo >= definicion.costoPuntos;
        return Object.freeze({
          id: definicion.id,
          nombre: definicion.nombre,
          descripcion: definicion.descripcion,
          costoPuntos: definicion.costoPuntos,
          tipoEfecto: definicion.tipoEfecto,
          saldoActual: billetera.saldo,
          puedeAdquirir,
          ...(puedeAdquirir
            ? {}
            : {
                motivoNoDisponible: `Necesitas ${definicion.costoPuntos - billetera.saldo} puntos adicionales.`,
              }),
        });
      }),
    );
  }
}

interface DependenciasAdquisicion {
  readonly definiciones: readonly RecompensaDefinida[];
  readonly repositorioInventario: RepositorioInventarioRecompensas;
  readonly repositorioTransacciones: RepositorioTransaccionesPuntos;
  readonly unidadTrabajo: UnidadTrabajoAdquisicionRecompensa;
  readonly reloj: Reloj;
  readonly generadorIdentificadores: GeneradorIdentificadores;
}

export class CasoDeUsoAdquirirRecompensa {
  constructor(private readonly dependencias: DependenciasAdquisicion) {}

  public async ejecutar(comando: {
    readonly operacionId: string;
    readonly recompensaId: string;
  }): Promise<AdquisicionRecompensaDto> {
    const definicion = this.buscarDefinicion(comando.recompensaId);
    const existente =
      await this.dependencias.repositorioInventario.obtenerAdquiridaPorId(
        comando.operacionId,
      );
    if (existente) {
      this.validarReintento(existente.recompensaId, definicion.id);
      return this.convertirResultado(existente, true);
    }

    const billetera = BilleteraPuntos.rehidratar(
      await this.dependencias.repositorioTransacciones.listar(),
    );
    const adquiridaEn = this.dependencias.reloj.ahora();
    const adquirida = new RecompensaAdquirida({
      id: comando.operacionId,
      recompensaId: definicion.id,
      puntosGastados: definicion.costoPuntos,
      adquiridaEn,
    });
    const gasto = new TransaccionPuntos({
      id: this.dependencias.generadorIdentificadores.generar(),
      tipo: "GASTO",
      cantidad: definicion.costoPuntos,
      fuenteTipo: "ADQUISICION_RECOMPENSA",
      fuenteId: adquirida.id,
      descripcion: `Adquisición de recompensa: ${definicion.nombre}`,
      ocurridaEn: adquiridaEn,
    });
    billetera.registrar(gasto);

    try {
      await this.dependencias.unidadTrabajo.confirmarAdquisicion(
        adquirida,
        gasto,
      );
      return this.convertirResultado(adquirida, false, gasto.id);
    } catch (causa: unknown) {
      if (!(causa instanceof ErrorAdquisicionRecompensaDuplicada)) throw causa;
      const ganadora =
        await this.dependencias.repositorioInventario.obtenerAdquiridaPorId(
          comando.operacionId,
        );
      if (!ganadora) {
        throw new ErrorAdquisicionRecompensaAplicacion(
          "OPERACION_ADQUISICION_CONFLICTIVA",
          "Otra adquisición modificó el saldo antes de confirmar.",
          causa,
        );
      }
      this.validarReintento(ganadora.recompensaId, definicion.id);
      return this.convertirResultado(ganadora, true);
    }
  }

  private buscarDefinicion(id: string): RecompensaDefinida {
    const definicion = this.dependencias.definiciones.find(
      (actual) => actual.id === id,
    );
    if (!definicion) {
      throw new ErrorAdquisicionRecompensaAplicacion(
        "RECOMPENSA_NO_DEFINIDA",
        "La recompensa solicitada no pertenece al catálogo vigente.",
      );
    }
    return definicion;
  }

  private validarReintento(actual: string, solicitado: string): void {
    if (actual !== solicitado) {
      throw new ErrorAdquisicionRecompensaAplicacion(
        "OPERACION_ADQUISICION_CONFLICTIVA",
        "El identificador de operación ya corresponde a otra recompensa.",
      );
    }
  }

  private async convertirResultado(
    adquirida: RecompensaAdquirida,
    reintentoIdempotente: boolean,
    movimientoConocido?: string,
  ): Promise<AdquisicionRecompensaDto> {
    const transacciones =
      await this.dependencias.repositorioTransacciones.listar();
    const movimiento =
      movimientoConocido ??
      transacciones.find(
        (actual) =>
          actual.fuenteTipo === "ADQUISICION_RECOMPENSA" &&
          actual.fuenteId === adquirida.id,
      )?.id;
    if (!movimiento) {
      throw new ErrorAdquisicionRecompensaAplicacion(
        "OPERACION_ADQUISICION_CONFLICTIVA",
        "La adquisición no posee su movimiento de puntos asociado.",
      );
    }
    const billetera = BilleteraPuntos.rehidratar(transacciones);
    return Object.freeze({
      recompensa: convertirAdquiridaDto(
        adquirida,
        this.buscarDefinicion(adquirida.recompensaId).nombre,
      ),
      movimientoId: movimiento,
      saldoPosterior: billetera.saldo,
      reintentoIdempotente,
    });
  }
}

export class CasoDeUsoConsultarInventarioRecompensas {
  constructor(
    private readonly definiciones: readonly RecompensaDefinida[],
    private readonly repositorio: RepositorioInventarioRecompensas,
  ) {}

  public async ejecutar(): Promise<InventarioRecompensasDto> {
    const [adquiridas, aplicaciones] = await Promise.all([
      this.repositorio.listarAdquiridas(),
      this.repositorio.listarAplicaciones(),
    ]);
    const nombres = new Map(
      this.definiciones.map((definicion) => [definicion.id, definicion.nombre]),
    );
    const unidades = [...adquiridas]
      .sort(
        (a, b) =>
          b.adquiridaEn.getTime() - a.adquiridaEn.getTime() ||
          b.id.localeCompare(a.id),
      )
      .map((adquirida) =>
        convertirAdquiridaDto(
          adquirida,
          nombres.get(adquirida.recompensaId) ?? "Recompensa histórica",
        ),
      );
    const aplicacionesDto = [...aplicaciones]
      .sort(
        (a, b) =>
          b.aplicadaEn.getTime() - a.aplicadaEn.getTime() ||
          b.id.localeCompare(a.id),
      )
      .map((aplicacion) =>
        Object.freeze({
          id: aplicacion.id,
          recompensaAdquiridaId: aplicacion.recompensaAdquiridaId,
          recompensaId: aplicacion.recompensaId,
          nombre:
            nombres.get(aplicacion.recompensaId) ?? "Recompensa histórica",
          puntosGastados: aplicacion.puntosGastados,
          aplicadaEn: aplicacion.aplicadaEn.toISOString(),
          fechaObjetivo: aplicacion.fechaObjetivo.toString(),
          bloquesAfectados: Object.freeze([
            ...aplicacion.listarBloquesAfectados(),
          ]),
        }),
      );
    return Object.freeze({
      disponibles: Object.freeze(
        unidades.filter((unidad) => unidad.estado === "DISPONIBLE"),
      ),
      consumidas: Object.freeze(
        unidades.filter((unidad) => unidad.estado === "CONSUMIDA"),
      ),
      aplicaciones: Object.freeze(aplicacionesDto),
    });
  }
}

function convertirAdquiridaDto(
  adquirida: RecompensaAdquirida,
  nombre: string,
): RecompensaAdquiridaDto {
  return Object.freeze({
    id: adquirida.id,
    recompensaId: adquirida.recompensaId,
    nombre,
    puntosGastados: adquirida.puntosGastados,
    adquiridaEn: adquirida.adquiridaEn.toISOString(),
    estado: adquirida.estado,
    ...(adquirida.aplicacionId ? { aplicacionId: adquirida.aplicacionId } : {}),
    ...(adquirida.consumidaEn
      ? { consumidaEn: adquirida.consumidaEn.toISOString() }
      : {}),
  });
}
