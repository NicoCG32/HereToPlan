import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  CasoDeUsoAsignarActividad,
  CasoDeUsoConsultarCalendario,
  CasoDeUsoCrearActividad,
  CasoDeUsoCrearContextoNombrado,
  CasoDeUsoEditarBloquePlanificacion,
  CasoDeUsoEliminarBloquePlanificacion,
  CasoDeUsoInicializarContextosPlanificacion,
  CasoDeUsoListarContextosPlanificacion,
  type CalendarioLocal,
} from "../src/aplicacion";
import { App } from "../src/app/App";
import { FechaLocal } from "../src/dominio";
import { RepositorioActividadesEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioActividadesEnMemoria";
import { RepositorioAgendasEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioAgendasEnMemoria";
import { RepositorioBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioBloquesPlanificacionEnMemoria";
import { RepositorioContextosPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioContextosPlanificacionEnMemoria";
import type { ServiciosCalendario } from "../src/presentacion/calendario/ServiciosCalendario";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

afterEach(cleanup);

describe("interfaz de contextos del calendario", () => {
  it("abre el calendario general con Todas y conserva Libre como asignación predeterminada", async () => {
    render(<App serviciosCalendario={await crearServicios()} />);

    await screen.findByRole("heading", { name: "Calendario general" });
    expect(screen.getByLabelText("Contexto visible")).toHaveProperty(
      "value",
      "TODAS",
    );
    expect(
      screen.getByRole("option", { name: "Libre — predeterminado" }),
    ).toBeTruthy();
    expect(screen.getByText(/Las nuevas asignaciones/).textContent).toContain(
      "Libre",
    );
    expect(
      screen.getAllByRole("button", { name: /Planificar 2026-07-/ }),
    ).toHaveLength(7);
  });

  it("crea una agenda nombrada con propósito y rango, y la deja activa", async () => {
    const usuario = userEvent.setup();
    const entorno = await crearEntorno();
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("heading", { name: "Calendario general" });

    await usuario.click(screen.getByRole("button", { name: "Nueva agenda" }));
    const nombre = screen.getByLabelText("Nombre");
    expect(document.activeElement).toBe(nombre);
    await usuario.type(nombre, "Semestre académico");
    await usuario.type(
      screen.getByLabelText("Propósito (opcional)"),
      "Coordinar docencia y estudio",
    );
    await usuario.click(
      screen.getByLabelText("Definir un rango personalizado"),
    );
    await usuario.type(screen.getByLabelText("Fecha inicial"), "2026-08-01");
    await usuario.type(screen.getByLabelText("Fecha final"), "2026-12-20");
    await usuario.click(screen.getByRole("button", { name: "Crear agenda" }));

    expect(
      await screen.findByText(/Semestre académico quedó disponible/),
    ).toBeTruthy();
    expect(screen.getByLabelText("Contexto visible")).toHaveProperty(
      "value",
      "contexto-semestre",
    );
    await expect(
      entorno.repositorio.obtenerPorId("contexto-semestre"),
    ).resolves.toMatchObject({
      nombre: "Semestre académico",
      proposito: "Coordinar docencia y estudio",
      fechaInicio: { valor: "2026-08-01" },
      fechaFin: { valor: "2026-12-20" },
    });
  });

  it("muestra las validaciones junto a los campos corregibles", async () => {
    const usuario = userEvent.setup();
    render(<App serviciosCalendario={await crearServicios()} />);
    await screen.findByRole("heading", { name: "Calendario general" });
    await usuario.click(screen.getByRole("button", { name: "Nueva agenda" }));

    await usuario.click(screen.getByRole("button", { name: "Crear agenda" }));
    expect(
      await screen.findByText(
        "El contexto de planificación debe tener un nombre.",
      ),
    ).toBeTruthy();
    await usuario.type(screen.getByLabelText("Nombre"), "Proyecto");

    fireEvent.change(screen.getByLabelText("Propósito (opcional)"), {
      target: { value: "a".repeat(241) },
    });
    await usuario.click(
      screen.getByLabelText("Definir un rango personalizado"),
    );
    await usuario.click(screen.getByRole("button", { name: "Crear agenda" }));

    expect(
      await screen.findByText("Indica la fecha inicial del período."),
    ).toBeTruthy();
    expect(screen.getByText("Indica la fecha final del período.")).toBeTruthy();
    await usuario.click(
      screen.getByLabelText("Definir un rango personalizado"),
    );
    await usuario.click(screen.getByRole("button", { name: "Crear agenda" }));
    expect(
      await screen.findByText(
        "El propósito del contexto no puede superar 240 caracteres.",
      ),
    ).toBeTruthy();
  });

  it("cancela sin cambios y devuelve el foco a la acción de apertura", async () => {
    const usuario = userEvent.setup();
    const entorno = await crearEntorno();
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("heading", { name: "Calendario general" });
    const botonAbrir = screen.getByRole("button", { name: "Nueva agenda" });

    await usuario.click(botonAbrir);
    await usuario.type(screen.getByLabelText("Nombre"), "Agenda temporal");
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      screen.queryByRole("heading", { name: "Nueva agenda nombrada" }),
    ).toBeNull();
    expect(document.activeElement).toBe(botonAbrir);
    await expect(entorno.repositorio.listar()).resolves.toHaveLength(1);
  });

  it("crea, asigna, edita y quita una actividad desde un día concreto", async () => {
    const usuario = userEvent.setup();
    const entorno = await crearEntorno();
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("heading", { name: "Calendario general" });

    await usuario.click(
      await screen.findByRole("button", {
        name: "Seleccionar día 2026-07-20",
      }),
    );
    await usuario.click(
      screen.getByRole("button", { name: "Crear primera actividad" }),
    );
    await usuario.type(screen.getByLabelText("Título"), "Preparar informe");
    await usuario.clear(screen.getByLabelText("Tiempo necesario (minutos)"));
    await usuario.type(
      screen.getByLabelText("Tiempo necesario (minutos)"),
      "45",
    );
    await usuario.click(
      screen.getByRole("button", {
        name: "Guardar y asignar a 2026-07-20",
      }),
    );

    expect(
      await screen.findByText(/Define ahora los minutos y la política/),
    ).toBeTruthy();
    await usuario.click(screen.getByRole("button", { name: "Agregar bloque" }));
    expect(await screen.findByText(/fue asignada a 2026-07-20/)).toBeTruthy();
    expect(
      screen.getAllByText("Preparar informe").length,
    ).toBeGreaterThanOrEqual(3);
    expect(screen.getByLabelText("Contexto visible")).toHaveProperty(
      "value",
      "TODAS",
    );

    await usuario.click(
      screen.getByRole("button", { name: "Editar Preparar informe" }),
    );
    fireEvent.change(screen.getByLabelText("Fecha"), {
      target: { value: "2026-07-21" },
    });
    await usuario.clear(screen.getByLabelText("Minutos planificados"));
    await usuario.type(screen.getByLabelText("Minutos planificados"), "60");
    await usuario.click(screen.getByLabelText("Estricta — no admite ajustes"));
    await usuario.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(await screen.findByText(/fue actualizado/)).toBeTruthy();
    expect(screen.getByText(/Libre · 60 min · Estricta/)).toBeTruthy();

    await usuario.click(
      screen.getByRole("button", { name: "Quitar Preparar informe" }),
    );
    expect(await screen.findByText(/fue quitado/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Agendar Preparar informe" }),
    ).toBeTruthy();
    await expect(entorno.bloques.listar()).resolves.toHaveLength(0);
  }, 15_000);

  it("crea un proyecto sin fecha y lo mantiene en Sin programar", async () => {
    const usuario = userEvent.setup();
    render(<App serviciosCalendario={await crearServicios()} />);
    await screen.findByRole("heading", { name: "Calendario general" });
    await usuario.click(
      screen.getByRole("button", { name: "Nueva actividad sin fecha" }),
    );
    await usuario.selectOptions(screen.getByLabelText("Tipo"), "PROYECTO");
    await usuario.type(screen.getByLabelText("Título"), "Proyecto editorial");
    await usuario.click(
      screen.getByRole("button", { name: "Guardar sin programar" }),
    );

    expect(
      await screen.findByText(/Proyecto editorial quedó en Sin programar/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Agendar Proyecto editorial" }),
    ).toBeTruthy();
  });
});

async function crearServicios(): Promise<ServiciosCalendario> {
  return (await crearEntorno()).servicios;
}

async function crearEntorno() {
  const repositorio = new RepositorioContextosPlanificacionEnMemoria();
  const actividades = new RepositorioActividadesEnMemoria();
  const agendas = new RepositorioAgendasEnMemoria();
  const bloques = new RepositorioBloquesPlanificacionEnMemoria();
  const reloj = new RelojFijo(new Date("2026-07-20T10:00:00.000Z"));
  await new CasoDeUsoInicializarContextosPlanificacion(
    repositorio,
    reloj,
  ).ejecutar();
  const servicios: ServiciosCalendario = {
    crearContexto: new CasoDeUsoCrearContextoNombrado(
      repositorio,
      reloj,
      new GeneradorIdentificadoresPredefinidos([
        "contexto-semestre",
        "contexto-segundo-intento",
        "contexto-tercer-intento",
      ]),
    ),
    listarContextos: new CasoDeUsoListarContextosPlanificacion(repositorio),
    consultarCalendario: new CasoDeUsoConsultarCalendario(
      repositorio,
      actividades,
      agendas,
      bloques,
      new CalendarioLocalFijo("2026-07-20"),
    ),
    crearActividad: new CasoDeUsoCrearActividad(
      actividades,
      reloj,
      new GeneradorIdentificadoresPredefinidos([
        "actividad-1",
        "actividad-2",
        "actividad-3",
      ]),
    ),
    asignarActividad: new CasoDeUsoAsignarActividad(
      bloques,
      actividades,
      repositorio,
      reloj,
      new GeneradorIdentificadoresPredefinidos([
        "bloque-1",
        "bloque-2",
        "bloque-3",
      ]),
    ),
    editarBloque: new CasoDeUsoEditarBloquePlanificacion(bloques, repositorio),
    eliminarBloque: new CasoDeUsoEliminarBloquePlanificacion(bloques),
  };

  return { repositorio, bloques, servicios };
}

class CalendarioLocalFijo implements CalendarioLocal {
  constructor(private readonly fecha: string) {}

  public hoy(): FechaLocal {
    return FechaLocal.crear(this.fecha);
  }
}
