import {
  BancoRecuperacion,
  ConfiguracionRecuperacion,
  ErrorDominio,
  FechaLocal,
  MovimientoRecuperacion,
  ReduccionCarga,
  type VistaBloqueCortePlanificacion,
} from "../../dominio";
import type { CalendarioLocal } from "../puertos/CalendarioLocal";
import type { GeneradorIdentificadores } from "../puertos/GeneradorIdentificadores";
import {
  ErrorPersistenciaRecuperacionDuplicada,
  type RepositorioRecuperacion,
} from "../puertos/RepositorioRecuperacion";
import type { RepositorioSesionesCronometro } from "../puertos/RepositorioSesionesCronometro";
import type { Reloj } from "../puertos/Reloj";
import type { RepositorioCortesPlanificacion } from "../puertos/RepositorioCortesPlanificacion";
import type { RepositorioResolucionesBloquesPlanificacion } from "../puertos/RepositorioResolucionesBloquesPlanificacion";
import type { RepositorioAjustesCompromisos } from "../puertos/UnidadTrabajoCanjeDiaLibre";

export const CONFIGURACION_RECUPERACION_INICIAL = new ConfiguracionRecuperacion(
  {
    numeradorTasa: 1,
    denominadorTasa: 2,
    maximoDiarioMinutos: 120,
    maximoSemanalMinutos: 300,
  },
);

export interface MovimientoRecuperacionDto {
  readonly id: string;
  readonly operacionId: string;
  readonly tipo: "ACREDITACION" | "CONSUMO";
  readonly minutos: number;
  readonly bloqueFuenteId: string;
  readonly fechaFuente: string;
  readonly descripcion: string;
  readonly ocurridoEn: string;
}

export interface BloqueAcreditableRecuperacionDto {
  readonly bloqueId: string;
  readonly titulo: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly minutosCronometrados: number;
  readonly minutosExcedentes: number;
  readonly minutosAcreditables: number;
}

export interface BloqueReducibleRecuperacionDto {
  readonly bloqueId: string;
  readonly titulo: string;
  readonly fecha: string;
  readonly minutosPlanificados: number;
  readonly maximoReducible: number;
}

export interface BancoRecuperacionDto {
  readonly saldoMinutos: number;
  readonly configuracion: Readonly<{
    numeradorTasa: number;
    denominadorTasa: number;
    maximoDiarioMinutos: number;
    maximoSemanalMinutos: number;
  }>;
  readonly acreditables: readonly BloqueAcreditableRecuperacionDto[];
  readonly reducibles: readonly BloqueReducibleRecuperacionDto[];
  readonly movimientos: readonly MovimientoRecuperacionDto[];
}

interface DependenciasRecuperacion {
  readonly repositorioRecuperacion: RepositorioRecuperacion;
  readonly repositorioCortes: RepositorioCortesPlanificacion;
  readonly repositorioResoluciones: RepositorioResolucionesBloquesPlanificacion;
  readonly repositorioSesiones: RepositorioSesionesCronometro;
  readonly repositorioAjustes: RepositorioAjustesCompromisos;
  readonly calendarioLocal: CalendarioLocal;
  readonly reloj: Reloj;
  readonly generadorIdentificadores: GeneradorIdentificadores;
  readonly configuracion?: ConfiguracionRecuperacion;
}

export class ErrorGestionRecuperacion extends Error {
  constructor(
    public readonly codigo:
      | "BLOQUE_NO_ENCONTRADO"
      | "BLOQUE_NO_COMPLETADO"
      | "SOBRETRABAJO_NO_ACREDITABLE"
      | "BLOQUE_YA_ACREDITADO"
      | "BLOQUE_NO_REDUCIBLE"
      | "BLOQUE_NO_FUTURO"
      | "REDUCCION_INVALIDA"
      | "BLOQUE_YA_REDUCIDO"
      | "OPERACION_CONFLICTIVA"
      | "CONFLICTO_CONCURRENCIA",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorGestionRecuperacion";
  }
}

export class CasoDeUsoConsultarBancoRecuperacion {
  constructor(private readonly dependencias: DependenciasRecuperacion) {}

