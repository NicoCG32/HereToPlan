import {
  BilleteraPuntos,
  ErrorDominio,
  FechaLocal,
  ServicioDiaLibrePlanificacion,
  type BloqueEvaluableDiaLibre,
  type CanjeRecompensa,
  type DefinicionRecompensa,
  type EvaluacionDiaLibre,
  type MotivoProteccionDiaLibre,
  type VistaBloqueCortePlanificacion,
} from "../../dominio";
import type { CalendarioLocal } from "../puertos/CalendarioLocal";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import type { Reloj } from "../puertos/Reloj";
import type { RepositorioContextosPlanificacion } from "../puertos/RepositorioContextosPlanificacion";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";
import type { RepositorioResolucionesBloquesPlanificacion } from "../puertos/RepositorioResolucionesBloquesPlanificacion";
import type { RepositorioTransaccionesPuntos } from "../puertos/RepositorioTransaccionesPuntos";
import {
  ErrorConfirmacionCanjeDiaLibreDuplicada,
  type RepositorioAjustesCompromisos,
  type RepositorioCanjesRecompensas,
  type UnidadTrabajoCanjeDiaLibre,
} from "../puertos/UnidadTrabajoCanjeDiaLibre";

export interface BloqueVistaPreviaDiaLibreDto {
  readonly id: string;
  readonly titulo: string;
  readonly contextoId: string;
  readonly contextoNombre: string;
}

export type MotivoProteccionDiaLibreDto = MotivoProteccionDiaLibre;

export interface BloqueProtegidoDiaLibreDto extends BloqueVistaPreviaDiaLibreDto {
  readonly motivo: MotivoProteccionDiaLibreDto;
}

export interface VistaPreviaDiaLibreDto {
  readonly fechaObjetivo: string;
  readonly recompensa: Readonly<{
    id: string;
    nombre: string;
    descripcion: string;
  }>;
  readonly costoPuntos: number;
  readonly saldoActual: number;
  readonly saldoPosterior: number;
  readonly saldoSuficiente: boolean;
  readonly puedeCanjear: boolean;
  readonly afectados: readonly BloqueVistaPreviaDiaLibreDto[];
  readonly protegidos: readonly BloqueProtegidoDiaLibreDto[];
}

export interface CanjeDiaLibreDto {
  readonly id: string;
  readonly recompensaId: string;
  readonly fechaObjetivo: string;
  readonly canjeadoEn: string;
  readonly puntosGastados: number;
  readonly movimientoId: string;
  readonly bloquesAfectados: readonly BloqueVistaPreviaDiaLibreDto[];
  readonly contextosAfectados: readonly Readonly<{
    id: string;
    nombre: string;
  }>[];
  readonly reintentoIdempotente: boolean;
}

interface DependenciasLecturaDiaLibre {
  readonly repositorioCortes: RepositorioCortesPlanificacion;
  readonly repositorioResoluciones: RepositorioResolucionesBloquesPlanificacion;
  readonly repositorioTransacciones: RepositorioTransaccionesPuntos;
  readonly repositorioAjustes: RepositorioAjustesCompromisos;
  readonly repositorioContextos: RepositorioContextosPlanificacion;
  readonly calendarioLocal: CalendarioLocal;
  readonly recompensa: DefinicionRecompensa;
  readonly servicio?: ServicioDiaLibrePlanificacion;
}

export class CasoDeUsoPrepararCanjeDiaLibre {
  private readonly cargador: CargadorDiaLibre;

  constructor(dependencias: DependenciasLecturaDiaLibre) {
    this.cargador = new CargadorDiaLibre(dependencias);
  }

  public async ejecutar(
    fechaObjetivo: string,
  ): Promise<VistaPreviaDiaLibreDto> {
    return (await this.cargador.cargar(fechaObjetivo)).vistaPrevia;
  }
}

interface DependenciasCanjearDiaLibre extends DependenciasLecturaDiaLibre {
  readonly repositorioCanjes: RepositorioCanjesRecompensas;
  readonly unidadTrabajo: UnidadTrabajoCanjeDiaLibre;
  readonly reloj: Reloj;
  readonly generadorIdentificadores: GeneradorIdentificadores;
}

export class ErrorCanjeDiaLibreAplicacion extends Error {
  constructor(
    public readonly codigo: "OPERACION_CANJE_CONFLICTIVA",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorCanjeDiaLibreAplicacion";
  }
}

export class CasoDeUsoCanjearDiaLibre {
  private readonly cargador: CargadorDiaLibre;
  private readonly servicio: ServicioDiaLibrePlanificacion;

  constructor(private readonly dependencias: DependenciasCanjearDiaLibre) {
    this.servicio =
      dependencias.servicio ?? new ServicioDiaLibrePlanificacion();
    this.cargador = new CargadorDiaLibre({
      ...dependencias,
      servicio: this.servicio,
    });
  }

