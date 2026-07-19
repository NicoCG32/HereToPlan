import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
});

function crearCorteActivo(
  milisegundosRestantes: number,
): CortePlanificacionDto {
  return Object.freeze({
    id: "corte-1",
    estado: "EN_GRACIA",
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
