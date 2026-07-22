import {
  ErrorAdquisicionRecompensaDuplicada,
  type RepositorioInventarioRecompensas,
  type UnidadTrabajoAdquisicionRecompensa,
} from "../../../aplicacion";
import {
  BilleteraPuntos,
  type AplicacionRecompensa,
  type Identificador,
  type RecompensaAdquirida,
  type TransaccionPuntos,
} from "../../../dominio";
import { rehidratarAplicacionRecompensaDesdeV1 } from "../mapeadores/MapeadorAplicacionRecompensaV1";
import {
  convertirRecompensaAdquiridaEnV1,
  rehidratarRecompensaAdquiridaDesdeV1,
} from "../mapeadores/MapeadorRecompensaAdquiridaV1";
import {
  convertirTransaccionPuntosEnV1,
  rehidratarTransaccionPuntosDesdeV1,
} from "../mapeadores/MapeadorTransaccionPuntosV1";
import type { AplicacionRecompensaV1 } from "../registros/AplicacionRecompensaV1";
import type { RecompensaAdquiridaV1 } from "../registros/RecompensaAdquiridaV1";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";
import {
  ALMACEN_APLICACIONES_RECOMPENSAS,
  ALMACEN_RECOMPENSAS_ADQUIRIDAS,
  ALMACEN_TRANSACCIONES_PUNTOS,
  VERSION_BASE_DATOS,
  asegurarAlmacenes,
} from "./esquemaBaseDatos";

const NOMBRE_BASE_DATOS_PREDETERMINADO = "here-to-plan";

export class UnidadTrabajoAdquisicionRecompensaIndexedDB
  implements
    UnidadTrabajoAdquisicionRecompensa,
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
