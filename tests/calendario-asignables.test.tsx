import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CalendarioDto,
  VistaPreviaAplicacionDiaLibreDto,
} from "../src/aplicacion";
import { PantallaCalendario } from "../src/presentacion/calendario/PantallaCalendario";
import type { ServiciosCalendario } from "../src/presentacion/calendario/ServiciosCalendario";
import { comprobarAccesibilidad } from "./comprobarAccesibilidad";

afterEach(cleanup);

describe("asignables del calendario", () => {
  it("distingue actividades, muestra sólo inventario disponible y abre cada comando", async () => {
    const usuario = userEvent.setup();
    const entorno = crearServicios();
    render(<PantallaCalendario servicios={entorno.servicios} />);

    await screen.findByRole("heading", {
      name: "Actividades e inventario",
    });
    expect(
      screen.getByRole("heading", { name: "Sin programar", level: 4 }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Ya asignadas", level: 4 }),
    ).toBeTruthy();
    expect(screen.getByText("Unidad disponible")).toBeTruthy();
    expect(screen.queryByText("Unidad consumida")).toBeNull();

    await usuario.click(
      screen.getByRole("button", { name: "Asignar Leer paper" }),
    );
    expect(
      screen.getByRole("heading", { name: "Planificar 2026-07-21" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Actividad")).toHaveProperty(
      "value",
      "actividad-libre",
    );
    expect(entorno.asignarActividad).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    const botonAplicar = screen.getByRole("button", {
      name: "Aplicar Día libre",
    });
    await usuario.click(botonAplicar);
    const dialogo = await screen.findByRole("dialog", {
      name: "Aplicar Día libre",
    });
    expect(dialogo.textContent).toContain("Vista previa obligatoria");
    expect(entorno.preparar).toHaveBeenCalledWith({
      recompensaAdquiridaId: "unidad-disponible",
      fechaObjetivo: "2026-07-21",
    });
    expect(entorno.aplicar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );
    await comprobarAccesibilidad();
    await usuario.click(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );
    expect(entorno.aplicar).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Aplicar Día libre" }),
      ),
    );

    await usuario.click(
      screen.getByRole("button", { name: "Aplicar Día libre" }),
    );
    await usuario.click(
      await screen.findByRole("button", { name: "Confirmar aplicación" }),
    );
    await waitFor(() => expect(entorno.aplicar).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Día libre fue aplicada/)).toBeTruthy();
  });

  it("al soltar abre editor o vista previa sin guardar ni consumir", async () => {
    const usuario = userEvent.setup();
    const entorno = crearServicios();
    render(<PantallaCalendario servicios={entorno.servicios} />);
    await screen.findByRole("heading", {
      name: "Actividades e inventario",
    });
    const destino = screen
      .getByRole("button", { name: "Seleccionar día 2026-07-22" })
      .closest("article")!;

    const actividad = screen
      .getByRole("button", { name: "Asignar Leer paper" })
      .closest("li")!;
    fireEvent.dragStart(actividad);
    fireEvent.dragOver(destino);
    fireEvent.drop(destino);
    expect(
      screen.getByRole("heading", { name: "Planificar 2026-07-22" }),
    ).toBeTruthy();
    expect(entorno.asignarActividad).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    const recompensa = screen
      .getByRole("button", { name: "Aplicar Día libre" })
      .closest("li")!;
    fireEvent.dragStart(recompensa);
    fireEvent.dragOver(destino);
    fireEvent.drop(destino);
    expect(
      await screen.findByRole("dialog", { name: "Aplicar Día libre" }),
    ).toBeTruthy();
    expect(entorno.preparar).toHaveBeenLastCalledWith({
      recompensaAdquiridaId: "unidad-disponible",
      fechaObjetivo: "2026-07-22",
    });
    expect(entorno.aplicar).not.toHaveBeenCalled();
  });
});

