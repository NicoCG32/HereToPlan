import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PanelInventarioRecompensas } from "../src/presentacion/recompensas/PanelInventarioRecompensas";
import type { ServiciosInventarioRecompensas } from "../src/presentacion/recompensas/ServiciosInventarioRecompensas";
import { comprobarAccesibilidad } from "./comprobarAccesibilidad";

afterEach(cleanup);

describe("panel de catálogo e inventario", () => {
  it("explica disponibilidad y adquiere sin aplicar la recompensa", async () => {
    const usuario = userEvent.setup();
    const catalogoInicial = [
      {
        id: "dia-libre",
        nombre: "Día libre",
        descripcion: "Flexibilidad para una fecha futura.",
        costoPuntos: 3,
        tipoEfecto: "DIA_LIBRE",
        saldoActual: 5,
        puedeAdquirir: true,
      },
    ] as const;
    const unidad = {
      id: "unidad-1",
      recompensaId: "dia-libre",
      nombre: "Día libre",
      puntosGastados: 3,
      adquiridaEn: "2026-07-21T12:00:00.000Z",
      estado: "DISPONIBLE" as const,
    };
    const consultarCatalogo = vi
      .fn()
      .mockResolvedValueOnce(catalogoInicial)
      .mockResolvedValueOnce([
        {
          ...catalogoInicial[0],
          saldoActual: 2,
          puedeAdquirir: false,
          motivoNoDisponible: "Necesitas 1 puntos adicionales.",
        },
      ]);
    const consultarInventario = vi
      .fn()
      .mockResolvedValueOnce({
        disponibles: [],
        consumidas: [],
        aplicaciones: [],
      })
      .mockResolvedValueOnce({
        disponibles: [unidad],
        consumidas: [],
        aplicaciones: [],
      });
    const adquirir = vi.fn().mockResolvedValue({
      recompensa: unidad,
      movimientoId: "movimiento-1",
      saldoPosterior: 2,
      reintentoIdempotente: false,
    });
    const onInventarioCambiado = vi.fn();
    const servicios: ServiciosInventarioRecompensas = {
      consultarCatalogo: { ejecutar: consultarCatalogo },
      consultarInventario: { ejecutar: consultarInventario },
      adquirir: { ejecutar: adquirir },
      generarOperacionId: () => "unidad-1",
    };

    render(
      <PanelInventarioRecompensas
        servicios={servicios}
        revision={0}
        onInventarioCambiado={onInventarioCambiado}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Día libre" }),
    ).toBeTruthy();
    expect(screen.getByText(/No tienes recompensas disponibles/)).toBeTruthy();
    const boton = screen.getByRole("button", { name: "Adquirir" });
    await usuario.click(boton);
    const dialogo = screen.getByRole("dialog", {
      name: "Adquirir Día libre",
    });
    expect(dialogo.textContent).toContain(
      "no modificará todavía tu calendario",
    );
    expect(document.activeElement).toBe(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );
    await comprobarAccesibilidad();
    await usuario.click(
      within(dialogo).getByRole("button", {
        name: "Confirmar adquisición",
      }),
    );

    await waitFor(() => expect(onInventarioCambiado).toHaveBeenCalledOnce());
    expect(adquirir).toHaveBeenCalledWith({
      operacionId: "unidad-1",
      recompensaId: "dia-libre",
    });
    expect(screen.getByText("Unidad disponible")).toBeTruthy();
    expect(screen.getByText("Necesitas 1 puntos adicionales.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adquirir" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(document.activeElement).toBe(boton);
  });

  it("permite reintentar una lectura fallida", async () => {
    const usuario = userEvent.setup();
    const consultarCatalogo = vi
      .fn()
      .mockRejectedValueOnce(new Error("Lectura temporalmente fallida."))
      .mockResolvedValueOnce([]);
    const servicios: ServiciosInventarioRecompensas = {
      consultarCatalogo: { ejecutar: consultarCatalogo },
      consultarInventario: {
        ejecutar: vi.fn().mockResolvedValue({
          disponibles: [],
          consumidas: [],
          aplicaciones: [],
        }),
      },
      adquirir: { ejecutar: vi.fn() },
      generarOperacionId: () => "unidad-1",
    };

    render(
      <PanelInventarioRecompensas
        servicios={servicios}
        revision={0}
        onInventarioCambiado={vi.fn()}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Lectura temporalmente fallida",
    );
    await usuario.click(
      screen.getByRole("button", { name: "Reintentar catálogo e inventario" }),
    );
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
