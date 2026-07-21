import {
  ErrorPersistenciaRecuperacionDuplicada,
  type RepositorioRecuperacion,
} from "../../../aplicacion";
import {
  BancoRecuperacion,
  ConfiguracionRecuperacion,
  ErrorDominio,
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
import {
  ALMACEN_AJUSTES_COMPROMISOS,
  ALMACEN_MOVIMIENTOS_RECUPERACION,
  ALMACEN_REDUCCIONES_CARGA,
  ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
  asegurarAlmacenes,
  INDICE_AJUSTES_POR_BLOQUE,
  INDICE_RECUPERACION_POR_FUENTE,
  INDICE_RECUPERACION_POR_OPERACION,
  INDICE_REDUCCION_POR_BLOQUE,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorRepositorioRecuperacionIndexedDB extends Error {
  constructor(
    public readonly codigo:
      | "INDEXEDDB_NO_DISPONIBLE"
      | "APERTURA_INDEXEDDB_FALLIDA"
      | "LECTURA_INDEXEDDB_FALLIDA"
      | "ESCRITURA_INDEXEDDB_FALLIDA",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorRepositorioRecuperacionIndexedDB";
  }
}

export interface ConfiguracionRepositorioRecuperacionIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class RepositorioRecuperacionIndexedDB implements RepositorioRecuperacion {
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionRepositorioRecuperacionIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorRepositorioRecuperacionIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async listarMovimientos(): Promise<readonly MovimientoRecuperacion[]> {
    const registros = await this.listarRegistros<MovimientoRecuperacionV1>(
      ALMACEN_MOVIMIENTOS_RECUPERACION,
    );
    return registros.map(rehidratarMovimientoRecuperacionDesdeV1);
  }

  public async listarReducciones(): Promise<readonly ReduccionCarga[]> {
    const registros = await this.listarRegistros<ReduccionCargaV1>(
      ALMACEN_REDUCCIONES_CARGA,
    );
    return registros.map(rehidratarReduccionCargaDesdeV1);
  }

  public async obtenerMovimientoPorOperacionId(
    operacionId: Identificador,
  ): Promise<MovimientoRecuperacion | undefined> {
    const registro = await this.leerRegistro<MovimientoRecuperacionV1>(
      ALMACEN_MOVIMIENTOS_RECUPERACION,
      (almacen) =>
        almacen.index(INDICE_RECUPERACION_POR_OPERACION).get(operacionId),
    );
    return registro
      ? rehidratarMovimientoRecuperacionDesdeV1(registro)
      : undefined;
  }

  public async obtenerMovimientoPorFuente(
    tipo: TipoMovimientoRecuperacion,
    bloqueFuenteId: Identificador,
  ): Promise<MovimientoRecuperacion | undefined> {
    const registro = await this.leerRegistro<MovimientoRecuperacionV1>(
      ALMACEN_MOVIMIENTOS_RECUPERACION,
      (almacen) =>
        almacen
          .index(INDICE_RECUPERACION_POR_FUENTE)
          .get([tipo, bloqueFuenteId]),
    );
    return registro
      ? rehidratarMovimientoRecuperacionDesdeV1(registro)
      : undefined;
  }

  public async obtenerReduccionPorBloque(
    bloqueId: Identificador,
  ): Promise<ReduccionCarga | undefined> {
    const registro = await this.leerRegistro<ReduccionCargaV1>(
      ALMACEN_REDUCCIONES_CARGA,
      (almacen) => almacen.index(INDICE_REDUCCION_POR_BLOQUE).get(bloqueId),
    );
    return registro ? rehidratarReduccionCargaDesdeV1(registro) : undefined;
  }

  public async guardarAcreditacion(
    movimiento: MovimientoRecuperacion,
    configuracion: ConfiguracionRecuperacion,
  ): Promise<void> {
    if (movimiento.tipo !== "ACREDITACION") {
      throw new Error(
        "Sólo una acreditación puede guardarse sin reducción asociada.",
      );
    }
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        ALMACEN_MOVIMIENTOS_RECUPERACION,
        "readwrite",
      );
      const almacen = transaccion.objectStore(ALMACEN_MOVIMIENTOS_RECUPERACION);
      const lectura = almacen.getAll();
      let solicitud: IDBRequest | undefined;
      let causaDominio: unknown;
      lectura.onsuccess = () => {
        try {
          const existentes = (
            lectura.result as readonly MovimientoRecuperacionV1[]
          ).map(rehidratarMovimientoRecuperacionDesdeV1);
          const acreditaciones = existentes.filter(
            ({ tipo }) => tipo === "ACREDITACION",
          );
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
          solicitud = almacen.add(
            convertirMovimientoRecuperacionEnV1(movimiento),
          );
        } catch (error: unknown) {
          causaDominio = error;
          transaccion.abort();
        }
      };
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (causaDominio instanceof ErrorDominio) {
          reject(causaDominio);
          return;
        }
        rechazarEscritura(reject, solicitud?.error ?? transaccion.error);
      };
    });
  }

  public async confirmarConsumo(
    movimiento: MovimientoRecuperacion,
    reduccion: ReduccionCarga,
  ): Promise<void> {
    validarCoherenciaConsumo(movimiento, reduccion);
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [
          ALMACEN_MOVIMIENTOS_RECUPERACION,
          ALMACEN_REDUCCIONES_CARGA,
          ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
          ALMACEN_AJUSTES_COMPROMISOS,
        ],
        "readwrite",
      );
      const almacenMovimientos = transaccion.objectStore(
        ALMACEN_MOVIMIENTOS_RECUPERACION,
      );
      const solicitudMovimientos = almacenMovimientos.getAll();
      const solicitudResolucion = transaccion
        .objectStore(ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION)
        .get(reduccion.bloqueId);
      const solicitudAjuste = transaccion
        .objectStore(ALMACEN_AJUSTES_COMPROMISOS)
        .index(INDICE_AJUSTES_POR_BLOQUE)
        .get(reduccion.bloqueId);
      const escrituras: IDBRequest[] = [];
      let lecturasPendientes = 3;
      let causaDominio: unknown;
      const intentarEscribir = () => {
        lecturasPendientes -= 1;
        if (lecturasPendientes > 0) return;
        try {
          if (solicitudResolucion.result || solicitudAjuste.result) {
            throw new ErrorPersistenciaRecuperacionDuplicada(
              new Error("El bloque dejó de estar pendiente."),
            );
          }
          const banco = BancoRecuperacion.rehidratar(
            (
              solicitudMovimientos.result as readonly MovimientoRecuperacionV1[]
            ).map(rehidratarMovimientoRecuperacionDesdeV1),
          );
          banco.registrar(movimiento);
          escrituras.push(
            almacenMovimientos.add(
              convertirMovimientoRecuperacionEnV1(movimiento),
            ),
          );
          escrituras.push(
            transaccion
              .objectStore(ALMACEN_REDUCCIONES_CARGA)
              .add(convertirReduccionCargaEnV1(reduccion)),
          );
        } catch (error: unknown) {
          causaDominio = error;
          transaccion.abort();
        }
      };
      solicitudMovimientos.onsuccess = intentarEscribir;
      solicitudResolucion.onsuccess = intentarEscribir;
      solicitudAjuste.onsuccess = intentarEscribir;
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        if (
          causaDominio instanceof ErrorDominio ||
          causaDominio instanceof ErrorPersistenciaRecuperacionDuplicada
        ) {
          reject(causaDominio);
          return;
        }
        const causa =
          causaDominio ??
          escrituras.find(({ error }) => error)?.error ??
          transaccion.error;
        rechazarEscritura(reject, causa);
      };
    });
  }

  public async cerrar(): Promise<void> {
    const conexionPendiente = this.conexionPendiente;
    this.conexionPendiente = undefined;
    (await conexionPendiente)?.close();
  }

  private async listarRegistros<T>(almacen: string): Promise<readonly T[]> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(almacen, "readonly");
      const solicitud = transaccion.objectStore(almacen).getAll();
      transaccion.oncomplete = () => resolve(solicitud.result as readonly T[]);
      transaccion.onabort = () => reject(this.errorLectura(transaccion.error));
    });
  }

  private async leerRegistro<T>(
    almacen: string,
    solicitar: (almacen: IDBObjectStore) => IDBRequest,
  ): Promise<T | undefined> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(almacen, "readonly");
      const solicitud = solicitar(transaccion.objectStore(almacen));
      transaccion.oncomplete = () => resolve(solicitud.result as T | undefined);
      transaccion.onabort = () => reject(this.errorLectura(transaccion.error));
    });
  }

  private errorLectura(causa: unknown): Error {
    return new ErrorRepositorioRecuperacionIndexedDB(
      "LECTURA_INDEXEDDB_FALLIDA",
      "No fue posible recuperar el banco de recuperación.",
      causa,
    );
  }

  private abrirBaseDatos(): Promise<IDBDatabase> {
    this.conexionPendiente ??= new Promise((resolve, reject) => {
      const solicitud = this.fabricaIndexedDB.open(
        this.nombreBaseDatos,
        VERSION_BASE_DATOS,
      );
      solicitud.onupgradeneeded = () => asegurarAlmacenes(solicitud.result);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioRecuperacionIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorRepositorioRecuperacionIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}

function validarCoherenciaConsumo(
  movimiento: MovimientoRecuperacion,
  reduccion: ReduccionCarga,
): void {
  if (
    movimiento.tipo !== "CONSUMO" ||
    movimiento.id !== reduccion.movimientoId ||
    movimiento.operacionId !== reduccion.operacionId ||
    movimiento.bloqueFuenteId !== reduccion.bloqueId ||
    movimiento.minutos !== reduccion.minutosReducidos
  ) {
    throw new Error(
      "El consumo y la reducción no describen la misma operación.",
    );
  }
}

function rechazarEscritura(
  reject: (razon?: unknown) => void,
  causa: unknown,
): void {
  if (causa instanceof DOMException && causa.name === "ConstraintError") {
    reject(new ErrorPersistenciaRecuperacionDuplicada(causa));
    return;
  }
  reject(
    new ErrorRepositorioRecuperacionIndexedDB(
      "ESCRITURA_INDEXEDDB_FALLIDA",
      "No fue posible persistir la operación de recuperación.",
      causa,
    ),
  );
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
