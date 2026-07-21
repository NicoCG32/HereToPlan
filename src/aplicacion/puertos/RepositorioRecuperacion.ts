import type {
  Identificador,
  ConfiguracionRecuperacion,
  MovimientoRecuperacion,
  ReduccionCarga,
  TipoMovimientoRecuperacion,
} from "../../dominio";

export class ErrorPersistenciaRecuperacionDuplicada extends Error {
  constructor(public readonly causa?: unknown) {
    super(
      "La operación o su bloque fuente ya poseen un movimiento de recuperación.",
    );
    this.name = "ErrorPersistenciaRecuperacionDuplicada";
  }
}

export interface RepositorioRecuperacion {
  listarMovimientos(): Promise<readonly MovimientoRecuperacion[]>;
  listarReducciones(): Promise<readonly ReduccionCarga[]>;
  obtenerMovimientoPorOperacionId(
    operacionId: Identificador,
  ): Promise<MovimientoRecuperacion | undefined>;
  obtenerMovimientoPorFuente(
    tipo: TipoMovimientoRecuperacion,
    bloqueFuenteId: Identificador,
  ): Promise<MovimientoRecuperacion | undefined>;
  obtenerReduccionPorBloque(
    bloqueId: Identificador,
  ): Promise<ReduccionCarga | undefined>;
  guardarAcreditacion(
    movimiento: MovimientoRecuperacion,
    configuracion: ConfiguracionRecuperacion,
  ): Promise<void>;
  confirmarConsumo(
    movimiento: MovimientoRecuperacion,
    reduccion: ReduccionCarga,
  ): Promise<void>;
}