  public async ejecutar(comando: {
    readonly operacionId: string;
    readonly fechaObjetivo: string;
  }): Promise<CanjeDiaLibreDto> {
    const existente =
      await this.dependencias.repositorioCanjes.obtenerCanjePorId(
        comando.operacionId,
      );
    if (existente) {
      this.validarReintento(existente, comando.fechaObjetivo);
      return this.cargador.convertirCanjeADto(existente, true);
    }

    const carga = await this.cargador.cargar(comando.fechaObjetivo);
    const preparado = this.servicio.preparar({
      idCanje: comando.operacionId,
      idTransaccion: this.dependencias.generadorIdentificadores.generar(),
      crearIdAjuste: () => this.dependencias.generadorIdentificadores.generar(),
      recompensa: this.dependencias.recompensa,
      billetera: carga.billetera,
      bloques: carga.bloquesEvaluables,
      fechaObjetivo: carga.fechaObjetivo,
      fechaActual: carga.fechaActual,
      fechaCanje: this.dependencias.reloj.ahora(),
    });
    try {
      await this.dependencias.unidadTrabajo.confirmar(
        preparado.canje,
        preparado.gasto,
        preparado.ajustes,
      );
      return this.cargador.convertirCanjeADto(
        preparado.canje,
        false,
        preparado.gasto.id,
      );
    } catch (error: unknown) {
      if (!(error instanceof ErrorConfirmacionCanjeDiaLibreDuplicada)) {
        throw error;
      }
      const ganador =
        await this.dependencias.repositorioCanjes.obtenerCanjePorId(
          comando.operacionId,
        );
      if (!ganador) {
        throw new ErrorCanjeDiaLibreAplicacion(
          "OPERACION_CANJE_CONFLICTIVA",
          "Otro canje modificó uno de los bloques o el saldo antes de confirmar.",
          error,
        );
      }
      this.validarReintento(ganador, comando.fechaObjetivo);
      return this.cargador.convertirCanjeADto(ganador, true);
    }
  }

  private validarReintento(
    canje: CanjeRecompensa,
    fechaObjetivo: string,
  ): void {
    if (
      canje.recompensaId !== this.dependencias.recompensa.id ||
      canje.fechaObjetivo.toString() !== fechaObjetivo
    ) {
      throw new ErrorCanjeDiaLibreAplicacion(
        "OPERACION_CANJE_CONFLICTIVA",
        "El identificador de operación ya corresponde a otro canje.",
      );
    }
  }
}

export class CasoDeUsoListarCanjesDiaLibre {
  private readonly cargador: CargadorDiaLibre;

  constructor(
    dependencias: DependenciasLecturaDiaLibre & {
      readonly repositorioCanjes: RepositorioCanjesRecompensas;
    },
  ) {
    this.repositorioCanjes = dependencias.repositorioCanjes;
    this.cargador = new CargadorDiaLibre(dependencias);
  }

  private readonly repositorioCanjes: RepositorioCanjesRecompensas;

  public async ejecutar(): Promise<readonly CanjeDiaLibreDto[]> {
    const canjes = await this.repositorioCanjes.listarCanjes();
    const resultados = await Promise.all(
      [...canjes]
        .sort(
          (a, b) =>
            b.canjeadoEn.getTime() - a.canjeadoEn.getTime() ||
            b.id.localeCompare(a.id),
        )
        .map((canje) => this.cargador.convertirCanjeADto(canje, false)),
    );
    return Object.freeze(resultados);
  }
}

interface CargaDiaLibre {
  readonly fechaObjetivo: FechaLocal;
  readonly fechaActual: FechaLocal;
  readonly billetera: BilleteraPuntos;
  readonly bloquesEvaluables: readonly BloqueEvaluableDiaLibre[];
  readonly vistaPrevia: VistaPreviaDiaLibreDto;
}

class CargadorDiaLibre {
  private readonly servicio: ServicioDiaLibrePlanificacion;

  constructor(private readonly dependencias: DependenciasLecturaDiaLibre) {
    this.servicio =
      dependencias.servicio ?? new ServicioDiaLibrePlanificacion();
  }

  public async cargar(fecha: string): Promise<CargaDiaLibre> {
    const fechaObjetivo = FechaLocal.crear(fecha);
    const fechaActual = this.dependencias.calendarioLocal.hoy();
    const [cortes, resoluciones, transacciones, ajustes, contextos] =
      await Promise.all([
        this.dependencias.repositorioCortes.listar(),
        this.dependencias.repositorioResoluciones.listar(),
        this.dependencias.repositorioTransacciones.listar(),
        this.dependencias.repositorioAjustes.listarAjustes(),
        this.dependencias.repositorioContextos.listar(),
      ]);
    const bloques = cortes
      .filter((corte) => corte.estado === "CONFIRMADA")
      .flatMap((corte) => corte.listarBloques());
    const resolucionesPorBloque = new Set(
      resoluciones.map((resolucion) => resolucion.bloqueId),
    );
    const ajustesPorBloque = new Set(ajustes.map((ajuste) => ajuste.bloqueId));
    const bloquesEvaluables = bloques.map((bloque) => ({
      id: bloque.id,
      fecha: bloque.fecha,
      politica: bloque.politica,
      estado: ajustesPorBloque.has(bloque.id)
        ? ("EXCUSADO" as const)
        : resolucionesPorBloque.has(bloque.id)
          ? ("RESUELTO" as const)
          : ("PENDIENTE" as const),
    }));
    const billetera = BilleteraPuntos.rehidratar(transacciones);
    const evaluacion = this.servicio.evaluar({
      recompensa: this.dependencias.recompensa,
      billetera,
      bloques: bloquesEvaluables,
      fechaObjetivo,
      fechaActual,
    });
    const detalles = construirDetalles(bloques, contextos);
    return Object.freeze({
      fechaObjetivo,
      fechaActual,
      billetera,
      bloquesEvaluables: Object.freeze(bloquesEvaluables),
      vistaPrevia: convertirEvaluacionADto(
        evaluacion,
        fechaObjetivo,
        this.dependencias.recompensa,
        detalles,
      ),
    });
  }

