import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  CasoDeUsoCrearAgendaBorrador,
  CasoDeUsoGuardarBloquesAgendaBorrador,
  CasoDeUsoListarAgendasBorrador,
} from "../src/aplicacion";
import { App } from "../src/app/App";
import { RepositorioAgendasEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioAgendasEnMemoria";
import type { ServiciosAgendaBorrador } from "../src/presentacion/agendas/ServiciosAgendaBorrador";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

afterEach(cleanup);

describe("interfaz de agenda borrador", () => {
  it("señala errores junto al campo y conserva los valores corregibles", async () => {
    const usuario = userEvent.setup();
    render(<App servicios={crearServicios()} />);
    await screen.findByRole("heading", {
      name: "Planifica tu próximo horizonte",
    });

    await usuario.type(screen.getByLabelText("Fecha inicial"), "2026-07-20");
    await usuario.type(screen.getByLabelText("Fecha final"), "2026-07-21");
    await usuario.click(screen.getByRole("button", { name: "Crear borrador" }));

    expect(
      await screen.findByText("La agenda debe tener un nombre."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Fecha inicial")).toHaveProperty(
      "value",
      "2026-07-20",
    );
    expect(screen.getByLabelText("Fecha final")).toHaveProperty(
      "value",
      "2026-07-21",
    );
  });

  it("crea, edita, quita y recupera bloques después de volver a montar", async () => {
    const usuario = userEvent.setup();
    const servicios = crearServicios();
    const primeraVista = render(<App servicios={servicios} />);
    await screen.findByRole("heading", {
      name: "Planifica tu próximo horizonte",
    });

    await usuario.type(
      screen.getByLabelText("Nombre de la agenda"),
      "Semana focal",
    );
    await usuario.type(screen.getByLabelText("Fecha inicial"), "2026-07-20");
    await usuario.type(screen.getByLabelText("Fecha final"), "2026-07-21");
    await usuario.click(screen.getByRole("button", { name: "Crear borrador" }));

    await screen.findByRole("heading", { name: "Semana focal" });
    await usuario.type(screen.getByLabelText("Actividad"), "Preparar informe");
    await usuario.type(
      screen.getByLabelText("Fecha", { selector: "input" }),
      "2026-07-20",
    );
    await usuario.clear(screen.getByLabelText("Minutos"));
    await usuario.type(screen.getByLabelText("Minutos"), "45");
    await usuario.click(screen.getByRole("button", { name: "Agregar bloque" }));

    const tarjetaInicial = screen.getByRole("listitem");
    expect(within(tarjetaInicial).getByText("Preparar informe")).toBeTruthy();
    await usuario.click(
      within(tarjetaInicial).getByRole("button", { name: "Editar" }),
    );
    await usuario.clear(screen.getByLabelText("Actividad"));
    await usuario.type(
      screen.getByLabelText("Actividad"),
      "Preparar informe final",
    );
    await usuario.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await usuario.click(
      screen.getByRole("button", { name: "Guardar borrador" }),
    );

    expect(
      await screen.findByText("Borrador guardado correctamente."),
    ).toBeTruthy();
    primeraVista.unmount();
    render(<App servicios={servicios} />);

    expect(await screen.findByText("Preparar informe final")).toBeTruthy();
    const tarjetaRecuperada = screen.getByRole("listitem");
    await usuario.click(
      within(tarjetaRecuperada).getByRole("button", { name: "Quitar" }),
    );
    expect(screen.getByText("Aún no hay bloques en esta agenda.")).toBeTruthy();
    await usuario.click(
      screen.getByRole("button", { name: "Guardar borrador" }),
    );
    expect(
      await screen.findByText("Borrador guardado correctamente."),
    ).toBeTruthy();
  }, 15_000);

  it("permite cancelar la creación y limpia el formulario", async () => {
    const usuario = userEvent.setup();
    render(<App servicios={crearServicios()} />);
    await screen.findByRole("heading", {
      name: "Planifica tu próximo horizonte",
    });

    const nombre = screen.getByLabelText("Nombre de la agenda");
    await usuario.type(nombre, "Agenda temporal");
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(nombre).toHaveProperty("value", "");
  });
});

function crearServicios(): ServiciosAgendaBorrador {
  const repositorio = new RepositorioAgendasEnMemoria();
  const generador = new GeneradorIdentificadoresPredefinidos([
    "agenda-1",
    "bloque-1",
    "actividad-1",
    "bloque-2",
    "actividad-2",
  ]);

  return {
    crearAgenda: new CasoDeUsoCrearAgendaBorrador(
      repositorio,
      new RelojFijo(new Date("2026-07-19T20:00:00.000Z")),
      generador,
    ),
    guardarBloques: new CasoDeUsoGuardarBloquesAgendaBorrador(
      repositorio,
      generador,
    ),
    listarAgendas: new CasoDeUsoListarAgendasBorrador(repositorio),
  };
}
