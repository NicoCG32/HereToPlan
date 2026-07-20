import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  ErrorConflictoPersistenciaSesionCronometro,
  type RepositorioSesionesCronometro,
} from "../src/aplicacion";
import { SesionCronometro } from "../src/dominio";
import { RepositorioSesionesCronometroIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioSesionesCronometroIndexedDB";
import { RepositorioSesionesCronometroEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioSesionesCronometroEnMemoria";

type RepositorioCerrable = RepositorioSesionesCronometro & {
  cerrar?: () => Promise<void>;
};

const inicio = new Date("2026-07-20T10:00:00.000Z");

describe.each([
  ["memoria", () => new RepositorioSesionesCronometroEnMemoria()],
  [
    "IndexedDB",
    () =>
      new RepositorioSesionesCronometroIndexedDB({
        fabricaIndexedDB: new IDBFactory(),
        nombreBaseDatos: `cronometro-${crypto.randomUUID()}`,
      }),
  ],
])("repositorio de sesiones en %s", (_nombre, crearRepositorio) => {
  it("recupera estado, duración y operación después de guardar", async () => {
    const repositorio = crearRepositorio() as RepositorioCerrable;
    const sesion = crearSesion("sesion-1", "bloque-1", "iniciar-1");
    await repositorio.guardar(sesion, 0);
    sesion.pausar("pausar-1", new Date("2026-07-20T10:15:00.000Z"));
    await repositorio.guardar(sesion, 1);

    const recuperada = await repositorio.obtenerPorId("sesion-1");
    expect(recuperada).toMatchObject({
      estado: "PAUSADA",
      revision: 2,
    });
    expect(recuperada?.duracionMilisegundos(new Date("2030-01-01"))).toBe(
      15 * 60 * 1000,
    );
    await expect(
      repositorio.obtenerPorOperacionId("pausar-1"),
    ).resolves.toMatchObject({
      id: "sesion-1",
    });
    await expect(repositorio.listarPorBloque("bloque-1")).resolves.toHaveLength(
      1,
    );
    await repositorio.cerrar?.();
  });

  it("impide revisiones obsoletas y dos sesiones abiertas", async () => {
    const repositorio = crearRepositorio() as RepositorioCerrable;
    const primera = crearSesion("sesion-1", "bloque-1", "iniciar-1");
    await repositorio.guardar(primera, 0);

    primera.pausar("pausar-1", new Date("2026-07-20T10:05:00.000Z"));
    await expect(repositorio.guardar(primera, 0)).rejects.toBeInstanceOf(
      ErrorConflictoPersistenciaSesionCronometro,
    );
    const segunda = crearSesion("sesion-2", "bloque-2", "iniciar-2");
    await expect(repositorio.guardar(segunda, 0)).rejects.toBeInstanceOf(
      ErrorConflictoPersistenciaSesionCronometro,
    );
    await expect(repositorio.obtenerAbierta()).resolves.toMatchObject({
      id: "sesion-1",
    });
    await repositorio.cerrar?.();
  });
});

describe("recuperación durable del cronómetro", () => {
  it("reconstruye una sesión activa desde una composición nueva", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const configuracion = {
      fabricaIndexedDB,
      nombreBaseDatos: "cronometro-recarga",
    };
    const primeraComposicion = new RepositorioSesionesCronometroIndexedDB(
      configuracion,
    );
    await primeraComposicion.guardar(
      crearSesion("sesion-1", "bloque-1", "iniciar-1"),
      0,
    );
    await primeraComposicion.cerrar();

    const segundaComposicion = new RepositorioSesionesCronometroIndexedDB(
      configuracion,
    );
    const recuperada = await segundaComposicion.obtenerAbierta();

    expect(recuperada).toMatchObject({
      id: "sesion-1",
      estado: "ACTIVA",
    });
    expect(
      recuperada?.duracionMilisegundos(new Date("2026-07-20T10:25:00.000Z")),
    ).toBe(25 * 60 * 1000);
    await segundaComposicion.cerrar();
  });
});

function crearSesion(
  id: string,
  bloqueId: string,
  operacionId: string,
): SesionCronometro {
  return SesionCronometro.iniciar({
    id,
    bloqueId,
    operacionId,
    iniciadaEn: inicio,
  });
}