  public async ejecutar(): Promise<BancoRecuperacionDto> {
    const configuracion = obtenerConfiguracion(this.dependencias);
    const [movimientos, reducciones, cortes, resoluciones, ajustes] =
      await Promise.all([
        this.dependencias.repositorioRecuperacion.listarMovimientos(),
        this.dependencias.repositorioRecuperacion.listarReducciones(),
        this.dependencias.repositorioCortes.listar(),
        this.dependencias.repositorioResoluciones.listar(),
        this.dependencias.repositorioAjustes.listarAjustes(),
      ]);
    const banco = BancoRecuperacion.rehidratar(movimientos);
    const bloques = listarBloquesConfirmados(cortes);
    const resolucionesPorBloque = new Map(
      resoluciones.map((resolucion) => [resolucion.bloqueId, resolucion]),
    );
    const bloquesAjustados = new Set(ajustes.map(({ bloqueId }) => bloqueId));
    const bloquesReducidos = new Set(
      reducciones.map(({ bloqueId }) => bloqueId),
    );
    const fuentesAcreditadas = new Set(
      movimientos
        .filter(({ tipo }) => tipo === "ACREDITACION")
        .map(({ bloqueFuenteId }) => bloqueFuenteId),
    );
    const reduccionesPorBloque = new Map(
      reducciones.map((reduccion) => [reduccion.bloqueId, reduccion]),
    );
    const bloquesCandidatos = bloques.filter(
      (bloque) =>
        resolucionesPorBloque.get(bloque.id)?.resultado === "COMPLETADO" &&
        !fuentesAcreditadas.has(bloque.id),
    );
    const sesionesCandidatas = await Promise.all(
      bloquesCandidatos.map((bloque) =>
        this.dependencias.repositorioSesiones.listarPorBloque(bloque.id),
      ),
    );
    const acreditables = bloquesCandidatos.map((bloque, indice) =>
      calcularBloqueAcreditable(
        bloque,
        sesionesCandidatas[indice] ?? [],
        movimientos,
        configuracion,
        reduccionesPorBloque.get(bloque.id)?.minutosReducidos ?? 0,
      ),
    );
    const hoy = this.dependencias.calendarioLocal.hoy();
    const reducibles = bloques
      .filter(
        (bloque) =>
          bloque.fecha.esPosteriorA(hoy) &&
          bloque.politica.rigidez === "FLEXIBLE" &&
          bloque.politica.ajustesPermitidos.includes("REDUCIR_CARGA") &&
          !resolucionesPorBloque.has(bloque.id) &&
          !bloquesAjustados.has(bloque.id) &&
          !bloquesReducidos.has(bloque.id) &&
          bloque.minutosPlanificados > 1,
      )
      .map((bloque) =>
        Object.freeze({
          bloqueId: bloque.id,
          titulo: bloque.titulo,
          fecha: bloque.fecha.toString(),
          minutosPlanificados: bloque.minutosPlanificados,
          maximoReducible: bloque.minutosPlanificados - 1,
        }),
      );
    return Object.freeze({
      saldoMinutos: banco.saldoMinutos,
      configuracion: convertirConfiguracion(configuracion),
      acreditables: Object.freeze(
        acreditables.filter(
          (bloque): bloque is BloqueAcreditableRecuperacionDto =>
            bloque !== undefined,
        ),
      ),
      reducibles: Object.freeze(reducibles),
      movimientos: Object.freeze(
        [...movimientos]
          .sort((a, b) => b.ocurridoEn.getTime() - a.ocurridoEn.getTime())
          .map(convertirMovimiento),
      ),
    });
  }
}

export class CasoDeUsoAcreditarRecuperacion {
  constructor(private readonly dependencias: DependenciasRecuperacion) {}

