import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HashRouter } from "react-router-dom";
import { RutasAplicacion } from "../src/app/rutas/RutasAplicacion";
import { ArmazonAplicacion } from "../src/presentacion/armazon/ArmazonAplicacion";

beforeEach(() => {
  globalThis.location.hash = "";
});

afterEach(() => {
  cleanup();
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