function crearServicios() {
  const asignarActividad = vi.fn();
  const preparar = vi.fn((comando: { fechaObjetivo: string }) =>
    Promise.resolve(crearVistaPrevia(comando.fechaObjetivo)),
  );
  const aplicar = vi.fn(() =>
    Promise.resolve({
      id: "aplicacion-1",
      recompensaAdquiridaId: "unidad-disponible",
      recompensaId: "dia-libre",
      nombre: "Día libre",
      fechaObjetivo: "2026-07-21",
      aplicadaEn: "2026-07-20T10:00:00.000Z",
      bloquesAfectados: [
        {
          id: "bloque-1",
          titulo: "Trabajo flexible",
          contextoId: "contexto-libre",
          contextoNombre: "Libre",
        },
      ],
      contextosAfectados: [{ id: "contexto-libre", nombre: "Libre" }],
      reintentoIdempotente: false,
    }),
  );
  const servicios = {
    consultarCalendario: { ejecutar: () => Promise.resolve(crearCalendario()) },
    sincronizarCortes: { ejecutar: () => Promise.resolve([]) },
    corregirCorte: { ejecutar: vi.fn() },
    consultarInventarioRecompensas: {
      ejecutar: () =>
        Promise.resolve({
          disponibles: [
            {
              id: "unidad-disponible",
              recompensaId: "dia-libre",
              nombre: "Día libre",
              puntosGastados: 3,
              adquiridaEn: "2026-07-20T09:00:00.000Z",
              estado: "DISPONIBLE" as const,
            },
          ],
          consumidas: [
            {
              id: "unidad-consumida",
              recompensaId: "dia-libre",
              nombre: "Unidad consumida",
              puntosGastados: 3,
              adquiridaEn: "2026-07-19T09:00:00.000Z",
              estado: "CONSUMIDA" as const,
              aplicacionId: "aplicacion-vieja",
              consumidaEn: "2026-07-19T10:00:00.000Z",
            },
          ],
          aplicaciones: [],
        }),
    },
    prepararAplicacionDiaLibre: { ejecutar: preparar },
    aplicarDiaLibre: { ejecutar: aplicar },
    asignarActividad: { ejecutar: asignarActividad },
    editarBloque: { ejecutar: vi.fn() },
    generarOperacionId: () => "aplicacion-1",
  } as unknown as ServiciosCalendario;
  return { servicios, asignarActividad, preparar, aplicar };
}

function crearCalendario(): CalendarioDto {
  const sinProgramar = {
    id: "actividad-libre",
    tipo: "TAREA_SIMPLE" as const,
    titulo: "Leer paper",
    creadaEn: "2026-07-20T08:00:00.000Z",
    tiempoNecesarioMinutos: 30,
    subtareasIds: [],
    estado: "PENDIENTE" as const,
  };
  const asignada = {
    id: "actividad-asignada",
    tipo: "PROYECTO" as const,
    titulo: "Proyecto editorial",
    creadaEn: "2026-07-19T08:00:00.000Z",
    tiempoNecesarioMinutos: 60,
    subtareasIds: [],
    estado: "PENDIENTE" as const,
  };
  const fechas = ["2026-07-20", "2026-07-21", "2026-07-22"];
  return {
    seleccion: { tipo: "TODAS", nombre: "Todas" },
    vistaTemporal: "MES",
    rangoVisible: { fechaInicio: fechas[0]!, fechaFin: fechas[2]! },
    hoy: fechas[0]!,
    contextos: [
      {
        id: "contexto-libre",
        nombre: "Libre",
        tipo: "LIBRE",
        creadaEn: "2026-07-20T08:00:00.000Z",
        eliminable: false,
      },
    ],
    actividadesAsignables: [sinProgramar, asignada],
    actividadesSinProgramar: [sinProgramar],
    bloquesVisibles: [],
    proximosSieteDias: fechas.map((fecha, indice) => ({
      fecha,
      esHoy: indice === 0,
      bloques: [],
      minutosPlanificados: 0,
    })),
    listaEquivalente: [],
    resumenSeleccion: { cantidadBloques: 0, minutosPlanificados: 0 },
  };
}

function crearVistaPrevia(
  fechaObjetivo: string,
): VistaPreviaAplicacionDiaLibreDto {
  return {
    unidad: {
      id: "unidad-disponible",
      recompensaId: "dia-libre",
      nombre: "Día libre",
      adquiridaEn: "2026-07-20T09:00:00.000Z",
    },
    fechaObjetivo,
    puedeAplicar: true,
    afectados: [
      {
        id: "bloque-1",
        titulo: "Trabajo flexible",
        contextoId: "contexto-libre",
        contextoNombre: "Libre",
      },
    ],
    protegidos: [],
  };
}
