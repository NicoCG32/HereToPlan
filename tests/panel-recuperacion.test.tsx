import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BancoRecuperacionDto } from "../src/aplicacion";
import { PanelRecuperacion } from "../src/presentacion/recuperacion/PanelRecuperacion";
import type { ServiciosRecuperacion } from "../src/presentacion/recuperacion/ServiciosRecuperacion";

describe("PanelRecuperacion", () => {
  it("acredita excedente, consume saldo y comunica ambos resultados", async () => {
    let banco = crearBanco();
    const consultar = vi.fn(() => Promise.resolve(banco));
    const acreditar = vi.fn(() => {
      banco = { ...banco, saldoMinutos: 50, acreditables: [] };
      return Promise.resolve({
        movimiento: crearMovimiento("ACREDITACION", 50),
        reintentoIdempotente: false,
      });
    });
    const consumir = vi.fn(() => {
      banco = {
        ...banco,
        saldoMinutos: 20,
        reducibles: [],
        movimientos: [crearMovimiento("CONSUMO", 30)],
      };
      return Promise.resolve({
        movimiento: crearMovimiento("CONSUMO", 30),
        reintentoIdempotente: false,
      });
    });
    const servicios = {
      consultarBanco: { ejecutar: consultar },
      acreditar: { ejecutar: acreditar },
      consumir: { ejecutar: consumir },
      generarOperacionId: () => "operacion-ui",
    } as unknown as ServiciosRecuperacion;

    render(<PanelRecuperacion servicios={servicios} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Acreditar 50 min" }),
    );
    expect(
      await screen.findByText("Se acreditaron 50 minutos de recuperación."),
    ).toBeDefined();

    fireEvent.change(screen.getByLabelText("Minutos a reducir"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Usar recuperación" }));
    expect(
      await screen.findByText("Se redujo la carga futura en 30 minutos."),
    ).toBeDefined();
    await waitFor(() => expect(consultar).toHaveBeenCalledTimes(3));
    expect(acreditar).toHaveBeenCalledWith({
      bloqueId: "fuente",
      operacionId: "operacion-ui",
    });
    expect(consumir).toHaveBeenCalledWith({
      bloqueId: "destino",
      minutos: 30,
      operacionId: "operacion-ui",
    });
  });
});

function crearBanco(): BancoRecuperacionDto {
  return {
    saldoMinutos: 0,
    configuracion: {
      numeradorTasa: 1,
      denominadorTasa: 2,
      maximoDiarioMinutos: 120,
      maximoSemanalMinutos: 300,
    },
    acreditables: [
      {
        bloqueId: "fuente",
        titulo: "Informe",
        fecha: "2026-07-20",
        minutosPlanificados: 60,
        minutosCronometrados: 160,
        minutosExcedentes: 100,
        minutosAcreditables: 50,
      },
    ],
    reducibles: [
      {
        bloqueId: "destino",
        titulo: "Lectura",
        fecha: "2026-07-22",
        minutosPlanificados: 45,
        maximoReducible: 44,
      },
    ],
    movimientos: [],
  };
}

function crearMovimiento(tipo: "ACREDITACION" | "CONSUMO", minutos: number) {
  return {
    id: `movimiento-${tipo}`,
    operacionId: "operacion-ui",
    tipo,
    minutos,
    bloqueFuenteId: tipo === "ACREDITACION" ? "fuente" : "destino",
    fechaFuente: "2026-07-20",
    descripcion: "Movimiento de prueba",
    ocurridoEn: "2026-07-20T13:00:00.000Z",
  };
}
