import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "../src/app/App";
import {
  inicializarAplicacion,
  obtenerServiciosCalendario,
} from "../src/app/configurarAplicacion";

afterEach(() => {
  cleanup();
  globalThis.location.hash = "";
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("abre una solicitud una vez y recarga sin repetirla tras cancelar o guardar", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-21T12:00:00"));
  vi.stubGlobal("indexedDB", new IDBFactory());
  await inicializarAplicacion();
  const servicios = obtenerServiciosCalendario();
  const resultado = await servicios.crearActividad.ejecutar({
    tipo: "TAREA_SIMPLE",
    titulo: "Preparar entrega",
    tiempoNecesarioMinutos: 30,
    modoSeguimiento: "MANUAL",
  });
  if (!resultado.exito) throw new Error(resultado.error.mensaje);
  const solicitud = `#/calendario?actividad=${resultado.actividad.id}&fecha=2026-10-21&origen=crear`;
  const usuario = userEvent.setup();
  globalThis.location.hash = solicitud;
  const primera = render(<App serviciosCalendario={servicios} />);

  await screen.findByRole("dialog", { name: "Planificar 2026-10-21" });
  expect(screen.getByRole("combobox", { name: "Actividad" })).toHaveProperty(
    "value",
    resultado.actividad.id,
  );
  expect(screen.getByLabelText("Fecha", { exact: true })).toHaveProperty(
    "value",
    "2026-10-21",
  );
  await waitFor(() =>
    expect(globalThis.location.hash).toBe("#/calendario?origen=crear"),
  );
  await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
  primera.unmount();

  const trasCancelar = render(<App serviciosCalendario={servicios} />);
  await screen.findByRole("heading", { name: "Calendario general" });
  expect(screen.queryByRole("dialog")).toBeNull();
  trasCancelar.unmount();

  globalThis.location.hash = solicitud;
  const segunda = render(<App serviciosCalendario={servicios} />);
  await screen.findByRole("dialog", { name: "Planificar 2026-10-21" });
  await usuario.click(screen.getByRole("button", { name: "Agregar bloque" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  segunda.unmount();

  render(<App serviciosCalendario={servicios} />);
  await screen.findByRole("button", { name: "Editar Preparar entrega" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(globalThis.location.hash).toBe("#/calendario?origen=crear");
  const calendario = await servicios.consultarCalendario.ejecutar({
    seleccion: { tipo: "TODAS" },
    vistaTemporal: "MES",
    fechaAncla: "2026-10-21",
  });
  expect(calendario.resumenSeleccion.cantidadBloques).toBe(1);
}, 20_000);
