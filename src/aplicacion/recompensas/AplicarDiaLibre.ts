import {
  AplicacionRecompensa,
  FechaLocal,
  ServicioDiaLibrePlanificacion,
  type BloqueEvaluableDiaLibre,
  type MotivoProteccionDiaLibre,
  type RecompensaAdquirida,
  type RecompensaDefinida,
  type VistaBloqueCortePlanificacion,
} from "../../dominio";
import type { CalendarioLocal } from "../puertos/CalendarioLocal";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import {
  ErrorAplicacionRecompensaDuplicada,
  type RepositorioInventarioRecompensas,
  type UnidadTrabajoAplicacionRecompensa,
} from "../puertos/InventarioRecompensas";
import type { Reloj } from "../puertos/Reloj";
import type { RepositorioContextosPlanificacion } from "../puertos/RepositorioContextosPlanificacion";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";
import type { RepositorioResolucionesBloquesPlanificacion } from "../puertos/RepositorioResolucionesBloquesPlanificacion";
import type { RepositorioAjustesCompromisos } from "../puertos/UnidadTrabajoCanjeDiaLibre";

export interface BloqueAplicacionDiaLibreDto {
  readonly id: string;
  readonly titulo: string;
  readonly contextoId: string;
  readonly contextoNombre: string;
}

export interface BloqueProtegidoAplicacionDiaLibreDto extends BloqueAplicacionDiaLibreDto {
  readonly motivo: MotivoProteccionDiaLibre;
}

export interface VistaPreviaAplicacionDiaLibreDto {
  readonly unidad: Readonly<{
    id: string;
    recompensaId: string;
    nombre: string;
    adquiridaEn: string;
  }>;
  readonly fechaObjetivo: string;
  readonly puedeAplicar: boolean;
  readonly afectados: readonly BloqueAplicacionDiaLibreDto[];
  readonly protegidos: readonly BloqueProtegidoAplicacionDiaLibreDto[];
}

export interface AplicacionDiaLibreDto {
  readonly id: string;
  readonly recompensaAdquiridaId: string;
  readonly recompensaId: string;
  readonly nombre: string;
  readonly fechaObjetivo: string;
  readonly aplicadaEn: string;
  readonly bloquesAfectados: readonly BloqueAplicacionDiaLibreDto[];
  readonly contextosAfectados: readonly Readonly<{
    id: string;
    nombre: string;
  }>[];
  readonly reintentoIdempotente: boolean;
}

export class ErrorAplicacionDiaLibre extends Error {
  constructor(
    public readonly codigo:
      | "UNIDAD_NO_ENCONTRADA"
      | "UNIDAD_NO_DISPONIBLE"
      | "RECOMPENSA_NO_DEFINIDA"
      | "OPERACION_APLICACION_CONFLICTIVA",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorAplicacionDiaLibre";
  }
}

interface DependenciasLecturaAplicacionDiaLibre {
  readonly definiciones: readonly RecompensaDefinida[];
  readonly repositorioInventario: RepositorioInventarioRecompensas;
  readonly repositorioCortes: RepositorioCortesPlanificacion;
  readonly repositorioResoluciones: RepositorioResolucionesBloquesPlanificacion;
  readonly repositorioAjustes: RepositorioAjustesCompromisos;
  readonly repositorioContextos: RepositorioContextosPlanificacion;
  readonly calendarioLocal: CalendarioLocal;
  readonly servicio?: ServicioDiaLibrePlanificacion;
}

export class CasoDeUsoPrepararAplicacionDiaLibre {
  private readonly cargador: CargadorAplicacionDiaLibre;

  constructor(dependencias: DependenciasLecturaAplicacionDiaLibre) {
    this.cargador = new CargadorAplicacionDiaLibre(dependencias);
  }

  public async ejecutar(comando: {
    readonly recompensaAdquiridaId: string;
    readonly fechaObjetivo: string;
  }): Promise<VistaPreviaAplicacionDiaLibreDto> {
    return (await this.cargador.cargar(comando)).vistaPrevia;
  }
}

interface DependenciasAplicarDiaLibre extends DependenciasLecturaAplicacionDiaLibre {
  readonly unidadTrabajo: UnidadTrabajoAplicacionRecompensa;
  readonly reloj: Reloj;
  readonly generadorIdentificadores: GeneradorIdentificadores;
}

export class CasoDeUsoAplicarDiaLibre {
  private readonly cargador: CargadorAplicacionDiaLibre;
  private readonly servicio: ServicioDiaLibrePlanificacion;

