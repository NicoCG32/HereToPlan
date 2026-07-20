import {
  SesionCronometro,
  type EstadoSesionCronometro,
  type TipoOperacionSesionCronometro,
} from "../../dominio";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import {
  ErrorConflictoPersistenciaSesionCronometro,
  type RepositorioSesionesCronometro,
} from "../puertos/RepositorioSesionesCronometro";
import type { RepositorioAjustesCompromisos } from "../puertos/UnidadTrabajoCanjeDiaLibre";
import type { Reloj } from "../puertos/Reloj";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";
import type { RepositorioResolucionesBloquesPlanificacion } from "../puertos/RepositorioResolucionesBloquesPlanificacion";

export type ComandoGestionarSesionCronometro =
  | Readonly<{
      tipo: "INICIAR";
      operacionId: string;
      bloqueId: string;
    }>
  | Readonly<{
      tipo: "PAUSAR" | "REANUDAR" | "DETENER";
      operacionId: string;
      sesionId: string;
    }>;

export interface SesionCronometroDto {
  readonly id: string;
  readonly bloqueId: string;
  readonly estado: EstadoSesionCronometro;
  readonly iniciadaEn: string;
  readonly finalizadaEn?: string;
  readonly duracionMilisegundos: number;
  readonly revision: number;
}

export interface ResultadoGestionSesionCronometroDto {
  readonly sesion: SesionCronometroDto;
  readonly reintentoIdempotente: boolean;
}

export interface EstadoCronometroBloqueDto {
  readonly bloqueId: string;
  readonly consultadoEn: string;
  readonly sesionAbierta?: SesionCronometroDto;
  readonly sesiones: readonly SesionCronometroDto[];
  readonly duracionTotalMilisegundos: number;
}

interface DependenciasGestionCronometro {
  readonly repositorioSesiones: RepositorioSesionesCronometro;
  readonly repositorioCortes: RepositorioCortesPlanificacion;
  readonly repositorioResoluciones: RepositorioResolucionesBloquesPlanificacion;
  readonly repositorioAjustes: RepositorioAjustesCompromisos;
  readonly reloj: Reloj;
  readonly generadorIdentificadores: GeneradorIdentificadores;
}

export class ErrorGestionSesionCronometro extends Error {
  constructor(
    public readonly codigo:
      | "BLOQUE_NO_CONFIRMADO"
      | "BLOQUE_NO_PENDIENTE"
      | "SESION_INEXISTENTE"
      | "SESION_ABIERTA_EN_OTRO_BLOQUE"
      | "OPERACION_CONFLICTIVA"
      | "CONFLICTO_CONCURRENCIA",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorGestionSesionCronometro";
  }
}

export class CasoDeUsoGestionarSesionCronometro {
  constructor(private readonly dependencias: DependenciasGestionCronometro) {}

  public async ejecutar(
    comando: ComandoGestionarSesionCronometro,
  ): Promise<ResultadoGestionSesionCronometroDto> {
    const existente =
      await this.dependencias.repositorioSesiones.obtenerPorOperacionId(
        comando.operacionId,
      );
    if (existente) return this.resolverReintento(existente, comando);
    const ahora = this.dependencias.reloj.ahora();
    let sesion: SesionCronometro;
    let revisionEsperada: number;
    if (comando.tipo === "INICIAR") {
      await this.validarBloquePendienteConfirmado(comando.bloqueId);
      const abierta =
        await this.dependencias.repositorioSesiones.obtenerAbierta();
      if (abierta) {
        throw new ErrorGestionSesionCronometro(
          "SESION_ABIERTA_EN_OTRO_BLOQUE",
          abierta.bloqueId === comando.bloqueId
            ? "Este bloque ya posee una sesión abierta."
            : "Debes detener la sesión abierta antes de iniciar otra.",
        );
      }
      sesion = SesionCronometro.iniciar({
        id: this.dependencias.generadorIdentificadores.generar(),
        bloqueId: comando.bloqueId,
        operacionId: comando.operacionId,
        iniciadaEn: ahora,
      });
      revisionEsperada = 0;
    } else {
      const encontrada =
        await this.dependencias.repositorioSesiones.obtenerPorId(
          comando.sesionId,
        );
      if (!encontrada) {
        throw new ErrorGestionSesionCronometro(
          "SESION_INEXISTENTE",
          "La sesión del cronómetro ya no está disponible.",
        );
      }
      sesion = encontrada;
      revisionEsperada = sesion.revision;
      this.aplicarTransicion(sesion, comando.tipo, comando.operacionId, ahora);
    }
    try {
      await this.dependencias.repositorioSesiones.guardar(
        sesion,
        revisionEsperada,
      );
      return Object.freeze({
        sesion: convertirSesionADto(sesion, ahora),
        reintentoIdempotente: false,
      });
    } catch (error: unknown) {
      if (!(error instanceof ErrorConflictoPersistenciaSesionCronometro)) {
        throw error;
      }
      const ganador =
        await this.dependencias.repositorioSesiones.obtenerPorOperacionId(
          comando.operacionId,
        );
      if (ganador) return this.resolverReintento(ganador, comando);
      throw new ErrorGestionSesionCronometro(
        "CONFLICTO_CONCURRENCIA",
        "La sesión cambió en otra pestaña. Vuelve a revisar su estado.",
        error,
      );
    }
  }

