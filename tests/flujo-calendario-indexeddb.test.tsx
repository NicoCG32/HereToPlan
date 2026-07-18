import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";
import {
  CasoDeUsoAsignarActividad,
  CasoDeUsoConsultarCalendario,
  CasoDeUsoConsultarImpactoEliminacionContexto,
  CasoDeUsoCrearActividad,
  CasoDeUsoCrearContextoNombrado,
  CasoDeUsoEditarBloquePlanificacion,
  CasoDeUsoEliminarBloquePlanificacion,
  CasoDeUsoEliminarContextoPlanificacion,
  CasoDeUsoInicializarContextosPlanificacion,
  CasoDeUsoListarContextosPlanificacion,
  type CalendarioLocal,
} from "../src/aplicacion";
import { App } from "../src/app/App";
import { FechaLocal } from "../src/dominio";
import { RepositorioActividadesIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioActividadesIndexedDB";
import { RepositorioAgendasIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioAgendasIndexedDB";
import { RepositorioBloquesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioBloquesPlanificacionIndexedDB";
import { RepositorioContextosPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioContextosPlanificacionIndexedDB";
import { TransaccionEliminacionContextoPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/TransaccionEliminacionContextoPlanificacionIndexedDB";
import type { ServiciosCalendario } from "../src/presentacion/calendario/ServiciosCalendario";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

afterEach(cleanup);

describe("flujo persistente del calendario", () => {
  it("recupera contextos, actividades y bloques desde una composición nueva", async () => {
    const usuario = userEvent.setup();
    const fabricaIndexedDB = new IDBFactory();
    const nombreBaseDatos = "flujo-calendario-recarga";
    const primeraCarga = await crearEntorno(
      fabricaIndexedDB,
      nombreBaseDatos,
      ["contexto-semestre"],
      ["actividad-entrega", "actividad-libre", "actividad-pendiente"],
      ["bloque-entrega", "bloque-libre"],
    );

    await prepararPlanificacion(primeraCarga.servicios);
    const primeraVista = render(
      <App serviciosCalendario={primeraCarga.servicios} />,
    );
    await comprobarPlanificacionRecuperada();

    primeraVista.unmount();
    const segundaCarga = await crearEntorno(
      fabricaIndexedDB,
      nombreBaseDatos,
      ["contexto-no-utilizado"],
      ["actividad-no-utilizada"],
      ["bloque-no-utilizado"],
    );
    render(<App serviciosCalendario={segundaCarga.servicios} />);

    await comprobarPlanificacionRecuperada();
    expect(screen.getByLabelText("Contexto visible")).toHaveProperty(
      "value",
      "TODAS",
    );
    expect(
      screen.getAllByRole("button", { name: /Planificar 2026-07-/ }),
    ).toHaveLength(7);
    expect(
      screen.getByRole("button", { name: "Agendar Idea sin fecha" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Editar Preparar entrega" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Editar Rutina libre" }),
    ).toBeTruthy();

    await usuario.selectOptions(
      screen.getByLabelText("Contexto visible"),
      "contexto-semestre",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Editar Preparar entrega" }),
      ).toBeTruthy(),
    );
    expect(
      screen.queryByRole("button", { name: "Editar Rutina libre" }),
    ).toBeNull();

    await usuario.selectOptions(
      screen.getByLabelText("Contexto visible"),
      "contexto-libre",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Editar Rutina libre" }),
      ).toBeTruthy(),
    );
    expect(
      screen.queryByRole("button", { name: "Editar Preparar entrega" }),
    ).toBeNull();
  }, 15_000);
});

async function prepararPlanificacion(
  servicios: ServiciosCalendario,
): Promise<void> {
  await expect(
    servicios.crearContexto.ejecutar({
      nombre: "Semestre académico",
      fechaInicio: "2026-07-01",
      fechaFin: "2026-12-20",
    }),
  ).resolves.toMatchObject({ exito: true });

  for (const actividad of [
    {
      titulo: "Preparar entrega",
      tipo: "TAREA_SIMPLE" as const,
      tiempoNecesarioMinutos: 90,
    },
    {
      titulo: "Rutina libre",
      tipo: "HABITO" as const,
      tiempoNecesarioMinutos: 30,
      frecuencia: "DIARIA" as const,
    },
    {
      titulo: "Idea sin fecha",
      tipo: "PROYECTO" as const,
      tiempoNecesarioMinutos: 120,
    },
  ]) {
    await expect(
      servicios.crearActividad.ejecutar(actividad),
    ).resolves.toMatchObject({ exito: true });
  }

  await expect(
    servicios.asignarActividad.ejecutar({
      actividadId: "actividad-entrega",
      contextoId: "contexto-semestre",
      fecha: "2026-07-22",
      minutosPlanificados: 60,
      politica: {
        rigidez: "ESTRICTO",
        autoridadPlazo: "EXTERNA",
      },
    }),
  ).resolves.toMatchObject({ exito: true });
  await expect(
    servicios.asignarActividad.ejecutar({
      actividadId: "actividad-libre",
      fecha: "2026-07-20",
      minutosPlanificados: 30,
      politica: {
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: ["REPROGRAMAR"],
      },
    }),
  ).resolves.toMatchObject({ exito: true });
}

async function comprobarPlanificacionRecuperada(): Promise<void> {
  await screen.findByRole("heading", { name: "Calendario general" });
  expect(
    screen.getByRole("option", { name: "Semestre académico" }),
  ).toBeTruthy();
  expect(screen.getAllByText("Preparar entrega").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Rutina libre").length).toBeGreaterThan(0);
  expect(screen.getByText("Idea sin fecha")).toBeTruthy();
}

async function crearEntorno(
  fabricaIndexedDB: IDBFactory,
  nombreBaseDatos: string,
  idsContextos: readonly string[],
  idsActividades: readonly string[],
  idsBloques: readonly string[],
) {
  const configuracion = { fabricaIndexedDB, nombreBaseDatos };
  const contextos = new RepositorioContextosPlanificacionIndexedDB(
    configuracion,
  );
  const actividades = new RepositorioActividadesIndexedDB(configuracion);
  const agendas = new RepositorioAgendasIndexedDB(configuracion);
  const bloques = new RepositorioBloquesPlanificacionIndexedDB(configuracion);
  const transaccionEliminacion =
    new TransaccionEliminacionContextoPlanificacionIndexedDB(configuracion);
  const reloj = new RelojFijo(new Date("2026-07-20T10:00:00.000Z"));
  await new CasoDeUsoInicializarContextosPlanificacion(
    contextos,
    reloj,
  ).ejecutar();

  const servicios: ServiciosCalendario = {
    crearContexto: new CasoDeUsoCrearContextoNombrado(
      contextos,
      reloj,
      new GeneradorIdentificadoresPredefinidos([...idsContextos]),
    ),
    listarContextos: new CasoDeUsoListarContextosPlanificacion(contextos),
    consultarCalendario: new CasoDeUsoConsultarCalendario(
      contextos,
      actividades,
      agendas,
      bloques,
      new CalendarioLocalFijo("2026-07-20"),
    ),
    crearActividad: new CasoDeUsoCrearActividad(
      actividades,
      reloj,
      new GeneradorIdentificadoresPredefinidos([...idsActividades]),
    ),
    asignarActividad: new CasoDeUsoAsignarActividad(
      bloques,
      actividades,
      contextos,
      reloj,
      new GeneradorIdentificadoresPredefinidos([...idsBloques]),
    ),
    editarBloque: new CasoDeUsoEditarBloquePlanificacion(bloques, contextos),
    eliminarBloque: new CasoDeUsoEliminarBloquePlanificacion(bloques),
    consultarImpactoEliminacion:
      new CasoDeUsoConsultarImpactoEliminacionContexto(
        contextos,
        transaccionEliminacion,
      ),
    eliminarContexto: new CasoDeUsoEliminarContextoPlanificacion(
      contextos,
      transaccionEliminacion,
    ),
  };

  return { servicios };
}

class CalendarioLocalFijo implements CalendarioLocal {
  constructor(private readonly fecha: string) {}

  public hoy(): FechaLocal {
    return FechaLocal.crear(this.fecha);
  }
}
