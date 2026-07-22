import {
  ErrorAplicacionRecompensaDuplicada,
  ErrorAdquisicionRecompensaDuplicada,
  type RepositorioInventarioRecompensas,
  type UnidadTrabajoAdquisicionRecompensa,
  type UnidadTrabajoAplicacionRecompensa,
} from "../../../aplicacion";
import {
  BilleteraPuntos,
  type AjusteCompromiso,
  type AplicacionRecompensa,
  type Identificador,
  type RecompensaAdquirida,
  type TransaccionPuntos,
} from "../../../dominio";
import {
  convertirAplicacionRecompensaEnV1,
  rehidratarAplicacionRecompensaDesdeV1,
} from "../mapeadores/MapeadorAplicacionRecompensaV1";
import { convertirAjusteCompromisoEnV1 } from "../mapeadores/MapeadorAjusteCompromisoV1";
import {
  convertirRecompensaAdquiridaEnV1,
  rehidratarRecompensaAdquiridaDesdeV1,
} from "../mapeadores/MapeadorRecompensaAdquiridaV1";
import {
  convertirTransaccionPuntosEnV1,
  rehidratarTransaccionPuntosDesdeV1,
} from "../mapeadores/MapeadorTransaccionPuntosV1";
import type { AplicacionRecompensaV1 } from "../registros/AplicacionRecompensaV1";
import type { AjusteCompromisoV1 } from "../registros/AjusteCompromisoV1";
import type { RecompensaAdquiridaV1 } from "../registros/RecompensaAdquiridaV1";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";
import {
  ALMACEN_APLICACIONES_RECOMPENSAS,
  ALMACEN_AJUSTES_COMPROMISOS,
  ALMACEN_RECOMPENSAS_ADQUIRIDAS,
  ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
  ALMACEN_TRANSACCIONES_PUNTOS,
  VERSION_BASE_DATOS,
  asegurarAlmacenes,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class UnidadTrabajoAdquisicionRecompensaIndexedDB
  implements
    UnidadTrabajoAdquisicionRecompensa,
    UnidadTrabajoAplicacionRecompensa,
    RepositorioInventarioRecompensas
{
  private readonly fabricaIndexedDB: IDBFactory;
  private readonly nombreBaseDatos: string;
  private conexionPendiente: Promise<IDBDatabase> | undefined;

  constructor(
    configuracion: Readonly<{
      fabricaIndexedDB?: IDBFactory;
      nombreBaseDatos?: string;
    }> = {},
  ) {
    const fabrica = configuracion.fabricaIndexedDB ?? globalThis.indexedDB;
    if (!fabrica) throw new Error("IndexedDB no está disponible.");
    this.fabricaIndexedDB = fabrica;
    this.nombreBaseDatos =
      configuracion.nombreBaseDatos ?? NOMBRE_BASE_DATOS_PREDETERMINADO;
  }

  public async confirmarAdquisicion(
    adquirida: RecompensaAdquirida,
    gasto: TransaccionPuntos,
  ): Promise<void> {
    validarCoherencia(adquirida, gasto);
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [ALMACEN_RECOMPENSAS_ADQUIRIDAS, ALMACEN_TRANSACCIONES_PUNTOS],
        "readwrite",
      );
      const movimientos = transaccion
        .objectStore(ALMACEN_TRANSACCIONES_PUNTOS)
        .getAll();
      let causa: unknown;
      const solicitudes: IDBRequest[] = [];
      movimientos.onsuccess = () => {
        try {
          const billetera = BilleteraPuntos.rehidratar(
            (movimientos.result as readonly TransaccionPuntosV1[]).map(
              rehidratarTransaccionPuntosDesdeV1,
            ),
          );
          billetera.registrar(gasto);
          solicitudes.push(
            transaccion
              .objectStore(ALMACEN_RECOMPENSAS_ADQUIRIDAS)
              .add(convertirRecompensaAdquiridaEnV1(adquirida)),
          );
          solicitudes.push(
            transaccion
              .objectStore(ALMACEN_TRANSACCIONES_PUNTOS)
              .add(convertirTransaccionPuntosEnV1(gasto)),
          );
        } catch (error: unknown) {
          causa = error;
          transaccion.abort();
        }
      };
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        const error =
          causa ??
          transaccion.error ??
          solicitudes.find((solicitud) => solicitud.error)?.error;
        if (
          causa ||
          (error instanceof DOMException && error.name === "ConstraintError")
        ) {
          reject(new ErrorAdquisicionRecompensaDuplicada(error));
          return;
        }
        reject(comoError(error, "No fue posible confirmar la adquisición."));
      };
    });
  }

  public async confirmarAplicacion(
    adquiridaConsumida: RecompensaAdquirida,
    aplicacion: AplicacionRecompensa,
    ajustes: readonly AjusteCompromiso[],
  ): Promise<void> {
    validarCoherenciaAplicacion(adquiridaConsumida, aplicacion, ajustes);
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(
        [
          ALMACEN_RECOMPENSAS_ADQUIRIDAS,
          ALMACEN_APLICACIONES_RECOMPENSAS,
          ALMACEN_AJUSTES_COMPROMISOS,
          ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION,
        ],
        "readwrite",
      );
      const inventario = transaccion.objectStore(
        ALMACEN_RECOMPENSAS_ADQUIRIDAS,
      );
      const adquiridaActual = inventario.get(adquiridaConsumida.id);
      const ajustesActuales = transaccion
        .objectStore(ALMACEN_AJUSTES_COMPROMISOS)
        .getAll();
      const resoluciones = aplicacion
        .listarBloquesAfectados()
        .map((bloqueId) =>
          transaccion
            .objectStore(ALMACEN_RESOLUCIONES_BLOQUES_PLANIFICACION)
            .get(bloqueId),
        );
      const solicitudes: IDBRequest[] = [];
      let lecturasPendientes = 2 + resoluciones.length;
      let causa: unknown;
      const intentarEscribir = () => {
        lecturasPendientes -= 1;
        if (lecturasPendientes > 0) return;
        try {
          const registroActual = adquiridaActual.result as
            RecompensaAdquiridaV1 | undefined;
          if (
            !registroActual ||
            rehidratarRecompensaAdquiridaDesdeV1(registroActual).estado !==
              "DISPONIBLE" ||
            resoluciones.some((solicitud) => solicitud.result)
          ) {
            throw new Error(
              "La unidad o uno de los bloques cambió antes de confirmar.",
            );
          }
          const bloques = new Set(ajustes.map((ajuste) => ajuste.bloqueId));
          if (
            (ajustesActuales.result as readonly AjusteCompromisoV1[]).some(
              (ajuste) => bloques.has(ajuste.bloqueId),
            )
          ) {
            throw new Error("Uno de los bloques ya posee un ajuste.");
          }
          solicitudes.push(
            inventario.put(
              convertirRecompensaAdquiridaEnV1(adquiridaConsumida),
            ),
            transaccion
              .objectStore(ALMACEN_APLICACIONES_RECOMPENSAS)
              .add(convertirAplicacionRecompensaEnV1(aplicacion)),
          );
          for (const ajuste of ajustes) {
            solicitudes.push(
              transaccion
                .objectStore(ALMACEN_AJUSTES_COMPROMISOS)
                .add(convertirAjusteCompromisoEnV1(ajuste)),
            );
          }
        } catch (error: unknown) {
          causa = error;
          transaccion.abort();
        }
      };
      adquiridaActual.onsuccess = intentarEscribir;
      ajustesActuales.onsuccess = intentarEscribir;
      for (const resolucion of resoluciones) {
        resolucion.onsuccess = intentarEscribir;
      }
      transaccion.oncomplete = () => resolve();
      transaccion.onabort = () => {
        const error =
          causa ??
          transaccion.error ??
          solicitudes.find((solicitud) => solicitud.error)?.error;
        if (
          causa ||
          (error instanceof DOMException && error.name === "ConstraintError")
        ) {
          reject(new ErrorAplicacionRecompensaDuplicada(error));
          return;
        }
        reject(comoError(error, "No fue posible confirmar la aplicación."));
      };
    });
  }

  public async obtenerAdquiridaPorId(
    id: Identificador,
  ): Promise<RecompensaAdquirida | undefined> {
    const registro = await this.leer<RecompensaAdquiridaV1>(
      ALMACEN_RECOMPENSAS_ADQUIRIDAS,
      id,
    );
    return registro
      ? rehidratarRecompensaAdquiridaDesdeV1(registro)
      : undefined;
  }

  public async listarAdquiridas(): Promise<readonly RecompensaAdquirida[]> {
    const registros = await this.listar<RecompensaAdquiridaV1>(
      ALMACEN_RECOMPENSAS_ADQUIRIDAS,
    );
    return registros.map(rehidratarRecompensaAdquiridaDesdeV1);
  }

  public async listarAplicaciones(): Promise<readonly AplicacionRecompensa[]> {
    const registros = await this.listar<AplicacionRecompensaV1>(
      ALMACEN_APLICACIONES_RECOMPENSAS,
    );
    return registros.map(rehidratarAplicacionRecompensaDesdeV1);
  }

  public async obtenerAplicacionPorId(
    id: Identificador,
  ): Promise<AplicacionRecompensa | undefined> {
    const registro = await this.leer<AplicacionRecompensaV1>(
      ALMACEN_APLICACIONES_RECOMPENSAS,
      id,
    );
    return registro
      ? rehidratarAplicacionRecompensaDesdeV1(registro)
      : undefined;
  }

  public async cerrar(): Promise<void> {
    const conexion = this.conexionPendiente;
    this.conexionPendiente = undefined;
    (await conexion)?.close();
  }

  private async leer<T>(
    almacen: string,
    clave: IDBValidKey,
  ): Promise<T | undefined> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(almacen, "readonly");
      const solicitud = transaccion.objectStore(almacen).get(clave);
      transaccion.oncomplete = () => resolve(solicitud.result as T | undefined);
      transaccion.onabort = () =>
        reject(comoError(transaccion.error, "No fue posible leer la unidad."));
    });
  }

  private async listar<T>(almacen: string): Promise<readonly T[]> {
    const baseDatos = await this.abrirBaseDatos();
    return new Promise((resolve, reject) => {
      const transaccion = baseDatos.transaction(almacen, "readonly");
      const solicitud = transaccion.objectStore(almacen).getAll();
      transaccion.oncomplete = () => resolve(solicitud.result as readonly T[]);
      transaccion.onabort = () =>
        reject(
          comoError(transaccion.error, "No fue posible listar el inventario."),
        );
    });
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
      solicitud.onerror = () =>
        reject(
          comoError(solicitud.error, "No fue posible abrir la base de datos."),
        );
      solicitud.onblocked = () =>
        reject(new Error("La base de datos está bloqueada."));
    });
    return this.conexionPendiente;
  }
}

