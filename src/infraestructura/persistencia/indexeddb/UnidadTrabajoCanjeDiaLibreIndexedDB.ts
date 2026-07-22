import {
  ErrorConfirmacionCanjeDiaLibreDuplicada,
  type RepositorioAjustesCompromisos,
  type RepositorioCanjesRecompensas,
  type UnidadTrabajoCanjeDiaLibre,
} from "../../../aplicacion";
import type {
  AjusteCompromiso,
  CanjeRecompensa,
  Identificador,
  TransaccionPuntos,
} from "../../../dominio";
import { BilleteraPuntos } from "../../../dominio";
import {
  convertirAjusteCompromisoEnV1,
  rehidratarAjusteCompromisoDesdeV1,
} from "../mapeadores/MapeadorAjusteCompromisoV1";
import {
  convertirCanjeRecompensaEnV1,
  rehidratarCanjeRecompensaDesdeV1,
} from "../mapeadores/MapeadorCanjeRecompensaV1";
import {
  convertirTransaccionPuntosEnV1,
  rehidratarTransaccionPuntosDesdeV1,
} from "../mapeadores/MapeadorTransaccionPuntosV1";
import type { AjusteCompromisoV1 } from "../registros/AjusteCompromisoV1";
import type { CanjeRecompensaV1 } from "../registros/CanjeRecompensaV1";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";
import {
  ALMACEN_AJUSTES_COMPROMISOS,
  ALMACEN_CANJES_RECOMPENSAS,
  ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
  ALMACEN_TRANSACCIONES_PUNTOS,
  asegurarAlmacenes,
  VERSION_BASE_DATOS,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class ErrorUnidadTrabajoCanjeDiaLibreIndexedDB extends Error {
  constructor(
    public readonly codigo:
      | "INDEXEDDB_NO_DISPONIBLE"
      | "APERTURA_INDEXEDDB_FALLIDA"
      | "LECTURA_INDEXEDDB_FALLIDA"
      | "CONFIRMACION_INDEXEDDB_FALLIDA",
    mensaje: string,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorUnidadTrabajoCanjeDiaLibreIndexedDB";
  }
}

interface ConfiguracionUnidadTrabajoCanjeDiaLibreIndexedDB {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

export class UnidadTrabajoCanjeDiaLibreIndexedDB
  implements
    UnidadTrabajoCanjeDiaLibre,
    RepositorioCanjesRecompensas,
    RepositorioAjustesCompromisos
{
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: ConfiguracionUnidadTrabajoCanjeDiaLibreIndexedDB = {},
  ) {
    const fabricaIndexedDB =
      configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabricaIndexedDB) {
      throw new ErrorUnidadTrabajoCanjeDiaLibreIndexedDB(
        "INDEXEDDB_NO_DISPONIBLE",
        "IndexedDB no está disponible en este entorno.",
      );
    }
    this.fabricaIndexedDB = fabricaIndexedDB;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async confirmar(
    canje: CanjeRecompensa,
    gasto: TransaccionPuntos,
    ajustes: readonly AjusteCompromiso[],
  ): Promise<void> {
    validarCoherencia(canje, gasto, ajustes);
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [
          ALMACEN_CANJES_RECOMPENSAS,
          ALMACEN_TRANSACCIONES_PUNTOS,
          ALMACEN_AJUSTES_COMPROMISOS,
          ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
        ],
        "readwrite",
      );
      const solicitudes: IDBRequest[] = [];
      let causaConflicto: unknown;
      const solicitudMovimientos = transaccion
        .objectStore(ALMACEN_TRANSACCIONES_PUNTOS)
        .getAll();
      const solicitudesResolucion = canje
        .listarBloquesAfectados()
        .map((bloqueId) =>
          transaccion
            .objectStore(ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION)
            .get(bloqueId),
        );
      let lecturasPendientes = 1 + solicitudesResolucion.length;
      const intentarEscribir = () => {
        lecturasPendientes -= 1;
        if (lecturasPendientes > 0) return;
        try {
          if (solicitudesResolucion.some((solicitud) => solicitud.result)) {
            throw new Error(
              "Uno de los bloques fue resuelto antes de confirmar el canje.",
            );
          }
          const billetera = BilleteraPuntos.rehidratar(
            (solicitudMovimientos.result as readonly TransaccionPuntosV1[]).map(
              rehidratarTransaccionPuntosDesdeV1,
            ),
          );
          billetera.registrar(gasto);
          solicitudes.push(
            transaccion
              .objectStore(ALMACEN_CANJES_RECOMPENSAS)
              .add(convertirCanjeRecompensaEnV1(canje)),
          );
          solicitudes.push(
            transaccion
              .objectStore(ALMACEN_TRANSACCIONES_PUNTOS)
              .add(convertirTransaccionPuntosEnV1(gasto)),
          );
          for (const ajuste of ajustes) {
            solicitudes.push(
              transaccion
                .objectStore(ALMACEN_AJUSTES_COMPROMISOS)
                .add(convertirAjusteCompromisoEnV1(ajuste)),
            );
          }
        } catch (error: unknown) {
          causaConflicto = error;
          transaccion.abort();
        }
      };
      solicitudMovimientos.onsuccess = intentarEscribir;
      for (const solicitud of solicitudesResolucion) {
        solicitud.onsuccess = intentarEscribir;
      }
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        const causa =
          causaConflicto ??
          transaccion.error ??
          solicitudes.find((solicitud) => solicitud.error)?.error;
        if (
          causaConflicto ||
          (causa instanceof DOMException && causa.name === "ConstraintError")
        ) {
          reject(new ErrorConfirmacionCanjeDiaLibreDuplicada(causa));
          return;
        }
        reject(
          new ErrorUnidadTrabajoCanjeDiaLibreIndexedDB(
            "CONFIRMACION_INDEXEDDB_FALLIDA",
            "No fue posible confirmar atómicamente el canje de día libre.",
            causa,
          ),
        );
      };
    });
  }

  public async obtenerCanjePorId(
    id: Identificador,
  ): Promise<CanjeRecompensa | undefined> {
    const registro = await this.leerRegistro<CanjeRecompensaV1>(
      ALMACEN_CANJES_RECOMPENSAS,
      id,
    );
    return registro ? rehidratarCanjeRecompensaDesdeV1(registro) : undefined;
  }

  public async listarCanjes(): Promise<readonly CanjeRecompensa[]> {
    const registros = await this.listarRegistros<CanjeRecompensaV1>(
      ALMACEN_CANJES_RECOMPENSAS,
    );
    return registros.map(rehidratarCanjeRecompensaDesdeV1);
  }

  public async listarAjustes(): Promise<readonly AjusteCompromiso[]> {
    const registros = await this.listarRegistros<AjusteCompromisoV1>(
      ALMACEN_AJUSTES_COMPROMISOS,
    );
    return registros.map(rehidratarAjusteCompromisoDesdeV1);
  }

  public async cerrar(): Promise<void> {
    const conexionPendiente = this.conexionPendiente;
    this.conexionPendiente = undefined;
    (await conexionPendiente)?.close();
  }

  private async leerRegistro<T>(
    almacen: string,
    clave: IDBValidKey,
  ): Promise<T | undefined> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(almacen, "readonly");
      const solicitud = transaccion.objectStore(almacen).get(clave);
      transaccion.oncomplete = () => resolve(solicitud.result as T | undefined);
      transaccion.onabort = () => reject(this.errorLectura(transaccion.error));
    });
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

  private errorLectura(causa: unknown): Error {
    return new ErrorUnidadTrabajoCanjeDiaLibreIndexedDB(
      "LECTURA_INDEXEDDB_FALLIDA",
      "No fue posible recuperar el historial de canjes.",
      causa,
    );
  }

  private abrirBaseDatos(): Promise<IDBDatabase> {
    this.conexionPendiente ??= new Promise((resolve, reject) => {
      const solicitud = this.fabricaIndexedDB.open(
        this.nombreBaseDatos,
        VERSION_BASE_DATOS,
      );
      solicitud.onupgradeneeded = () =>
        asegurarAlmacenes(solicitud.result, solicitud.transaction ?? undefined);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorUnidadTrabajoCanjeDiaLibreIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "No fue posible abrir la base de datos de HereToPlan.",
            solicitud.error,
          ),
        );
      };
      solicitud.onblocked = () => {
        this.conexionPendiente = undefined;
        reject(
          new ErrorUnidadTrabajoCanjeDiaLibreIndexedDB(
            "APERTURA_INDEXEDDB_FALLIDA",
            "La base de datos está bloqueada por otra conexión.",
          ),
        );
      };
    });
    return this.conexionPendiente;
  }
}

