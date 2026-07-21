import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArchivoRespaldo } from "../src/aplicacion";
import {
  descargarArchivoRespaldo,
  leerArchivoRespaldo,
} from "../src/infraestructura/archivos/ArchivosRespaldoNavegador";

afterEach(() => vi.restoreAllMocks());

describe("adaptadores de archivos de respaldo", () => {
  it("descarga mediante un enlace temporal y libera la URL del Blob", () => {
    const crearUrl = vi.fn(() => "blob:respaldo");
    const revocarUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: crearUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revocarUrl,
    });
    const hacerClic = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    descargarArchivoRespaldo(archivoPrueba);

    expect(crearUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(hacerClic).toHaveBeenCalledOnce();
    expect(revocarUrl).toHaveBeenCalledWith("blob:respaldo");
    expect(document.querySelector('a[download="respaldo.json"]')).toBeNull();
  });

  it("lee el contenido textual de un archivo aceptable", async () => {
    const archivo = {
      size: 2,
      text: () => Promise.resolve("{}"),
    } as File;

    await expect(leerArchivoRespaldo(archivo)).resolves.toBe("{}");
  });

  it("rechaza archivos mayores de 25 MiB antes de leerlos", async () => {
    const leer = vi.fn(() => Promise.resolve("{}"));
    const archivo = {
      size: 25 * 1024 * 1024 + 1,
      text: leer,
    } as unknown as File;

    await expect(leerArchivoRespaldo(archivo)).rejects.toThrow(
      "supera el límite de 25 MiB",
    );
    expect(leer).not.toHaveBeenCalled();
  });

  it("traduce un fallo del lector nativo sin exponer una falsa validación", async () => {
    const archivo = {
      size: 2,
      text: () => Promise.reject(new Error("lector roto")),
    } as File;

    await expect(leerArchivoRespaldo(archivo)).rejects.toThrow(
      "No fue posible leer el archivo seleccionado",
    );
  });
});

const archivoPrueba: ArchivoRespaldo = {
  nombre: "respaldo.json",
  tipoMime: "application/json",
  contenido: "{}",
  respaldo: {
    formato: "HereToPlan.respaldo",
    versionFormato: 1,
    creadoEn: "2026-07-20T15:30:00.000Z",
    origen: { aplicacion: "HereToPlan", versionBaseDatos: 10 },
    contenido: {
      agendas: [],
      actividades: [],
      "contextos-planificacion": [],
      "bloques-planificacion": [],
      "cortes-planificacion": [],
      "resoluciones-bloques-planificacion": [],
      "transacciones-puntos": [],
      "canjes-recompensas": [],
      "ajustes-compromisos": [],
      "sesiones-cronometro": [],
      "movimientos-recuperacion": [],
      "reducciones-carga": [],
    },
  },
};
