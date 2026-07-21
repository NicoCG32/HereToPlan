import {
  ErrorPersistenciaRecuperacionDuplicada,
  type RepositorioAjustesCompromisos,
  type RepositorioRecuperacion,
  type RepositorioResolucionesBloquesPlanificacion,
} from "../../../aplicacion";
import {
  BancoRecuperacion,
  ConfiguracionRecuperacion,
  type Identificador,
  type MovimientoRecuperacion,
  type ReduccionCarga,
  type TipoMovimientoRecuperacion,
} from "../../../dominio";
import {
  convertirMovimientoRecuperacionEnV1,
  rehidratarMovimientoRecuperacionDesdeV1,
} from "../mapeadores/MapeadorMovimientoRecuperacionV1";
import {
  convertirReduccionCargaEnV1,
  rehidratarReduccionCargaDesdeV1,
} from "../mapeadores/MapeadorReduccionCargaV1";
import type { MovimientoRecuperacionV1 } from "../registros/MovimientoRecuperacionV1";
import type { ReduccionCargaV1 } from "../registros/ReduccionCargaV1";

export class RepositorioRecuperacionEnMemoria implements RepositorioRecuperacion {
  private movimientos = new Map<string, MovimientoRecuperacionV1>();
  private reducciones = new Map<string, ReduccionCargaV1>();
  private cola: Promise<void> = Promise.resolve();

  constructor(
    private readonly repositorioResoluciones?: RepositorioResolucionesBloquesPlanificacion,
    private readonly repositorioAjustes?: RepositorioAjustesCompromisos,
  ) {}

  public listarMovimientos(): Promise<readonly MovimientoRecuperacion[]> {
    return Promise.resolve(
      [...this.movimientos.values()].map(
        rehidratarMovimientoRecuperacionDesdeV1,
      ),
    );
  }

  public listarReducciones(): Promise<readonly ReduccionCarga[]> {
    return Promise.resolve(
      [...this.reducciones.values()].map(rehidratarReduccionCargaDesdeV1),
    );
  }

  public obtenerMovimientoPorOperacionId(
    operacionId: Identificador,
  ): Promise<MovimientoRecuperacion | undefined> {
    const registro = [...this.movimientos.values()].find(
      (movimiento) => movimiento.operacionId === operacionId,
    );
    return Promise.resolve(
      registro ? rehidratarMovimientoRecuperacionDesdeV1(registro) : undefined,
    );
  }

  public obtenerMovimientoPorFuente(
    tipo: TipoMovimientoRecuperacion,
    bloqueFuenteId: Identificador,
  ): Promise<MovimientoRecuperacion | undefined> {
    const registro = [...this.movimientos.values()].find(
      (movimiento) =>
        movimiento.tipo === tipo &&
        movimiento.bloqueFuenteId === bloqueFuenteId,
    );
    return Promise.resolve(
      registro ? rehidratarMovimientoRecuperacionDesdeV1(registro) : undefined,
    );
  }

  public obtenerReduccionPorBloque(
    bloqueId: Identificador,
  ): Promise<ReduccionCarga | undefined> {
    const registro = [...this.reducciones.values()].find(
      (reduccion) => reduccion.bloqueId === bloqueId,
    );
    return Promise.resolve(
      registro ? rehidratarReduccionCargaDesdeV1(registro) : undefined,
    );
  }

  public guardarAcreditacion(
    movimiento: MovimientoRecuperacion,
    configuracion: ConfiguracionRecuperacion,
  ): Promise<void> {
    return this.serializar(() => {
      if (
        movimiento.tipo !== "ACREDITACION" ||
        this.movimientoDuplicado(movimiento)
      ) {
        throw new ErrorPersistenciaRecuperacionDuplicada();
      }
      const acreditaciones = [...this.movimientos.values()]
        .map(rehidratarMovimientoRecuperacionDesdeV1)
        .filter(({ tipo }) => tipo === "ACREDITACION");
      configuracion.exigirCapacidadParaAcreditar(
        movimiento.minutos,
        acreditaciones
          .filter(({ fechaFuente }) =>
            fechaFuente.esIgualA(movimiento.fechaFuente),
          )
          .reduce((total, { minutos }) => total + minutos, 0),
        acreditaciones
          .filter(
            ({ fechaFuente }) =>
              obtenerInicioSemana(fechaFuente) ===
              obtenerInicioSemana(movimiento.fechaFuente),
          )
          .reduce((total, { minutos }) => total + minutos, 0),
      );
      const siguientes = new Map(this.movimientos);
      siguientes.set(
        movimiento.id,
        convertirMovimientoRecuperacionEnV1(movimiento),
      );
      this.movimientos = siguientes;
    });
  }

  public confirmarConsumo(
    movimiento: MovimientoRecuperacion,
    reduccion: ReduccionCarga,
  ): Promise<void> {
    return this.serializar(async () => {
      if (
        movimiento.tipo !== "CONSUMO" ||
        movimiento.id !== reduccion.movimientoId ||
        movimiento.operacionId !== reduccion.operacionId ||
        movimiento.bloqueFuenteId !== reduccion.bloqueId ||
        movimiento.minutos !== reduccion.minutosReducidos ||
        this.movimientoDuplicado(movimiento) ||
        [...this.reducciones.values()].some(
          (actual) =>
            actual.id === reduccion.id ||
            actual.bloqueId === reduccion.bloqueId ||
            actual.operacionId === reduccion.operacionId,
        )
      ) {
        throw new ErrorPersistenciaRecuperacionDuplicada();
      }
      const [resolucion, ajustes] = await Promise.all([
        this.repositorioResoluciones?.obtenerPorBloqueId(reduccion.bloqueId),
        this.repositorioAjustes?.listarAjustes() ?? Promise.resolve([]),
      ]);
      if (
        resolucion ||
        ajustes.some(({ bloqueId }) => bloqueId === reduccion.bloqueId)
      ) {
        throw new ErrorPersistenciaRecuperacionDuplicada(
          new Error("El bloque dejó de estar pendiente."),
        );
      }
      const banco = BancoRecuperacion.rehidratar(
        [...this.movimientos.values()].map(
          rehidratarMovimientoRecuperacionDesdeV1,
        ),
      );
      banco.registrar(movimiento);
      const movimientos = new Map(this.movimientos);
      const reducciones = new Map(this.reducciones);
      movimientos.set(
        movimiento.id,
        convertirMovimientoRecuperacionEnV1(movimiento),
      );
      reducciones.set(reduccion.id, convertirReduccionCargaEnV1(reduccion));
      this.movimientos = movimientos;
      this.reducciones = reducciones;
    });
  }

  private movimientoDuplicado(movimiento: MovimientoRecuperacion): boolean {
    return [...this.movimientos.values()].some(
      (actual) =>
        actual.id === movimiento.id ||
        actual.operacionId === movimiento.operacionId ||
        (actual.tipo === movimiento.tipo &&
          actual.bloqueFuenteId === movimiento.bloqueFuenteId),
    );
  }

  private serializar(operacion: () => void | Promise<void>): Promise<void> {
    const ejecucion = this.cola.then(operacion);
    this.cola = ejecucion.catch(() => undefined);
    return ejecucion;
  }
}

function obtenerInicioSemana(
  fecha: import("../../../dominio").FechaLocal,
): string {
  const [anio, mes, dia] = fecha.toString().split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const inicio = new Date(Date.UTC(anio, mes - 1, dia));
  inicio.setUTCDate(inicio.getUTCDate() - (fecha.obtenerDiaSemanaIso() - 1));
  return inicio.toISOString().slice(0, 10);
}
