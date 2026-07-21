import { describe, expect, it } from "vitest";
import {
  CasoDeUsoActualizarPerfilUsuario,
  CasoDeUsoConsultarPerfilUsuario,
  CasoDeUsoCrearPerfilUsuario,
} from "../src/aplicacion";
import { PerfilUsuario } from "../src/dominio";
import { RepositorioPerfilUsuarioEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioPerfilUsuarioEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";
import { esperarErrorDominio } from "./esperarErrorDominio";

describe("perfil local", () => {
  it("normaliza un nombre Unicode y protege las fechas internas", () => {
    const creadoEn = new Date("2026-07-21T10:00:00.000Z");
    const perfil = PerfilUsuario.crear({
      id: "perfil-1",
      nombreVisible: "  Nicolás 🧭  ",
      creadoEn,
    });

    creadoEn.setUTCFullYear(2030);
    const fechaExpuesta = perfil.creadoEn;
    fechaExpuesta.setUTCFullYear(2031);

    expect(perfil.nombreVisible).toBe("Nicolás 🧭");
    expect(perfil.creadoEn.toISOString()).toBe("2026-07-21T10:00:00.000Z");
    expect(perfil.actualizadoEn.toISOString()).toBe("2026-07-21T10:00:00.000Z");
  });

  it.each([
    ["   ", "NOMBRE_PERFIL_VACIO"],
    ["x".repeat(61), "NOMBRE_PERFIL_DEMASIADO_LARGO"],
  ])("rechaza un nombre inválido", (nombre, codigo) => {
    esperarErrorDominio(codigo, () =>
      PerfilUsuario.crear({
        id: "perfil-1",
        nombreVisible: nombre,
        creadoEn: new Date("2026-07-21T10:00:00.000Z"),
      }),
    );
  });

  it("impide una actualización anterior a la creación", () => {
    esperarErrorDominio("CRONOLOGIA_PERFIL_INVALIDA", () =>
      PerfilUsuario.rehidratar({
        id: "perfil-1",
        nombreVisible: "Nicolás",
        creadoEn: new Date("2026-07-21T10:00:00.000Z"),
        actualizadoEn: new Date("2026-07-20T10:00:00.000Z"),
      }),
    );
  });

  it("crea, consulta y actualiza un único perfil conservando su identidad", async () => {
    const repositorio = new RepositorioPerfilUsuarioEnMemoria();
    const reloj = new RelojFijo(new Date("2026-07-21T10:00:00.000Z"));
    const crear = new CasoDeUsoCrearPerfilUsuario(
      repositorio,
      reloj,
      new GeneradorIdentificadoresPredefinidos(["perfil-local"]),
    );
    const consultar = new CasoDeUsoConsultarPerfilUsuario(repositorio);
    const actualizar = new CasoDeUsoActualizarPerfilUsuario(repositorio, reloj);

    await expect(consultar.ejecutar()).resolves.toBeUndefined();
    await expect(crear.ejecutar("Nicolás")).resolves.toMatchObject({
      exito: true,
      perfil: { id: "perfil-local", nombreVisible: "Nicolás" },
    });
    reloj.establecer(new Date("2026-07-21T12:00:00.000Z"));
    await expect(actualizar.ejecutar("Nico")).resolves.toMatchObject({
      exito: true,
      perfil: {
        id: "perfil-local",
        nombreVisible: "Nico",
        creadoEn: "2026-07-21T10:00:00.000Z",
        actualizadoEn: "2026-07-21T12:00:00.000Z",
      },
    });
    await expect(consultar.ejecutar()).resolves.toMatchObject({
      id: "perfil-local",
      nombreVisible: "Nico",
    });
  });

  it("devuelve errores de aplicación para nombre inválido, duplicado y ausencia", async () => {
    const repositorio = new RepositorioPerfilUsuarioEnMemoria();
    const reloj = new RelojFijo(new Date("2026-07-21T10:00:00.000Z"));
    const crear = new CasoDeUsoCrearPerfilUsuario(
      repositorio,
      reloj,
      new GeneradorIdentificadoresPredefinidos([
        "perfil-1",
        "perfil-2",
        "perfil-3",
      ]),
    );

    await expect(crear.ejecutar(" ")).resolves.toMatchObject({
      exito: false,
      error: { codigo: "NOMBRE_PERFIL_VACIO", campo: "nombreVisible" },
    });
    await crear.ejecutar("Nicolás");
    await expect(crear.ejecutar("Otro")).resolves.toMatchObject({
      exito: false,
      error: { codigo: "PERFIL_YA_EXISTE" },
    });
    await expect(
      new CasoDeUsoActualizarPerfilUsuario(
        new RepositorioPerfilUsuarioEnMemoria(),
        reloj,
      ).ejecutar("Nadie"),
    ).resolves.toMatchObject({
      exito: false,
      error: { codigo: "PERFIL_NO_EXISTE" },
    });
  });
});
