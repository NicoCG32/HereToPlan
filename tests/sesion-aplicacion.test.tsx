import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CasoDeUsoActualizarPerfilUsuario,
  CasoDeUsoConsultarPerfilUsuario,
  CasoDeUsoCrearPerfilUsuario,
} from "../src/aplicacion";
import { RepositorioPerfilUsuarioEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioPerfilUsuarioEnMemoria";
import { HudAplicacion } from "../src/presentacion/sesion/HudAplicacion";
import { ProveedorSesionAplicacion } from "../src/presentacion/sesion/SesionAplicacion";
import type { ServiciosPerfil } from "../src/presentacion/perfil/ServiciosPerfil";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";
import { comprobarAccesibilidad } from "./comprobarAccesibilidad";

afterEach(cleanup);

describe("sesión local y HUD", () => {
  it("solicita el nombre al iniciar, explica el alcance local y proyecta el saldo", async () => {
    const usuario = userEvent.setup();
    const serviciosPerfil = crearServiciosPerfil();
    const selector = vi.fn(
      () => "Un plan claro convierte la intención en avance.",
    );
    render(
      <ProveedorSesionAplicacion
        serviciosPerfil={serviciosPerfil}
        serviciosPuntos={{
          consultarBilletera: {
            ejecutar: vi.fn().mockResolvedValue({ saldo: 42, movimientos: [] }),
          },
        }}
        selectorFrase={selector}
      >
        <HudAplicacion />
      </ProveedorSesionAplicacion>,
    );

    expect(
      await screen.findByRole("heading", { name: "Antes de comenzar" }),
    ).toBeTruthy();
    expect(screen.getByText(/únicamente en este dispositivo/i)).toBeTruthy();
    await comprobarAccesibilidad();

    await usuario.type(
      screen.getByRole("textbox", { name: "Nombre visible" }),
      "  Nicolás 🧭  ",
    );
    await usuario.click(screen.getByRole("button", { name: "Comenzar" }));

    expect(await screen.findByText("Nicolás 🧭")).toBeTruthy();
    expect(
      screen.getByRole("status", { name: "42 puntos disponibles" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Un plan claro convierte la intención en avance."),
    ).toBeTruthy();
    expect(selector).toHaveBeenCalledTimes(1);
  });

  it("cancela sin escribir, guarda mediante el caso de uso y devuelve el foco", async () => {
    const usuario = userEvent.setup();
    const serviciosPerfil = crearServiciosPerfil();
    await serviciosPerfil.crear.ejecutar("Nicolás");
    const actualizar = vi.spyOn(serviciosPerfil.actualizar, "ejecutar");
    render(
      <ProveedorSesionAplicacion serviciosPerfil={serviciosPerfil}>
        <HudAplicacion />
      </ProveedorSesionAplicacion>,
    );
    const editar = await screen.findByRole("button", { name: "Editar perfil" });

    await usuario.click(editar);
    expect(
      screen.getByRole("heading", { name: "Editar nombre visible" }),
    ).toBeTruthy();
    await usuario.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(editar));
    expect(actualizar).not.toHaveBeenCalled();

    await usuario.click(editar);
    const nombre = screen.getByRole("textbox", { name: "Nombre visible" });
    await usuario.clear(nombre);
    await usuario.type(nombre, "Nico");
    await usuario.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    expect(await screen.findByText("Nico")).toBeTruthy();
    expect(actualizar).toHaveBeenCalledWith("Nico");
    await waitFor(() => expect(document.activeElement).toBe(editar));
  });
});

function crearServiciosPerfil(): ServiciosPerfil {
  const repositorio = new RepositorioPerfilUsuarioEnMemoria();
  const reloj = new RelojFijo(new Date("2026-07-21T10:00:00.000Z"));
  return {
    consultar: new CasoDeUsoConsultarPerfilUsuario(repositorio),
    crear: new CasoDeUsoCrearPerfilUsuario(
      repositorio,
      reloj,
      new GeneradorIdentificadoresPredefinidos(["perfil-local"]),
    ),
    actualizar: new CasoDeUsoActualizarPerfilUsuario(repositorio, reloj),
  };
}
