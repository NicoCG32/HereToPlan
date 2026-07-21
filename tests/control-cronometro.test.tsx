import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ComandoGestionarSesionCronometro,
  EstadoCronometroBloqueDto,
} from "../src/aplicacion";
import { ControlCronometroBloque } from "../src/presentacion/calendario/ControlCronometroBloque";
import type { ServiciosCalendario } from "../src/presentacion/calendario/ServiciosCalendario";

afterEach(cleanup);

describe("control del cronómetro", () => {
  it("permite reintentar cuando no puede recuperar la sesión", async () => {
    const usuario = userEvent.setup();
    const consultar = vi
      .fn()
      .mockRejectedValueOnce(new Error("Sesiones inaccesibles."))
      .mockResolvedValueOnce(crearEstado());
    const servicios = {
      consultarCronometro: { ejecutar: consultar },
      gestionarCronometro: { ejecutar: vi.fn() },
      generarOperacionId: () => "operacion-1",
    } as Pick<
      ServiciosCalendario,
      "consultarCronometro" | "gestionarCronometro" | "generarOperacionId"
    >;

    render(
      <ControlCronometroBloque
        bloqueId="bloque-1"
        titulo="Escribir informe"
        permitirInicio
        servicios={servicios}
        revision={0}
        onCambio={vi.fn()}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Sesiones inaccesibles",
    );
    await usuario.click(
      screen.getByRole("button", { name: "Reintentar cronómetro" }),
    );
    expect(
      await screen.findByRole("button", { name: "Iniciar cronómetro" }),
    ).toBeTruthy();
    expect(consultar).toHaveBeenCalledTimes(2);
  });

  it("ofrece controles por estado sin anunciar cada segundo ni cerrar el bloque", async () => {
    const usuario = userEvent.setup();
    let estado = crearEstado();
    let secuencia = 0;
    const gestionar = vi
      .fn<(comando: ComandoGestionarSesionCronometro) => Promise<unknown>>()
      .mockImplementation((comando) => {
        const sesionAnterior = estado.sesionAbierta;
        const estadoSesion =
          comando.tipo === "INICIAR" || comando.tipo === "REANUDAR"
            ? "ACTIVA"
            : comando.tipo === "PAUSAR"
              ? "PAUSADA"
              : "FINALIZADA";
        const sesion = {
          id: sesionAnterior?.id ?? "sesion-1",
          bloqueId: "bloque-1",
          estado: estadoSesion,
          iniciadaEn: "2026-07-20T10:00:00.000Z",
          ...(estadoSesion === "FINALIZADA"
            ? { finalizadaEn: "2026-07-20T10:30:00.000Z" }
            : {}),
          duracionMilisegundos:
            estadoSesion === "FINALIZADA" ? 30 * 60 * 1000 : 0,
          revision: (sesionAnterior?.revision ?? 0) + 1,
        } as const;
        estado =
          estadoSesion === "FINALIZADA"
            ? {
                bloqueId: estado.bloqueId,
                consultadoEn: estado.consultadoEn,
                sesiones: [sesion],
                duracionTotalMilisegundos: sesion.duracionMilisegundos,
              }
            : {
                ...estado,
                sesionAbierta: sesion,
                duracionTotalMilisegundos: sesion.duracionMilisegundos,
              };
        return Promise.resolve({ sesion, reintentoIdempotente: false });
      });
    const servicios = {
      consultarCronometro: { ejecutar: () => Promise.resolve(estado) },
      gestionarCronometro: { ejecutar: gestionar },
      generarOperacionId: () => `operacion-${++secuencia}`,
    } as Pick<
      ServiciosCalendario,
      "consultarCronometro" | "gestionarCronometro" | "generarOperacionId"
    >;

    function Escenario() {
      const [revision, setRevision] = useState(0);
      return (
        <ControlCronometroBloque
          bloqueId="bloque-1"
          titulo="Escribir informe"
          permitirInicio
          servicios={servicios}
          revision={revision}
          onCambio={() => setRevision((actual) => actual + 1)}
        />
      );
    }

    render(<Escenario />);
    await usuario.click(
      await screen.findByRole("button", { name: "Iniciar cronómetro" }),
    );
    expect(await screen.findByRole("button", { name: "Pausar" })).toBeTruthy();
    const salida = screen.getByLabelText("Tiempo medido para Escribir informe");
    expect(salida.getAttribute("aria-live")).toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Pausar" }));
    expect(
      await screen.findByRole("button", { name: "Reanudar" }),
    ).toBeTruthy();
    await usuario.click(screen.getByRole("button", { name: "Reanudar" }));
    await usuario.click(await screen.findByRole("button", { name: "Detener" }));

    expect(
      await screen.findByText(/El bloque continúa pendiente/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Iniciar cronómetro" }),
    ).toBeTruthy();
    expect(gestionar.mock.calls.map(([comando]) => comando.tipo)).toEqual([
      "INICIAR",
      "PAUSAR",
      "REANUDAR",
      "DETENER",
    ]);
  });
});

function crearEstado(): EstadoCronometroBloqueDto {
  return {
    bloqueId: "bloque-1",
    consultadoEn: "2026-07-20T10:00:00.000Z",
    sesiones: [],
    duracionTotalMilisegundos: 0,
  };
}