function comoError(causa: unknown, mensaje: string): Error {
  return causa instanceof Error ? causa : new Error(mensaje, { cause: causa });
}

function validarCoherencia(
  adquirida: RecompensaAdquirida,
  gasto: TransaccionPuntos,
): void {
  if (
    adquirida.estado !== "DISPONIBLE" ||
    gasto.tipo !== "GASTO" ||
    gasto.fuenteTipo !== "ADQUISICION_RECOMPENSA" ||
    gasto.fuenteId !== adquirida.id ||
    gasto.cantidad !== adquirida.puntosGastados
  ) {
    throw new Error(
      "La recompensa adquirida y el gasto no describen la misma operación.",
    );
  }
}

function validarCoherenciaAplicacion(
  adquirida: RecompensaAdquirida,
  aplicacion: AplicacionRecompensa,
  ajustes: readonly AjusteCompromiso[],
): void {
  const afectados = [...aplicacion.listarBloquesAfectados()].sort();
  const ajustesOrdenados = [...ajustes].sort((a, b) =>
    a.bloqueId.localeCompare(b.bloqueId),
  );
  if (
    adquirida.estado !== "CONSUMIDA" ||
    adquirida.aplicacionId !== aplicacion.id ||
    aplicacion.recompensaAdquiridaId !== adquirida.id ||
    aplicacion.recompensaId !== adquirida.recompensaId ||
    ajustesOrdenados.length !== afectados.length ||
    ajustesOrdenados.some(
      (ajuste, indice) =>
        ajuste.bloqueId !== afectados[indice] ||
        ajuste.canjeRecompensaId !== aplicacion.id ||
        ajuste.tipo !== "EXCUSAR",
    )
  ) {
    throw new Error(
      "La unidad, la aplicación y los ajustes no describen la misma operación.",
    );
  }
}