  public async ejecutar(comando: {
    readonly operacionId: string;
    readonly bloqueId: string;
  }): Promise<
    Readonly<{
      movimiento: MovimientoRecuperacionDto;
      reintentoIdempotente: boolean;
    }>
  > {
    const existente =
      await this.dependencias.repositorioRecuperacion.obtenerMovimientoPorOperacionId(
        comando.operacionId,
      );
    if (existente)
      return resolverReintento(existente, "ACREDITACION", comando.bloqueId);
    if (
      await this.dependencias.repositorioRecuperacion.obtenerMovimientoPorFuente(
        "ACREDITACION",
        comando.bloqueId,
      )
    ) {
      throw new ErrorGestionRecuperacion(
        "BLOQUE_YA_ACREDITADO",
        "El sobretrabajo de este bloque ya fue acreditado.",
      );
    }
    const bloque = await buscarBloqueConfirmado(
      this.dependencias.repositorioCortes,
      comando.bloqueId,
    );
    if (!bloque) {
      throw new ErrorGestionRecuperacion(
        "BLOQUE_NO_ENCONTRADO",
        "No existe una instantánea confirmada del bloque.",
      );
    }
    const resolucion =
      await this.dependencias.repositorioResoluciones.obtenerPorBloqueId(
        bloque.id,
      );
    if (resolucion?.resultado !== "COMPLETADO") {
      throw new ErrorGestionRecuperacion(
        "BLOQUE_NO_COMPLETADO",
        "El sobretrabajo sólo se acredita después de completar el bloque.",
      );
    }
    const movimientos =
      await this.dependencias.repositorioRecuperacion.listarMovimientos();
    const reduccion =
      await this.dependencias.repositorioRecuperacion.obtenerReduccionPorBloque(
        bloque.id,
      );
    const calculo = calcularBloqueAcreditable(
      bloque,
      await this.dependencias.repositorioSesiones.listarPorBloque(bloque.id),
      movimientos,
      obtenerConfiguracion(this.dependencias),
      reduccion?.minutosReducidos ?? 0,
    );
    if (!calculo || calculo.minutosAcreditables === 0) {
      throw new ErrorGestionRecuperacion(
        "SOBRETRABAJO_NO_ACREDITABLE",
        "El bloque no posee sobretrabajo finalizado dentro de los topes vigentes.",
      );
    }
    const movimiento = new MovimientoRecuperacion({
      id: this.dependencias.generadorIdentificadores.generar(),
      operacionId: comando.operacionId,
      tipo: "ACREDITACION",
      minutos: calculo.minutosAcreditables,
      bloqueFuenteId: bloque.id,
      fechaFuente: bloque.fecha,
      descripcion: `Sobretrabajo verificado en ${bloque.titulo}`,
      ocurridoEn: this.dependencias.reloj.ahora(),
    });
    try {
      await this.dependencias.repositorioRecuperacion.guardarAcreditacion(
        movimiento,
        obtenerConfiguracion(this.dependencias),
      );
    } catch (error: unknown) {
      if (!(error instanceof ErrorPersistenciaRecuperacionDuplicada))
        throw error;
      const ganador =
        await this.dependencias.repositorioRecuperacion.obtenerMovimientoPorOperacionId(
          comando.operacionId,
        );
      if (ganador) return resolverReintento(ganador, "ACREDITACION", bloque.id);
      throw new ErrorGestionRecuperacion(
        "CONFLICTO_CONCURRENCIA",
        "La acreditación cambió en otra pestaña. Actualiza el banco.",
        error,
      );
    }
    return aceptarMovimiento(movimiento, false);
  }
}

export class CasoDeUsoConsumirRecuperacion {
  constructor(private readonly dependencias: DependenciasRecuperacion) {}

