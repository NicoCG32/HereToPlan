import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PanelBilletera } from "../src/presentacion/puntos/PanelBilletera";
import type { ServiciosPuntos } from "../src/presentacion/puntos/ServiciosPuntos";

afterEach(cleanup);

describe("panel de billetera", () => {
  it("explica el saldo vacío sin inventar movimientos", async () => {
    render(
      <PanelBilletera
        servicios={crearServicios({ saldo: 0, movimientos: [] })}
        revision={0}
      />,
    );

    await screen.findByText(/Aún no hay movimientos/);
    expect(screen.getByLabelText("0 puntos disponibles").textContent).toContain(
      "0",
    );
    expect(
      screen.queryByRole("list", { name: "Movimientos de puntos" }),
    ).toBeNull();
  });

  it("distingue ingresos y gastos e identifica cada fuente", async () => {
    render(
      <PanelBilletera
        servicios={crearServicios({
          saldo: 2,
          movimientos: [
            {
              id: "gasto-1",
              tipo: "GASTO",
              cantidad: 1,
              variacion: -1,
              fuente: { tipo: "CANJE_RECOMPENSA", id: "canje-1" },
              descripcion: "Canje de recompensa: Día libre",
              ocurridaEn: "2026-07-21T10:00:00.000Z",
            },
            {
              id: "ingreso-1",
              tipo: "INGRESO",
              cantidad: 3,
              variacion: 3,
              fuente: {
                tipo: "COMPROMISO_COMPLETADO",
                id: "bloque-1",
              },
              descripcion: "Cumplimiento del bloque Estudiar",
              ocurridaEn: "2026-07-20T10:00:00.000Z",
            },
          ],
        })}
        revision={0}
      />,
    );

    const lista = await screen.findByRole("list", {
      name: "Movimientos de puntos",
    });
    expect(lista.textContent).toContain("Canje de recompensa");
    expect(lista.textContent).toContain("Fuente: canje-1");
    expect(lista.textContent).toContain("-1");
    expect(lista.textContent).toContain("Bloque completado");
    expect(lista.textContent).toContain("Fuente: bloque-1");
    expect(lista.textContent).toContain("+3");
  });

  it("muestra un error comprensible y permite reintentar", async () => {
    const usuario = userEvent.setup();
    let intentos = 0;
    const servicios: ServiciosPuntos = {
      consultarBilletera: {
        ejecutar: () => {
          intentos += 1;
          return intentos === 1
            ? Promise.reject(
                new Error("Almacenamiento temporalmente inaccesible."),
              )
            : Promise.resolve({ saldo: 0, movimientos: [] });
        },
      },
    };
    render(<PanelBilletera servicios={servicios} revision={0} />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No fue posible reconstruir el saldo",
    );
    await usuario.click(
      screen.getByRole("button", { name: "Reintentar billetera" }),
    );

    expect(await screen.findByText(/Aún no hay movimientos/)).toBeTruthy();
    expect(intentos).toBe(2);
  });
});

function crearServicios(
  billetera: Awaited<
    ReturnType<ServiciosPuntos["consultarBilletera"]["ejecutar"]>
  >,
): ServiciosPuntos {
  return {
    consultarBilletera: {
      ejecutar: () => Promise.resolve(billetera),
    },
  };
}
