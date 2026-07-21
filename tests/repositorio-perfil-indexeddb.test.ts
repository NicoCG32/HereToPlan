import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { PerfilUsuario } from "../src/dominio";
import { RepositorioPerfilUsuarioIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioPerfilUsuarioIndexedDB";

describe("RepositorioPerfilUsuarioIndexedDB", () => {
  it("persiste un perfil único entre conexiones y permite actualizarlo", async () => {
    const fabricaIndexedDB = new IDBFactory();
    const primero = crearRepositorio(fabricaIndexedDB);
    const perfil = PerfilUsuario.crear({
      id: "perfil-local",
      nombreVisible: "Nicolás",
      creadoEn: new Date("2026-07-21T10:00:00.000Z"),
    });

    await primero.guardarNuevo(perfil);
    await expect(primero.guardarNuevo(perfil)).rejects.toMatchObject({
      codigo: "PERFIL_YA_EXISTE",
    });
    await primero.cerrar();

    const trasRecarga = crearRepositorio(fabricaIndexedDB);
    await expect(trasRecarga.obtener()).resolves.toMatchObject({
      id: "perfil-local",
      nombreVisible: "Nicolás",
    });
    await trasRecarga.actualizar(
      perfil.actualizarNombre("Nico", new Date("2026-07-21T12:00:00.000Z")),
    );
    await expect(trasRecarga.obtener()).resolves.toMatchObject({
      nombreVisible: "Nico",
    });
  });

  it("rechaza actualizar un perfil ausente", async () => {
    const repositorio = crearRepositorio(new IDBFactory());
    const perfil = PerfilUsuario.crear({
      id: "inexistente",
      nombreVisible: "Nadie",
      creadoEn: new Date("2026-07-21T10:00:00.000Z"),
    });

    await expect(repositorio.actualizar(perfil)).rejects.toMatchObject({
      codigo: "PERFIL_NO_EXISTE",
    });
  });
});

function crearRepositorio(
  fabricaIndexedDB: IDBFactory,
): RepositorioPerfilUsuarioIndexedDB {
  return new RepositorioPerfilUsuarioIndexedDB({
    fabricaIndexedDB,
    nombreBaseDatos: "here-to-plan-perfil-pruebas",
  });
}