function validarCoherencia(
  canje: CanjeRecompensa,
  gasto: TransaccionPuntos,
  ajustes: readonly AjusteCompromiso[],
): void {
  const bloquesCanje = [...canje.listarBloquesAfectados()].sort();
  const ajustesOrdenados = [...ajustes].sort((a, b) =>
    a.bloqueId.localeCompare(b.bloqueId),
  );
  const bloquesAjustes = ajustesOrdenados.map((ajuste) => ajuste.bloqueId);
  const gastoCoherente =
    gasto.tipo === "GASTO" &&
    gasto.fuenteTipo === "CANJE_RECOMPENSA" &&
    gasto.fuenteId === canje.id &&
    gasto.cantidad === canje.puntosGastados;
  const ajustesCoherentes =
    bloquesCanje.length === bloquesAjustes.length &&
    bloquesCanje.every(
      (bloqueId, indice) =>
        bloqueId === bloquesAjustes[indice] &&
        ajustesOrdenados[indice]?.canjeRecompensaId === canje.id &&
        ajustesOrdenados[indice]?.tipo === "EXCUSAR",
    );
  if (!gastoCoherente || !ajustesCoherentes) {
    throw new Error(
      "El canje, el gasto y los ajustes no describen la misma operación.",
    );
  }
}