  constructor(private readonly dependencias: DependenciasAplicarDiaLibre) {
    this.servicio =
      dependencias.servicio ?? new ServicioDiaLibrePlanificacion();
    this.cargador = new CargadorAplicacionDiaLibre({
      ...dependencias,
      servicio: this.servicio,
    });
  }

  public async ejecutar(comando: {
    readonly operacionId: string;
    readonly recompensaAdquiridaId: string;
    readonly fechaObjetivo: string;
  }): Promise<AplicacionDiaLibreDto> {
    const existente =
      await this.dependencias.repositorioInventario.obtenerAplicacionPorId(
        comando.operacionId,
      );
    if (existente) {
      this.validarReintento(existente, comando);
      return this.cargador.convertirAplicacionADto(existente, true);
    }
    const carga = await this.cargador.cargar(comando);
    const aplicadaEn = this.dependencias.reloj.ahora();
    const preparada = this.servicio.prepararAplicacion({
      idAplicacion: comando.operacionId,
      adquirida: carga.adquirida,
      recompensa: carga.definicion,
      bloques: carga.bloquesEvaluables,
      fechaObjetivo: carga.fechaObjetivo,
      fechaActual: carga.fechaActual,
      aplicadaEn,
      crearIdAjuste: () => this.dependencias.generadorIdentificadores.generar(),
    });
    try {
      await this.dependencias.unidadTrabajo.confirmarAplicacion(
        preparada.adquiridaConsumida,
        preparada.aplicacion,
        preparada.ajustes,
      );
      return this.cargador.convertirAplicacionADto(preparada.aplicacion, false);
    } catch (causa: unknown) {
      if (!(causa instanceof ErrorAplicacionRecompensaDuplicada)) throw causa;
      const ganadora =
        await this.dependencias.repositorioInventario.obtenerAplicacionPorId(
          comando.operacionId,
        );
      if (!ganadora) {
        throw new ErrorAplicacionDiaLibre(
          "OPERACION_APLICACION_CONFLICTIVA",
          "La unidad o uno de los bloques cambió antes de confirmar.",
          causa,
        );
      }
      this.validarReintento(ganadora, comando);
      return this.cargador.convertirAplicacionADto(ganadora, true);
    }
  }

  private validarReintento(
    aplicacion: AplicacionRecompensa,
    comando: Readonly<{
      recompensaAdquiridaId: string;
      fechaObjetivo: string;
    }>,
  ): void {
    if (
      aplicacion.recompensaAdquiridaId !== comando.recompensaAdquiridaId ||
      aplicacion.fechaObjetivo.toString() !== comando.fechaObjetivo
    ) {
      throw new ErrorAplicacionDiaLibre(
        "OPERACION_APLICACION_CONFLICTIVA",
        "El identificador de operación ya corresponde a otra aplicación.",
      );
    }
  }
}

interface CargaAplicacionDiaLibre {
  readonly adquirida: RecompensaAdquirida;
  readonly definicion: RecompensaDefinida;
  readonly fechaObjetivo: FechaLocal;
  readonly fechaActual: FechaLocal;
  readonly bloquesEvaluables: readonly BloqueEvaluableDiaLibre[];
  readonly vistaPrevia: VistaPreviaAplicacionDiaLibreDto;
}

class CargadorAplicacionDiaLibre {
  private readonly servicio: ServicioDiaLibrePlanificacion;

  constructor(
    private readonly dependencias: DependenciasLecturaAplicacionDiaLibre,
  ) {
    this.servicio =
      dependencias.servicio ?? new ServicioDiaLibrePlanificacion();
  }