  public async convertirCanjeADto(
    canje: CanjeRecompensa,
    reintentoIdempotente: boolean,
    movimientoConocido?: string,
  ): Promise<CanjeDiaLibreDto> {
    const [cortes, contextos, transacciones] = await Promise.all([
      this.dependencias.repositorioCortes.listar(),
      this.dependencias.repositorioContextos.listar(),
      this.dependencias.repositorioTransacciones.listar(),
    ]);
    const detalles = construirDetalles(
      cortes.flatMap((corte) => corte.listarBloques()),
      contextos,
    );
    const bloquesAfectados = canje
      .listarBloquesAfectados()
      .map((id) => detalles.get(id) ?? detalleDesconocido(id));
    const contextosAfectados = [
      ...new Map(
        bloquesAfectados.map((bloque) => [
          bloque.contextoId,
          Object.freeze({
            id: bloque.contextoId,
            nombre: bloque.contextoNombre,
          }),
        ]),
      ).values(),
    ];
    const movimiento =
      movimientoConocido ??
      transacciones.find(
        (transaccion) =>
          transaccion.fuenteTipo === "CANJE_RECOMPENSA" &&
          transaccion.fuenteId === canje.id,
      )?.id;
    if (!movimiento) {
      throw new ErrorDominio(
        "CANJE_SIN_MOVIMIENTO",
        `El canje ${canje.id} no posee su movimiento de puntos asociado.`,
      );
    }
    return Object.freeze({
      id: canje.id,
      recompensaId: canje.recompensaId,
      fechaObjetivo: canje.fechaObjetivo.toString(),
      canjeadoEn: canje.canjeadoEn.toISOString(),
      puntosGastados: canje.puntosGastados,
      movimientoId: movimiento,
      bloquesAfectados: Object.freeze(bloquesAfectados),
      contextosAfectados: Object.freeze(contextosAfectados),
      reintentoIdempotente,
    });
  }
}

type DetalleBloque = BloqueVistaPreviaDiaLibreDto;

function construirDetalles(
  bloques: readonly VistaBloqueCortePlanificacion[],
  contextos: readonly Readonly<{ id: string; nombre: string }>[],
): ReadonlyMap<string, DetalleBloque> {
  const nombres = new Map(
    contextos.map((contexto) => [contexto.id, contexto.nombre]),
  );
  return new Map(
    bloques.map((bloque) => [
      bloque.id,
      Object.freeze({
        id: bloque.id,
        titulo: bloque.titulo,
        contextoId: bloque.contextoId,
        contextoNombre: nombres.get(bloque.contextoId) ?? "Agenda eliminada",
      }),
    ]),
  );
}

function detalleDesconocido(id: string): DetalleBloque {
  return Object.freeze({
    id,
    titulo: "Bloque no disponible",
    contextoId: "contexto-no-disponible",
    contextoNombre: "Agenda no disponible",
  });
}

function convertirEvaluacionADto(
  evaluacion: EvaluacionDiaLibre,
  fechaObjetivo: FechaLocal,
  recompensa: DefinicionRecompensa,
  detalles: ReadonlyMap<string, DetalleBloque>,
): VistaPreviaDiaLibreDto {
  const obtener = (id: string) => detalles.get(id) ?? detalleDesconocido(id);
  return Object.freeze({
    fechaObjetivo: fechaObjetivo.toString(),
    recompensa: Object.freeze({
      id: recompensa.id,
      nombre: recompensa.nombre,
      descripcion: recompensa.descripcion,
    }),
    costoPuntos: evaluacion.costoPuntos,
    saldoActual: evaluacion.saldoActual,
    saldoPosterior: evaluacion.saldoPosterior,
    saldoSuficiente: evaluacion.saldoSuficiente,
    puedeCanjear: evaluacion.puedeCanjear,
    afectados: Object.freeze(evaluacion.afectados.map(obtener)),
    protegidos: Object.freeze(
      evaluacion.protegidos.map(({ bloqueId, motivo }) =>
        Object.freeze({ ...obtener(bloqueId), motivo }),
      ),
    ),
  });
}
