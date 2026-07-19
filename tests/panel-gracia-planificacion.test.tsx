import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CortePlanificacionDto } from "../src/aplicacion";
import { PanelGraciaPlanificacion } from "../src/presentacion/calendario/PanelGraciaPlanificacion";

afterEach(cleanup);

describe("panel de gracia de la planificación", () => {
  it("actualiza la cuenta visual sin convertir cada segundo en un anuncio accesible", async () => {
    const ejecutar = vi
      .fn()
      .mockResolvedValueOnce([crearCorteActivo(60_000)])
      .mockResolvedValue([crearCorteActivo(59_000)]);

    render(
      <PanelGraciaPlanificacion
        sincronizarCortes={{ ejecutar }}
        corregirCorte={{ ejecutar: vi.fn() }}
        intervaloActualizacionMs={10}
      />,
    );

    const primeraCuenta = await screen.findByText("01:00");
    expect(primeraCuenta.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText(/Confirmación automática:/)).toBeTruthy();

    await screen.findByText("00:59");
    expect(screen.queryByRole("status")).toBeNull();
    expect(ejecutar.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("anuncia una sola vez la transición materializada y detiene la cuenta", async () => {
    const ejecutar = vi
      .fn()
      .mockResolvedValueOnce([crearCorteActivo(1_000)])
      .mockResolvedValueOnce([crearCorteConfirmado()]);

    render(
      <PanelGraciaPlanificacion
        sincronizarCortes={{ ejecutar }}
        corregirCorte={{ ejecutar: vi.fn() }}
        intervaloActualizacionMs={10}
      />,
    );

    await screen.findByText("00:01");
    const anuncio = await screen.findByRole("status");
    expect(anuncio.textContent).toBe(
      "Preparar informe quedó confirmado automáticamente.",
    );
    expect(
      screen.queryByRole("heading", { name: "Período de gracia" }),
    ).toBeNull();
    await waitFor(() => expect(ejecutar).toHaveBeenCalledTimes(2));
  });

  it("exige una decisión explícita, permite cancelar y devuelve el corte corregido", async () => {
    const usuario = userEvent.setup();
    const sincronizar = vi.fn().mockResolvedValue([crearCorteActivo(300_000)]);
    const corregir = vi.fn().mockResolvedValue({
      exito: true,
      corte: crearCorteBorrador(),
    });
    const alCorregir = vi.fn();
    render(
      <PanelGraciaPlanificacion
        sincronizarCortes={{ ejecutar: sincronizar }}
        corregirCorte={{ ejecutar: corregir }}
        onCorteCorregido={alCorregir}
      />,
    );

    const abrir = await screen.findByRole("button", {
      name: "Corregir Preparar informe",
    });
    await usuario.click(abrir);
    let dialogo = screen.getByRole("dialog", {
      name: "Volver a editar la planificación",
    });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Mantener planificación" }),
    );

    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(corregir).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(abrir));

    await usuario.click(abrir);
    dialogo = screen.getByRole("dialog", {
      name: "Volver a editar la planificación",
    });
    await usuario.click(
      screen.getByRole("button", { name: "Volver a editar" }),
    );

    await waitFor(() => expect(dialogo.isConnected).toBe(false));
    expect(corregir).toHaveBeenCalledWith({ corteId: "corte-1" });
    expect(alCorregir).toHaveBeenCalledWith(crearCorteBorrador());
    expect(
      screen.queryByRole("heading", { name: "Período de gracia" }),
    ).toBeNull();
  });

  it("cierra la decisión e informa cuando la gracia ya venció", async () => {
    const usuario = userEvent.setup();
    const alRechazar = vi.fn();
    render(
      <PanelGraciaPlanificacion
        sincronizarCortes={{
          ejecutar: vi.fn().mockResolvedValue([crearCorteActivo(1)]),
        }}
        corregirCorte={{
          ejecutar: vi.fn().mockResolvedValue({
            exito: false,
            error: {
              codigo: "CORTE_NO_CORREGIBLE",
              mensaje:
                "El período de gracia terminó y la planificación quedó confirmada.",
              campo: "corteId",
            },
          }),
        }}
        onCorreccionRechazada={alRechazar}
      />,
    );

    await usuario.click(
      await screen.findByRole("button", {
        name: "Corregir Preparar informe",
      }),
    );
    await usuario.click(
      screen.getByRole("button", { name: "Volver a editar" }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(alRechazar).toHaveBeenCalledWith(
      "El período de gracia terminó y la planificación quedó confirmada.",
    );
  });
});

function crearCorteActivo(
  milisegundosRestantes: number,
): CortePlanificacionDto {
  return Object.freeze({
    id: "corte-1",
    estado: "EN_GRACIA",
    bloqueIds: Object.freeze(["bloque-1"]),
    titulosBloques: Object.freeze(["Preparar informe"]),
    cantidadBloques: 1,
    creadoEn: "2026-07-20T09:00:00.000Z",
    asignadaEn: "2026-07-20T10:00:00.000Z",
    confirmarAutomaticamenteEn: "2026-07-20T10:10:00.000Z",
    milisegundosRestantes,
    confirmacionMaterializada: false,
  });
}

function crearCorteConfirmado(): CortePlanificacionDto {
  return Object.freeze({
    ...crearCorteActivo(0),
    estado: "CONFIRMADA",
    confirmadaEn: "2026-07-20T10:10:00.000Z",
    confirmacionMaterializada: true,
  });
}

function crearCorteBorrador(): CortePlanificacionDto {
  return Object.freeze({
    id: "corte-1",
    estado: "BORRADOR",
    bloqueIds: Object.freeze(["bloque-1"]),
    titulosBloques: Object.freeze(["Preparar informe"]),
    cantidadBloques: 1,
    creadoEn: "2026-07-20T09:00:00.000Z",
    confirmacionMaterializada: false,
  });
}
