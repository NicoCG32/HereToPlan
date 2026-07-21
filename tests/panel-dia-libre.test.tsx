import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PanelDiaLibre } from "../src/presentacion/recompensas/PanelDiaLibre";
import type { ServiciosRecompensas } from "../src/presentacion/recompensas/ServiciosRecompensas";
import { comprobarAccesibilidad } from "./comprobarAccesibilidad";

afterEach(cleanup);

describe("panel de Día libre", () => {
  it("permite recuperar el historial y explica por qué un canje no está disponible", async () => {
    const usuario = userEvent.setup();
    const listar = vi
      .fn()
      .mockRejectedValueOnce(new Error("Lectura temporalmente fallida."))
      .mockResolvedValueOnce([]);
    const servicios: ServiciosRecompensas = {
      prepararDiaLibre: {
        ejecutar: vi.fn().mockResolvedValue({
          fechaObjetivo: "2026-07-22",
          recompensa: {
            id: "dia-libre",
            nombre: "Día libre",
            descripcion: "Flexibilidad planificada",
          },
          costoPuntos: 3,
          saldoActual: 1,
          saldoPosterior: -2,
          saldoSuficiente: false,
          puedeCanjear: false,
          afectados: [],
          protegidos: [],
        }),
      },
      canjearDiaLibre: { ejecutar: vi.fn() },
      listarCanjes: { ejecutar: listar },
      generarOperacionId: () => "canje-1",
    };

    render(<PanelDiaLibre servicios={servicios} />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Lectura temporalmente fallida",
    );
    await usuario.click(
      screen.getByRole("button", { name: "Reintentar historial de canjes" }),
    );
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());

    await usuario.type(screen.getByLabelText("Fecha futura"), "2026-07-22");
    await usuario.click(
      screen.getByRole("button", { name: "Ver efecto completo" }),
    );
    const canjear = await screen.findByRole("button", {
      name: "Canjear Día libre",
    });
    expect(canjear).toHaveProperty("disabled", true);
    expect(
      document.getElementById(canjear.getAttribute("aria-describedby")!)
        ?.textContent,
    ).toContain("saldo actual no cubre");
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it("previsualiza, confirma y enlaza el resultado con su historial", async () => {
    const usuario = userEvent.setup();
    const resultado = {
      id: "canje-1",
      recompensaId: "dia-libre",
      fechaObjetivo: "2026-07-21",
      canjeadoEn: "2026-07-20T10:00:00.000Z",
      puntosGastados: 3,
      movimientoId: "gasto-1",
      bloquesAfectados: [
        {
          id: "bloque-1",
          titulo: "Estudiar",
          contextoId: "contexto-1",
          contextoNombre: "Semestre",
        },
      ],
      contextosAfectados: [{ id: "contexto-1", nombre: "Semestre" }],
      reintentoIdempotente: false,
    } as const;
    const preparar = vi.fn().mockResolvedValue({
      fechaObjetivo: "2026-07-21",
      recompensa: {
        id: "dia-libre",
        nombre: "Día libre",
        descripcion: "Flexibilidad planificada",
      },
      costoPuntos: 3,
      saldoActual: 5,
      saldoPosterior: 2,
      saldoSuficiente: true,
      puedeCanjear: true,
      afectados: resultado.bloquesAfectados,
      protegidos: [
        {
          id: "bloque-2",
          titulo: "Entrega",
          contextoId: "contexto-1",
          contextoNombre: "Semestre",
          motivo: "COMPROMISO_ESTRICTO",
        },
      ],
    });
    const canjear = vi.fn().mockResolvedValue(resultado);
    const listar = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([resultado]);
    const onCanjeConfirmado = vi.fn();
    const servicios: ServiciosRecompensas = {
      prepararDiaLibre: { ejecutar: preparar },
      canjearDiaLibre: { ejecutar: canjear },
      listarCanjes: { ejecutar: listar },
      generarOperacionId: () => "canje-1",
    };
    render(
      <PanelDiaLibre
        servicios={servicios}
        onCanjeConfirmado={onCanjeConfirmado}
      />,
    );

    await usuario.type(screen.getByLabelText("Fecha futura"), "2026-07-21");
    await usuario.click(
      screen.getByRole("button", { name: "Ver efecto completo" }),
    );

    const vista = await screen.findByRole("heading", {
      name: "Vista previa del canje",
    });
    expect(vista.parentElement?.textContent).toContain("Saldo posterior2");
    expect(vista.parentElement?.textContent).toContain("Estudiar");
    expect(vista.parentElement?.textContent).toContain("Compromiso estricto");
    await usuario.click(
      screen.getByRole("button", { name: "Canjear Día libre" }),
    );

    const dialogo = screen.getByRole("dialog", {
      name: "Canjear Día libre",
    });
    expect(dialogo.textContent).toContain("3 puntos");
    expect(document.activeElement).toBe(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );
    await comprobarAccesibilidad();
    await usuario.click(
      within(dialogo).getByRole("button", { name: "Confirmar canje" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Canje confirmado" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Canje confirmado" }),
    );
    expect(screen.getByRole("link", { name: "Ver canje" })).toHaveProperty(
      "hash",
      "#canje-canje-1",
    );
    expect(screen.getByRole("link", { name: "Ver movimiento" })).toHaveProperty(
      "hash",
      "#movimiento-gasto-1",
    );
    expect(screen.getByText(/Día libre · 2026-07-21/)).toBeTruthy();
    expect(onCanjeConfirmado).toHaveBeenCalledOnce();
  });
});