  public async ejecutar(comando: {
    readonly operacionId: string;
    readonly bloqueId: string;
    readonly minutos: number;
  }): Promise<
    Readonly<{
      movimiento: MovimientoRecuperacionDto;
      reintentoIdempotente: boolean;
    }>
  > {
    const existente =
      await this.dependencias.repositorioRecuperacion.obtenerMovimientoPorOperacionId(
        comando.operacionId,
      );
    if (existente) {
      const resultado = resolverReintento(
        existente,
        "CONSUMO",
        comando.bloqueId,
      );
      if (existente.minutos !== comando.minutos) operacionConflictiva();
      return resultado;
    }
    if (
      await this.dependencias.repositorioRecuperacion.obtenerReduccionPorBloque(
        comando.bloqueId,
      )
    ) {
      throw new ErrorGestionRecuperacion(
        "BLOQUE_YA_REDUCIDO",
        "El bloque ya posee una reducción de carga.",
      );
    }
    const bloque = await buscarBloqueConfirmado(
      this.dependencias.repositorioCortes,
      comando.bloqueId,
    );
    if (!bloque) {
      throw new ErrorGestionRecuperacion(
        "BLOQUE_NO_ENCONTRADO",
        "No existe una instantánea confirmada del bloque.",
      );
    }
    if (!bloque.fecha.esPosteriorA(this.dependencias.calendarioLocal.hoy())) {
      throw new ErrorGestionRecuperacion(
        "BLOQUE_NO_FUTURO",
        "La recuperación sólo puede reducir carga de una fecha futura.",
      );
    }
    const [resolucion, ajustes] = await Promise.all([
      this.dependencias.repositorioResoluciones.obtenerPorBloqueId(bloque.id),
      this.dependencias.repositorioAjustes.listarAjustes(),
    ]);
    if (
      resolucion ||
      ajustes.some(({ bloqueId }) => bloqueId === bloque.id) ||
      bloque.politica.rigidez !== "FLEXIBLE" ||
      !bloque.politica.ajustesPermitidos.includes("REDUCIR_CARGA")
    ) {
      throw new ErrorGestionRecuperacion(
        "BLOQUE_NO_REDUCIBLE",
        "El bloque debe estar pendiente y permitir explícitamente reducir carga.",
      );
    }
    if (
      !Number.isInteger(comando.minutos) ||
      comando.minutos <= 0 ||
      comando.minutos >= bloque.minutosPlanificados
    ) {
      throw new ErrorGestionRecuperacion(
        "REDUCCION_INVALIDA",
        "La reducción debe ser un entero positivo y conservar al menos un minuto de carga.",
      );
    }
    const ahora = this.dependencias.reloj.ahora();
    const movimiento = new MovimientoRecuperacion({
      id: this.dependencias.generadorIdentificadores.generar(),
      operacionId: comando.operacionId,
      tipo: "CONSUMO",
      minutos: comando.minutos,
      bloqueFuenteId: bloque.id,
      fechaFuente: bloque.fecha,
      descripcion: `Reducción de carga futura en ${bloque.titulo}`,
      ocurridoEn: ahora,
    });
    const reduccion = new ReduccionCarga({
      id: this.dependencias.generadorIdentificadores.generar(),
      operacionId: comando.operacionId,
      movimientoId: movimiento.id,
      bloqueId: bloque.id,
      minutosReducidos: comando.minutos,
      aplicadaEn: ahora,
    });
    try {
      await this.dependencias.repositorioRecuperacion.confirmarConsumo(
        movimiento,
        reduccion,
      );
    } catch (error: unknown) {
      if (
        error instanceof ErrorDominio &&
        error.codigo === "SALDO_RECUPERACION_INSUFICIENTE"
      ) {
        throw error;
      }
      if (!(error instanceof ErrorPersistenciaRecuperacionDuplicada))
        throw error;
      const ganador =
        await this.dependencias.repositorioRecuperacion.obtenerMovimientoPorOperacionId(
          comando.operacionId,
        );
      if (ganador) return resolverReintento(ganador, "CONSUMO", bloque.id);
      throw new ErrorGestionRecuperacion(
        "CONFLICTO_CONCURRENCIA",
        "El consumo cambió en otra pestaña. Actualiza el banco.",
        error,
      );
    }
    return aceptarMovimiento(movimiento, false);
  }
}

function obtenerConfiguracion(
  dependencias: DependenciasRecuperacion,
): ConfiguracionRecuperacion {
  return dependencias.configuracion ?? CONFIGURACION_RECUPERACION_INICIAL;
}

function listarBloquesConfirmados(
  cortes: Awaited<ReturnType<RepositorioCortesPlanificacion["listar"]>>,
): readonly VistaBloqueCortePlanificacion[] {
  const unicos = new Map<string, VistaBloqueCortePlanificacion>();
  for (const corte of cortes) {
    if (corte.estado !== "CONFIRMADA") continue;
    for (const bloque of corte.listarBloques()) unicos.set(bloque.id, bloque);
  }
  return [...unicos.values()];
}

async function buscarBloqueConfirmado(
  repositorio: RepositorioCortesPlanificacion,
  bloqueId: string,
): Promise<VistaBloqueCortePlanificacion | undefined> {
  return listarBloquesConfirmados(await repositorio.listar()).find(
    ({ id }) => id === bloqueId,
  );
}