  private async validarBloquePendienteConfirmado(
    bloqueId: string,
  ): Promise<void> {
    const [cortes, resolucion, ajustes] = await Promise.all([
      this.dependencias.repositorioCortes.listar(),
      this.dependencias.repositorioResoluciones.obtenerPorBloqueId(bloqueId),
      this.dependencias.repositorioAjustes.listarAjustes(),
    ]);
    const confirmado = cortes.some(
      (corte) =>
        corte.estado === "CONFIRMADA" &&
        corte.listarBloques().some((bloque) => bloque.id === bloqueId),
    );
    if (!confirmado) {
      throw new ErrorGestionSesionCronometro(
        "BLOQUE_NO_CONFIRMADO",
        "El cronómetro sólo puede medir un bloque confirmado.",
      );
    }
    if (resolucion || ajustes.some((ajuste) => ajuste.bloqueId === bloqueId)) {
      throw new ErrorGestionSesionCronometro(
        "BLOQUE_NO_PENDIENTE",
        "El cronómetro sólo puede iniciarse para un bloque pendiente.",
      );
    }
  }

  private aplicarTransicion(
    sesion: SesionCronometro,
    tipo: Exclude<TipoOperacionSesionCronometro, "INICIAR">,
    operacionId: string,
    ahora: Date,
  ): void {
    if (tipo === "PAUSAR") sesion.pausar(operacionId, ahora);
    else if (tipo === "REANUDAR") sesion.reanudar(operacionId, ahora);
    else sesion.detener(operacionId, ahora);
  }

  private resolverReintento(
    sesion: SesionCronometro,
    comando: ComandoGestionarSesionCronometro,
  ): ResultadoGestionSesionCronometroDto {
    const operacion = sesion
      .listarOperaciones()
      .find(({ id }) => id === comando.operacionId);
    const mismoDestino =
      comando.tipo === "INICIAR"
        ? sesion.bloqueId === comando.bloqueId
        : sesion.id === comando.sesionId;
    if (operacion?.tipo !== comando.tipo || !mismoDestino) {
      throw new ErrorGestionSesionCronometro(
        "OPERACION_CONFLICTIVA",
        "El identificador de operación ya corresponde a otra orden.",
      );
    }
    return Object.freeze({
      sesion: convertirSesionADto(sesion, this.dependencias.reloj.ahora()),
      reintentoIdempotente: true,
    });
  }
}

export class CasoDeUsoConsultarCronometroBloque {
  constructor(
    private readonly repositorio: RepositorioSesionesCronometro,
    private readonly reloj: Reloj,
  ) {}

  public async ejecutar(bloqueId: string): Promise<EstadoCronometroBloqueDto> {
    const ahora = this.reloj.ahora();
    const [abierta, sesiones] = await Promise.all([
      this.repositorio.obtenerAbierta(),
      this.repositorio.listarPorBloque(bloqueId),
    ]);
    const sesionesDto = [...sesiones]
      .sort((a, b) => b.iniciadaEn.getTime() - a.iniciadaEn.getTime())
      .map((sesion) => convertirSesionADto(sesion, ahora));
    return Object.freeze({
      bloqueId,
      consultadoEn: ahora.toISOString(),
      ...(abierta
        ? { sesionAbierta: convertirSesionADto(abierta, ahora) }
        : {}),
      sesiones: Object.freeze(sesionesDto),
      duracionTotalMilisegundos: sesionesDto.reduce(
        (total, sesion) => total + sesion.duracionMilisegundos,
        0,
      ),
    });
  }
}

function convertirSesionADto(
  sesion: SesionCronometro,
  ahora: Date,
): SesionCronometroDto {
  const finalizadaEn = sesion.finalizadaEn;
  return Object.freeze({
    id: sesion.id,
    bloqueId: sesion.bloqueId,
    estado: sesion.estado,
    iniciadaEn: sesion.iniciadaEn.toISOString(),
    ...(finalizadaEn ? { finalizadaEn: finalizadaEn.toISOString() } : {}),
    duracionMilisegundos: sesion.duracionMilisegundos(ahora),
    revision: sesion.revision,
  });
}