  public async cargar(comando: {
    readonly recompensaAdquiridaId: string;
    readonly fechaObjetivo: string;
  }): Promise<CargaAplicacionDiaLibre> {
    const adquirida =
      await this.dependencias.repositorioInventario.obtenerAdquiridaPorId(
        comando.recompensaAdquiridaId,
      );
    if (!adquirida) {
      throw new ErrorAplicacionDiaLibre(
        "UNIDAD_NO_ENCONTRADA",
        "La unidad de recompensa ya no existe en el inventario.",
      );
    }
    if (adquirida.estado !== "DISPONIBLE") {
      throw new ErrorAplicacionDiaLibre(
        "UNIDAD_NO_DISPONIBLE",
        "La unidad de recompensa ya fue consumida.",
      );
    }
    const definicion = this.dependencias.definiciones.find(
      (actual) => actual.id === adquirida.recompensaId,
    );
    if (!definicion) {
      throw new ErrorAplicacionDiaLibre(
        "RECOMPENSA_NO_DEFINIDA",
        "La unidad no corresponde a una recompensa vigente.",
      );
    }
    const fechaObjetivo = FechaLocal.crear(comando.fechaObjetivo);
    const fechaActual = this.dependencias.calendarioLocal.hoy();
    const [cortes, resoluciones, ajustes, contextos] = await Promise.all([
      this.dependencias.repositorioCortes.listar(),
      this.dependencias.repositorioResoluciones.listar(),
      this.dependencias.repositorioAjustes.listarAjustes(),
      this.dependencias.repositorioContextos.listar(),
    ]);
    const bloques = cortes
      .filter((corte) => corte.estado === "CONFIRMADA")
      .flatMap((corte) => corte.listarBloques());
    const resueltos = new Set(
      resoluciones.map((resolucion) => resolucion.bloqueId),
    );
    const excusados = new Set(ajustes.map((ajuste) => ajuste.bloqueId));
    const bloquesEvaluables = bloques.map((bloque) => ({
      id: bloque.id,
      fecha: bloque.fecha,
      politica: bloque.politica,
      estado: excusados.has(bloque.id)
        ? ("EXCUSADO" as const)
        : resueltos.has(bloque.id)
          ? ("RESUELTO" as const)
          : ("PENDIENTE" as const),
    }));
    const evaluacion = this.servicio.evaluarAplicacion({
      recompensa: definicion,
      bloques: bloquesEvaluables,
      fechaObjetivo,
      fechaActual,
    });
    const detalles = construirDetalles(bloques, contextos);
    const obtener = (id: string) => detalles.get(id) ?? detalleDesconocido(id);
    return Object.freeze({
      adquirida,
      definicion,
      fechaObjetivo,
      fechaActual,
      bloquesEvaluables: Object.freeze(bloquesEvaluables),
      vistaPrevia: Object.freeze({
        unidad: Object.freeze({
          id: adquirida.id,
          recompensaId: definicion.id,
          nombre: definicion.nombre,
          adquiridaEn: adquirida.adquiridaEn.toISOString(),
        }),
        fechaObjetivo: fechaObjetivo.toString(),
        puedeAplicar: evaluacion.puedeAplicar,
        afectados: Object.freeze(evaluacion.afectados.map(obtener)),
        protegidos: Object.freeze(
          evaluacion.protegidos.map(({ bloqueId, motivo }) =>
            Object.freeze({ ...obtener(bloqueId), motivo }),
          ),
        ),
      }),
    });
  }

  public async convertirAplicacionADto(
    aplicacion: AplicacionRecompensa,
    reintentoIdempotente: boolean,
  ): Promise<AplicacionDiaLibreDto> {
    const [cortes, contextos] = await Promise.all([
      this.dependencias.repositorioCortes.listar(),
      this.dependencias.repositorioContextos.listar(),
    ]);
    const detalles = construirDetalles(
      cortes.flatMap((corte) => corte.listarBloques()),
      contextos,
    );
    const bloquesAfectados = aplicacion
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
    const nombre =
      this.dependencias.definiciones.find(
        (definicion) => definicion.id === aplicacion.recompensaId,
      )?.nombre ?? "Recompensa histórica";
    return Object.freeze({
      id: aplicacion.id,
      recompensaAdquiridaId: aplicacion.recompensaAdquiridaId,
      recompensaId: aplicacion.recompensaId,
      nombre,
      fechaObjetivo: aplicacion.fechaObjetivo.toString(),
      aplicadaEn: aplicacion.aplicadaEn.toISOString(),
      bloquesAfectados: Object.freeze(bloquesAfectados),
      contextosAfectados: Object.freeze(contextosAfectados),
      reintentoIdempotente,
    });
  }
}

function construirDetalles(
  bloques: readonly VistaBloqueCortePlanificacion[],
  contextos: readonly Readonly<{ id: string; nombre: string }>[],
): ReadonlyMap<string, BloqueAplicacionDiaLibreDto> {
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

function detalleDesconocido(id: string): BloqueAplicacionDiaLibreDto {
  return Object.freeze({
    id,
    titulo: "Bloque no disponible",
    contextoId: "contexto-no-disponible",
    contextoNombre: "Agenda no disponible",
  });
}
