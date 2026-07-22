import {
  ErrorImpactoReinicioDesactualizado,
  aplicarPoliticaReinicioPlanificacion,
  calcularImpactoReinicioPlanificacion,
  type ComandoTransaccionReinicioPlanificacion,
  type ContenidoRespaldo,
  type EstadoPersistenteRespaldable,
  type ImpactoReinicioPlanificacion,
  type LectorImpactoReinicioPlanificacion,
  type ResultadoTransaccionReinicioPlanificacion,
  type UnidadTrabajoReinicioPlanificacion,
} from "../../../aplicacion";

export interface ConfiguracionReinicioPlanificacionEnMemoria {
  readonly antesDePublicar?: () => void;
}

export class UnidadTrabajoReinicioPlanificacionEnMemoria
  implements
    LectorImpactoReinicioPlanificacion,
    UnidadTrabajoReinicioPlanificacion
{
  private estado: EstadoPersistenteRespaldable;
  private cola: Promise<void> = Promise.resolve();

  constructor(
    estadoInicial: EstadoPersistenteRespaldable,
    private readonly configuracion: ConfiguracionReinicioPlanificacionEnMemoria = {},
  ) {
    this.estado = congelarEstado(estadoInicial);
  }

  public consultarImpacto(): Promise<ImpactoReinicioPlanificacion> {
    return Promise.resolve(
      calcularImpactoReinicioPlanificacion(this.estado.colecciones),
    );
  }

  public reiniciar(
    comando: ComandoTransaccionReinicioPlanificacion,
  ): Promise<ResultadoTransaccionReinicioPlanificacion> {
    let resolver!: (
      resultado: ResultadoTransaccionReinicioPlanificacion,
    ) => void;
    let rechazar!: (causa: unknown) => void;
    const resultado = new Promise<ResultadoTransaccionReinicioPlanificacion>(
      (resolve, reject) => {
        resolver = resolve;
        rechazar = reject;
      },
    );
    const operacion = this.cola.then(() => {
      try {
        const impacto = calcularImpactoReinicioPlanificacion(
          this.estado.colecciones,
        );
        if (impacto.totalEliminaciones === 0) {
          resolver(
            Object.freeze({
              operacionId: comando.operacionId,
              eliminados: 0,
              yaReiniciada: true,
            }),
          );
          return;
        }
        if (impacto.huella !== comando.huellaEsperada) {
          throw new ErrorImpactoReinicioDesactualizado();
        }
        const politica = aplicarPoliticaReinicioPlanificacion(
          this.estado.colecciones,
        );
        const siguiente = Object.freeze({
          ...this.estado.colecciones,
          agendas: politica.estado.agendas,
          "bloques-planificacion": politica.estado.bloques,
          "cortes-planificacion": politica.estado.cortes,
          "sesiones-cronometro": politica.estado.sesiones,
        }) as ContenidoRespaldo;
        this.configuracion.antesDePublicar?.();
        this.estado = Object.freeze({
          versionBaseDatos: this.estado.versionBaseDatos,
          colecciones: siguiente,
        });
        resolver(
          Object.freeze({
            operacionId: comando.operacionId,
            eliminados: impacto.totalEliminaciones,
            yaReiniciada: false,
          }),
        );
      } catch (causa: unknown) {
        rechazar(causa);
      }
    });
    this.cola = operacion.catch(() => undefined);
    return resultado;
  }

  public leerEstado(): EstadoPersistenteRespaldable {
    return this.estado;
  }
}

function congelarEstado(
  estado: EstadoPersistenteRespaldable,
): EstadoPersistenteRespaldable {
  return Object.freeze({
    versionBaseDatos: estado.versionBaseDatos,
    colecciones: Object.freeze({ ...estado.colecciones }),
  });
}