function calcularBloqueAcreditable(
  bloque: VistaBloqueCortePlanificacion,
  sesiones: Awaited<
    ReturnType<RepositorioSesionesCronometro["listarPorBloque"]>
  >,
  movimientos: readonly MovimientoRecuperacion[],
  configuracion: ConfiguracionRecuperacion,
  minutosReducidos = 0,
): BloqueAcreditableRecuperacionDto | undefined {
  const minutosCronometrados = Math.floor(
    sesiones
      .filter(({ estado }) => estado === "FINALIZADA")
      .reduce(
        (total, sesion) =>
          total + sesion.duracionMilisegundos(sesion.finalizadaEn!),
        0,
      ) / 60_000,
  );
  const minutosCargaEfectiva = bloque.minutosPlanificados - minutosReducidos;
  const minutosExcedentes = Math.max(
    0,
    minutosCronometrados - minutosCargaEfectiva,
  );
  if (minutosExcedentes === 0) return undefined;
  const acreditadosEnDia = sumarAcreditaciones(movimientos, ({ fechaFuente }) =>
    fechaFuente.esIgualA(bloque.fecha),
  );
  const inicioSemana = obtenerInicioSemana(bloque.fecha);
  const acreditadosEnSemana = sumarAcreditaciones(
    movimientos,
    ({ fechaFuente }) => obtenerInicioSemana(fechaFuente) === inicioSemana,
  );
  return Object.freeze({
    bloqueId: bloque.id,
    titulo: bloque.titulo,
    fecha: bloque.fecha.toString(),
    minutosPlanificados: minutosCargaEfectiva,
    minutosCronometrados,
    minutosExcedentes,
    minutosAcreditables: configuracion.calcularAcreditacion(
      minutosExcedentes,
      acreditadosEnDia,
      acreditadosEnSemana,
    ),
  });
}

function sumarAcreditaciones(
  movimientos: readonly MovimientoRecuperacion[],
  pertenece: (movimiento: MovimientoRecuperacion) => boolean,
): number {
  return movimientos
    .filter(
      (movimiento) =>
        movimiento.tipo === "ACREDITACION" && pertenece(movimiento),
    )
    .reduce((total, { minutos }) => total + minutos, 0);
}

function obtenerInicioSemana(fecha: FechaLocal): string {
  const [anio, mes, dia] = fecha.toString().split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const inicio = new Date(Date.UTC(anio, mes - 1, dia));
  inicio.setUTCDate(inicio.getUTCDate() - (fecha.obtenerDiaSemanaIso() - 1));
  return inicio.toISOString().slice(0, 10);
}

function convertirConfiguracion(configuracion: ConfiguracionRecuperacion) {
  return Object.freeze({
    numeradorTasa: configuracion.numeradorTasa,
    denominadorTasa: configuracion.denominadorTasa,
    maximoDiarioMinutos: configuracion.maximoDiarioMinutos,
    maximoSemanalMinutos: configuracion.maximoSemanalMinutos,
  });
}

function convertirMovimiento(
  movimiento: MovimientoRecuperacion,
): MovimientoRecuperacionDto {
  return Object.freeze({
    id: movimiento.id,
    operacionId: movimiento.operacionId,
    tipo: movimiento.tipo,
    minutos: movimiento.minutos,
    bloqueFuenteId: movimiento.bloqueFuenteId,
    fechaFuente: movimiento.fechaFuente.toString(),
    descripcion: movimiento.descripcion,
    ocurridoEn: movimiento.ocurridoEn.toISOString(),
  });
}

function aceptarMovimiento(
  movimiento: MovimientoRecuperacion,
  reintentoIdempotente: boolean,
) {
  return Object.freeze({
    movimiento: convertirMovimiento(movimiento),
    reintentoIdempotente,
  });
}

function resolverReintento(
  movimiento: MovimientoRecuperacion,
  tipo: MovimientoRecuperacion["tipo"],
  bloqueId: string,
) {
  if (movimiento.tipo !== tipo || movimiento.bloqueFuenteId !== bloqueId) {
    operacionConflictiva();
  }
  return aceptarMovimiento(movimiento, true);
}

function operacionConflictiva(): never {
  throw new ErrorGestionRecuperacion(
    "OPERACION_CONFLICTIVA",
    "El identificador de operación ya describe otro comando de recuperación.",
  );
}
