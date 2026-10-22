import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HashRouter } from "react-router-dom";
import { RutasAplicacion } from "../src/app/rutas/RutasAplicacion";
import { ArmazonAplicacion } from "../src/presentacion/armazon/ArmazonAplicacion";

beforeEach(() => {
  globalThis.location.hash = "";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  globalThis.location.hash = "";
});

describe("navegación principal", () => {
  it("resuelve la entrada y las rutas desconocidas hacia Calendario", async () => {
    globalThis.location.hash = "#/ruta-desconocida";
    render(<AplicacionDePrueba />);

    expect(
      await screen.findByRole("heading", { name: "Calendario" }),
    ).toBeTruthy();
    expect(globalThis.location.hash).toBe("#/calendario");
    expect(document.title).toBe("Calendario · HereToPlan");
  });

  it("expone exactamente cuatro destinos y conserva una sola región principal", async () => {
    const usuario = userEvent.setup();
    render(<AplicacionDePrueba />);

    const navegacion = screen.getByRole("navigation", {
      name: "Navegación principal",
    });
    expect(navegacion.querySelectorAll("a")).toHaveLength(4);
    expect(screen.getAllByRole("main")).toHaveLength(1);

    await usuario.click(screen.getByRole("link", { name: "Crear" }));
    expect(await screen.findByRole("heading", { name: "Crear" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Crear" }).getAttribute("aria-current"),
    ).toBe("page");
    await waitFor(() => expect(document.title).toBe("Crear · HereToPlan"));
  });

  it("contiene el foco en el menú abierto y lo devuelve al cerrar", async () => {
    const usuario = userEvent.setup();
    render(<AplicacionDePrueba />);
    const abrir = screen.getByRole("button", { name: "Abrir navegación" });
    await usuario.click(abrir);
    const menu = screen.getByRole("dialog", { name: "Navegación principal" });
    const cerrar = within(menu).getByRole("button", {
      name: "Cerrar navegación",
    });
    const ultimo = screen.getByRole("link", { name: "Respaldo" });

    expect(document.activeElement).toBe(cerrar);
    await usuario.tab({ shift: true });
    expect(document.activeElement).toBe(ultimo);
    await usuario.tab();
    expect(document.activeElement).toBe(cerrar);
    expect(
      screen.getByRole("main", { hidden: true }).closest("[inert]"),
    ).toBeTruthy();

    await usuario.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(abrir));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("main").closest("[inert]")).toBeNull();
    expect(abrir.getAttribute("aria-expanded")).toBe("false");
  });

  it("libera el contenido al pasar del menú móvil a escritorio", async () => {
    let alCambiar: (() => void) | undefined;
    const consulta = {
      matches: true,
      addEventListener: vi.fn((_tipo: string, oyente: () => void) => {
        alCambiar = oyente;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => consulta),
    );
    const usuario = userEvent.setup();
    render(<AplicacionDePrueba />);
    await usuario.click(
      screen.getByRole("button", { name: "Abrir navegación" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Navegación principal" }),
    ).toBeTruthy();

    consulta.matches = false;
    expect(alCambiar).toBeTypeOf("function");
    act(() => {
      alCambiar?.();
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("main").closest("[inert]")).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("link", { name: "Calendario" }),
      ),
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

function AplicacionDePrueba() {
  return (
    <HashRouter>
      <ArmazonAplicacion>
        <RutasAplicacion
          calendario={<h1>Calendario</h1>}
          crear={<h1>Crear</h1>}
          puntos={<h1>Puntos</h1>}
          respaldo={<h1>Respaldo</h1>}
        />
      </ArmazonAplicacion>
    </HashRouter>
  );
}
