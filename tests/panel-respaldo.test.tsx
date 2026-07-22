import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CasoDeUsoAnalizarImportacionRespaldo,
  CasoDeUsoExportarRespaldo,
  CasoDeUsoPrepararRestauracionRespaldo,
  CasoDeUsoRestaurarRespaldo,
  COLECCIONES_RESPALDO,
  type ContenidoRespaldo,
} from "../src/aplicacion";
import { PanelRespaldo } from "../src/presentacion/respaldo/PanelRespaldo";
import type { ServiciosRespaldo } from "../src/presentacion/respaldo/ServiciosRespaldo";
import { comprobarAccesibilidad } from "./comprobarAccesibilidad";

afterEach(cleanup);

describe("panel de respaldo", () => {
  it("descarga una exportación y confirma el nombre generado", async () => {
    const usuario = userEvent.setup();
    const descargar = vi.fn();
    render(<PanelRespaldo servicios={crearServicios({ descargar })} />);

    await usuario.click(
      screen.getByRole("button", { name: "Descargar respaldo" }),
    );

    await waitFor(() => expect(descargar).toHaveBeenCalledOnce());
    expect((await screen.findByRole("status")).textContent).toContain(
      "heretoplan-respaldo-2026-07-20T15-30-00.000Z.json",
    );
  });

  it("muestra versión, contenido reconocido y advertencias del análisis", async () => {
    const usuario = userEvent.setup();
    const documento = respaldoVacio();
    documento.contenido["coleccion-futura"] = [];
    const servicios = crearServicios({
      leerArchivo: vi.fn().mockResolvedValue(JSON.stringify(documento)),
    });
    render(<PanelRespaldo servicios={servicios} />);

    await usuario.upload(
      screen.getByLabelText("Analizar archivo"),
      new File(["contenido ignorado por el doble"], "respaldo.json", {
        type: "application/json",
      }),
    );

    expect((await screen.findByRole("status")).textContent).toContain(
      "Respaldo válido · formato v3 · IndexedDB v10",
    );
    expect(screen.getByText("coleccion-futura", { exact: false })).toBeTruthy();
    expect(screen.getByText("contextos-planificacion")).toBeTruthy();
  });

  it("explica un archivo incompatible y mantiene explícito el carácter no destructivo", async () => {
    const usuario = userEvent.setup();
    const servicios = crearServicios({
      leerArchivo: vi.fn().mockResolvedValue(
        JSON.stringify({
          formato: "HereToPlan.respaldo",
          versionFormato: 4,
        }),
      ),
    });
    render(<PanelRespaldo servicios={servicios} />);

    await usuario.upload(
      screen.getByLabelText("Analizar archivo"),
      new File(["{}"], "futuro.json", { type: "application/json" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Respaldo incompatible · formato v4",
    );
    expect(screen.getByText(/no reemplaza, combina ni elimina/i)).toBeTruthy();
  });

  it("presenta los errores de lectura sin simular una descarga", async () => {
    const usuario = userEvent.setup();
    const descargar = vi.fn();
    const servicios = crearServicios({
      descargar,
      exportar: new CasoDeUsoExportarRespaldo(
        { leerEstadoCompleto: () => Promise.reject(new Error("sin acceso")) },
        { ahora: () => new Date() },
      ),
    });
    render(<PanelRespaldo servicios={servicios} />);

    await usuario.click(
      screen.getByRole("button", { name: "Descargar respaldo" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No fue posible leer el estado local",
    );
    expect(descargar).not.toHaveBeenCalled();
  });

  it("exige confirmación exacta, restaura y ofrece recargar la aplicación", async () => {
    const usuario = userEvent.setup();
    const reemplazarEstadoCompleto = vi.fn().mockResolvedValue(undefined);
    const recargarAplicacion = vi.fn();
    const servicios = crearServicios({
      restaurar: new CasoDeUsoRestaurarRespaldo({
        reemplazarEstadoCompleto,
      }),
      recargarAplicacion,
    });
    render(<PanelRespaldo servicios={servicios} />);

    await usuario.upload(
      screen.getByLabelText("Analizar archivo"),
      new File(["{}"], "respaldo.json", { type: "application/json" }),
    );
    await usuario.click(
      await screen.findByRole("button", { name: "Restaurar este respaldo" }),
    );

    const confirmar = screen.getByRole("button", {
      name: "Reemplazar estado local",
    });
    expect((confirmar as HTMLButtonElement).disabled).toBe(true);
    await comprobarAccesibilidad();
    await usuario.type(
      screen.getByLabelText(/Escribe RESTAURAR/i),
      "RESTAURAR",
    );
    expect((confirmar as HTMLButtonElement).disabled).toBe(false);
    await usuario.click(confirmar);

    await waitFor(() =>
      expect(reemplazarEstadoCompleto).toHaveBeenCalledOnce(),
    );
    expect(await screen.findByText(/Restauración completada/)).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", {
          name: "Recargar y usar los datos restaurados",
        }),
      ),
    );
    await usuario.click(
      screen.getByRole("button", {
        name: "Recargar y usar los datos restaurados",
      }),
    );
    expect(recargarAplicacion).toHaveBeenCalledOnce();
  });
});

function crearServicios(
  cambios: Partial<ServiciosRespaldo> = {},
): ServiciosRespaldo {
  const contenido = Object.fromEntries(
    COLECCIONES_RESPALDO.map((coleccion) => [coleccion, Object.freeze([])]),
  ) as unknown as ContenidoRespaldo;
  return {
    exportar: new CasoDeUsoExportarRespaldo(
      {
        leerEstadoCompleto: () =>
          Promise.resolve({ versionBaseDatos: 10, colecciones: contenido }),
      },
      { ahora: () => new Date("2026-07-20T15:30:00.000Z") },
    ),
    analizarImportacion: new CasoDeUsoAnalizarImportacionRespaldo(),
    prepararRestauracion: new CasoDeUsoPrepararRestauracionRespaldo(),
    restaurar: new CasoDeUsoRestaurarRespaldo({
      reemplazarEstadoCompleto: vi.fn().mockResolvedValue(undefined),
    }),
    descargar: vi.fn(),
    leerArchivo: vi.fn().mockResolvedValue(JSON.stringify(respaldoVacio())),
    recargarAplicacion: vi.fn(),
    ...cambios,
  };
}

interface DocumentoRespaldoPrueba {
  formato: string;
  versionFormato: number;
  creadoEn: string;
  origen: { aplicacion: string; versionBaseDatos: number };
  contenido: Record<string, unknown>;
}

function respaldoVacio(): DocumentoRespaldoPrueba {
  return {
    formato: "HereToPlan.respaldo",
    versionFormato: 3,
    creadoEn: "2026-07-20T15:30:00.000Z",
    origen: { aplicacion: "HereToPlan", versionBaseDatos: 10 },
    contenido: Object.fromEntries(
      COLECCIONES_RESPALDO.map((coleccion) => [coleccion, []]),
    ),
  };
}
