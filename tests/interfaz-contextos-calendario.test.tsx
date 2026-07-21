import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CasoDeUsoAsignarActividad,
  CasoDeUsoAsignarCortePlanificacion,
  CasoDeUsoConsultarCalendario,
  CasoDeUsoCorregirCortePlanificacion,
  CasoDeUsoConsultarImpactoEliminacionContexto,
  CasoDeUsoCrearActividad,
  CasoDeUsoCrearContextoNombrado,
  CasoDeUsoEditarBloquePlanificacion,
  CasoDeUsoEliminarContextoPlanificacion,
  CasoDeUsoEliminarBloquePlanificacion,
  CasoDeUsoInicializarContextosPlanificacion,
  CasoDeUsoListarContextosPlanificacion,
  CasoDeUsoCompletarBloqueConPuntos,
  CasoDeUsoMarcarBloqueIncumplido,
  CasoDeUsoRevisarCortePlanificacion,
  CasoDeUsoSincronizarCortesPlanificacion,
  type CalendarioLocal,
} from "../src/aplicacion";
import { App } from "../src/app/App";
import {
  BloquePlanificacion,
  ContextoPlanificacion,
  CortePlanificacion,
  FechaLocal,
  FormulaPuntosBloque,
  PoliticaCompromiso,
} from "../src/dominio";
import { RepositorioActividadesEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioActividadesEnMemoria";
import { RepositorioAgendasEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioAgendasEnMemoria";
import { RepositorioBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioBloquesPlanificacionEnMemoria";
import { RepositorioContextosPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioContextosPlanificacionEnMemoria";
import { RepositorioCortesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioCortesPlanificacionEnMemoria";
import { RepositorioResolucionesBloquesPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioResolucionesBloquesPlanificacionEnMemoria";
import { TransaccionEliminacionContextoPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/TransaccionEliminacionContextoPlanificacionEnMemoria";
import { TransaccionCompletarBloqueConPuntosEnMemoria } from "../src/infraestructura/persistencia/memoria/TransaccionCompletarBloqueConPuntosEnMemoria";
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

  it("ofrece un salto de teclado al contenido principal", async () => {
    const usuario = userEvent.setup();
    render(<App serviciosCalendario={await crearServicios()} />);
    await screen.findByRole("heading", { name: "Calendario general" });

    await usuario.tab();
    const enlace = screen.getByRole("link", {
      name: "Saltar al contenido principal",
    });
    expect(document.activeElement).toBe(enlace);
    await usuario.click(enlace);
    expect(document.activeElement).toBe(
      document.getElementById("contenido-principal"),
    );
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
  }, 15_000);

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
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Nombre")),
    );
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

    const diaOrigen = await screen.findByRole("button", {
      name: "Seleccionar día 2026-07-20",
    });
    await usuario.click(diaOrigen);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Crear primera actividad" }),
    );
    await usuario.click(
      screen.getByRole("button", { name: "Crear primera actividad" }),
    );
    expect(document.activeElement).toBe(screen.getByLabelText("Tipo"));
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
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Actividad")),
    );
    await usuario.click(screen.getByRole("button", { name: "Agregar bloque" }));
    expect(await screen.findByText(/fue asignada a 2026-07-20/)).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(diaOrigen));
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
      screen.getByRole("checkbox", {
        name: "Seleccionar Preparar informe para revisión",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Revisar selección (1)" }),
    ).toHaveProperty("disabled", false);
    await usuario.click(
      screen.getByRole("button", { name: "Quitar Preparar informe" }),
    );
    expect(await screen.findByText(/fue quitado/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Revisar selección (0)" }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: "Agendar Preparar informe" }),
    ).toBeTruthy();
    await expect(entorno.bloques.listar()).resolves.toHaveLength(0);
  }, 25_000);

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

  it("selecciona, revisa y asigna bloques antes de mostrar la gracia", async () => {
    const usuario = userEvent.setup();
    const entorno = await crearEntorno();
    await entorno.bloques.guardar(
      new BloquePlanificacion({
        id: "bloque-revision",
        contextoId: "contexto-libre",
        actividadId: "actividad-revision",
        titulo: "Preparar informe",
        fecha: FechaLocal.crear("2026-07-22"),
        minutosPlanificados: 45,
        politica: new PoliticaCompromiso({
          rigidez: "FLEXIBLE",
          autoridadPlazo: "PERSONAL",
          ajustesPermitidos: ["REPROGRAMAR"],
        }),
        creadoEn: new Date("2026-07-20T10:00:00.000Z"),
      }),
    );
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("heading", { name: "Calendario general" });

    await usuario.click(
      screen.getByRole("checkbox", {
        name: "Seleccionar Preparar informe para revisión",
      }),
    );
    await usuario.click(
      screen.getByRole("button", { name: "Revisar selección (1)" }),
    );
    let dialogo = await screen.findByRole("dialog", {
      name: "Revisar planificación",
    });
    expect(dialogo.textContent).toContain("45 min");
    expect(dialogo.textContent).toContain("Flexibles1");
    expect(document.activeElement).toBe(
      within(dialogo).getByRole("button", { name: "Volver al calendario" }),
    );

    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await expect(entorno.cortes.listar()).resolves.toHaveLength(0);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Revisar selección (1)" }),
      ),
    );

    await usuario.click(
      screen.getByRole("button", { name: "Revisar selección (1)" }),
    );
    dialogo = await screen.findByRole("dialog", {
      name: "Revisar planificación",
    });

    await usuario.click(
      within(dialogo).getByRole("button", {
        name: "Asignar planificación",
      }),
    );

    expect(
      await screen.findByText(/La planificación entró en gracia/),
    ).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: "Período de gracia" }),
    ).toBeTruthy();
    expect(screen.getByText("10:00").getAttribute("aria-hidden")).toBe("true");
    expect(
      screen.queryByRole("button", { name: "Editar Preparar informe" }),
    ).toBeNull();
    expect(screen.getByText("En período de gracia")).toBeTruthy();
    await expect(entorno.cortes.listar()).resolves.toHaveLength(1);

    await usuario.click(
      screen.getByRole("button", { name: "Corregir Preparar informe" }),
    );
    const dialogoCorreccion = screen.getByRole("dialog", {
      name: "Volver a editar la planificación",
    });
    expect(dialogoCorreccion.textContent).toContain(
      "Se cancelará el vencimiento actual",
    );
    await usuario.click(
      within(dialogoCorreccion).getByRole("button", {
        name: "Volver a editar",
      }),
    );

    expect(
      await screen.findByText(/La confirmación prevista fue cancelada/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Período de gracia" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Editar Preparar informe" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("checkbox", {
        name: "Seleccionar Preparar informe para revisión",
      }),
    ).toHaveProperty("checked", true);
    await expect(entorno.cortes.obtenerPorId("corte-1")).resolves.toMatchObject(
      { estado: "BORRADOR" },
    );
  }, 15_000);

  it("confirma resultados diferenciados y muestra el historial sin cronómetro", async () => {
    const usuario = userEvent.setup();
    const entorno = await crearEntorno();
    await prepararBloquesConfirmados(entorno);
    const consultarBilletera = vi.fn().mockResolvedValue({
      saldo: 0,
      movimientos: [],
    });
    render(
      <App
        serviciosCalendario={entorno.servicios}
        serviciosPuntos={{
          consultarBilletera: { ejecutar: consultarBilletera },
        }}
      />,
    );
    await screen.findByRole("heading", { name: "Calendario general" });
    await screen.findByText(/Aún no hay movimientos/);
    expect(consultarBilletera).toHaveBeenCalledTimes(1);

    const botonCompletar = screen.getByRole("button", {
      name: "Completar Sesión terminada",
    });
    await usuario.click(botonCompletar);
    let dialogo = screen.getByRole("dialog", {
      name: "Completar Sesión terminada",
    });
    expect(dialogo.textContent).toContain("Confirmación de cumplimiento");
    expect(dialogo.textContent).toContain("no podrá cambiarse");
    expect(document.activeElement).toBe(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );
    await usuario.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(botonCompletar));

    await usuario.click(botonCompletar);
    dialogo = screen.getByRole("dialog", {
      name: "Completar Sesión terminada",
    });
    await usuario.click(
      within(dialogo).getByRole("button", {
        name: "Confirmar cumplimiento",
      }),
    );
    expect(
      await screen.findByText(/quedó completado y registrado/),
    ).toBeTruthy();
    await waitFor(() => expect(consultarBilletera).toHaveBeenCalledTimes(2));
    expect(
      screen.getByRole("list", { name: "Historial de Sesión terminada" })
        .textContent,
    ).toContain("Completado");
    expect(
      screen.queryByRole("button", { name: "Completar Sesión terminada" }),
    ).toBeNull();

    await usuario.click(
      screen.getByRole("button", {
        name: "Marcar incumplido Sesión pendiente",
      }),
    );
    dialogo = screen.getByRole("dialog", {
      name: "Marcar incumplido Sesión pendiente",
    });
    expect(dialogo.textContent).toContain("No genera deuda ni resta puntos");
    await usuario.click(
      within(dialogo).getByRole("button", {
        name: "Confirmar incumplimiento",
      }),
    );
    expect(
      await screen.findByText(/marcado como incumplido, sin deuda/),
    ).toBeTruthy();
    expect(
      (
        await screen.findByRole("list", {
          name: "Historial de Sesión pendiente",
        })
      ).textContent,
    ).toContain("Incumplido");
    await expect(entorno.resoluciones.listar()).resolves.toHaveLength(2);
  }, 25_000);

  it("cancela el diálogo y luego elimina trasladando los bloques a Libre", async () => {
    const usuario = userEvent.setup();
    const entorno = await crearEntorno();
    await prepararAgendaEliminable(entorno);
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("heading", { name: "Calendario general" });
    expect(
      screen.queryByRole("button", { name: /Eliminar agenda/ }),
    ).toBeNull();
    await usuario.selectOptions(
      screen.getByLabelText("Contexto visible"),
      "contexto-eliminable",
    );
    await usuario.click(
      await screen.findByRole("checkbox", {
        name: "Seleccionar Preparar entrega para revisión",
      }),
    );
    const botonEliminar = await screen.findByRole("button", {
      name: "Eliminar agenda Proyecto temporal",
    });

    await usuario.click(botonEliminar);
    const dialogo = await screen.findByRole("dialog", {
      name: "Eliminar agenda Proyecto temporal",
    });
    expect(dialogo.textContent).toContain("Bloques editables1");
    expect(document.activeElement).toBe(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );
    await usuario.click(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );
    await waitFor(() => expect(document.activeElement).toBe(botonEliminar));

    await usuario.click(botonEliminar);
    await usuario.click(
      await screen.findByRole("button", {
        name: "Trasladar a Libre y eliminar agenda",
      }),
    );

    expect(
      await screen.findByText(
        /fue eliminada y sus 1 bloques editables quedaron en Libre/,
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Contexto visible")).toHaveProperty(
      "value",
      "contexto-libre",
    );
    expect(
      screen.getByRole("button", { name: "Revisar selección (1)" }),
    ).toHaveProperty("disabled", false);
    expect(
      screen.getByRole("checkbox", {
        name: "Seleccionar Preparar entrega para revisión",
      }),
    ).toHaveProperty("checked", true);
    await expect(
      entorno.repositorio.obtenerPorId("contexto-eliminable"),
    ).resolves.toBeUndefined();
    await expect(
      entorno.bloques.obtenerPorId("bloque-eliminable"),
    ).resolves.toMatchObject({ contextoId: "contexto-libre" });
  }, 15_000);

  it("requiere escribir el nombre antes de eliminar también los borradores", async () => {
    const usuario = userEvent.setup();
    const entorno = await crearEntorno();
    await prepararAgendaEliminable(entorno);
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("heading", { name: "Calendario general" });
    await usuario.selectOptions(
      screen.getByLabelText("Contexto visible"),
      "contexto-eliminable",
    );
    await usuario.click(
      await screen.findByRole("checkbox", {
        name: "Seleccionar Preparar entrega para revisión",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Revisar selección (1)" }),
    ).toHaveProperty("disabled", false);
    await usuario.click(
      await screen.findByRole("button", {
        name: "Eliminar agenda Proyecto temporal",
      }),
    );
    await usuario.click(
      await screen.findByRole("button", {
        name: "Eliminar también los borradores",
      }),
    );
    const confirmacion = screen.getByLabelText(
      /Escribe Proyecto temporal para confirmar/,
    );
    const botonDestructivo = screen.getByRole("button", {
      name: "Eliminar agenda y sus borradores",
    });
    expect(document.activeElement).toBe(confirmacion);
    expect(botonDestructivo).toHaveProperty("disabled", true);
    await usuario.type(confirmacion, "Proyecto temporal");
    expect(botonDestructivo).toHaveProperty("disabled", false);
    await usuario.click(botonDestructivo);

    expect(
      await screen.findByText(/y sus 1 bloques editables fueron eliminados/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Revisar selección (0)" }),
    ).toHaveProperty("disabled", true);
    await expect(
      entorno.bloques.obtenerPorId("bloque-eliminable"),
    ).resolves.toBeUndefined();
    await expect(
      entorno.repositorio.obtenerPorId("contexto-eliminable"),
    ).resolves.toBeUndefined();
  }, 15_000);
});

async function crearServicios(): Promise<ServiciosCalendario> {
  return (await crearEntorno()).servicios;
}

async function crearEntorno() {
  const repositorio = new RepositorioContextosPlanificacionEnMemoria();
  const actividades = new RepositorioActividadesEnMemoria();
  const agendas = new RepositorioAgendasEnMemoria();
  const bloques = new RepositorioBloquesPlanificacionEnMemoria();
  const cortes = new RepositorioCortesPlanificacionEnMemoria();
  const resoluciones =
    new RepositorioResolucionesBloquesPlanificacionEnMemoria();
  const generadorOperaciones = new GeneradorIdentificadoresPredefinidos([
    "operacion-1",
    "operacion-2",
    "operacion-3",
  ]);
  const transaccionCumplimiento =
    new TransaccionCompletarBloqueConPuntosEnMemoria(resoluciones);
  const reloj = new RelojFijo(new Date("2026-07-20T10:00:00.000Z"));
  await new CasoDeUsoInicializarContextosPlanificacion(
    repositorio,
    reloj,
  ).ejecutar();
  const transaccionEliminacion =
    new TransaccionEliminacionContextoPlanificacionEnMemoria(
      repositorio,
      bloques,
      agendas,
    );
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
      cortes,
      resoluciones,
      new CalendarioLocalFijo("2026-07-20"),
    ),
    revisarCorte: new CasoDeUsoRevisarCortePlanificacion(bloques, cortes),
    asignarCorte: new CasoDeUsoAsignarCortePlanificacion(
      bloques,
      cortes,
      reloj,
      new GeneradorIdentificadoresPredefinidos([
        "corte-1",
        "corte-2",
        "corte-3",
      ]),
    ),
    corregirCorte: new CasoDeUsoCorregirCortePlanificacion(cortes, reloj),
    sincronizarCortes: new CasoDeUsoSincronizarCortesPlanificacion(
      cortes,
      reloj,
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
    editarBloque: new CasoDeUsoEditarBloquePlanificacion(
      bloques,
      repositorio,
      cortes,
    ),
    eliminarBloque: new CasoDeUsoEliminarBloquePlanificacion(bloques, cortes),
    consultarImpactoEliminacion:
      new CasoDeUsoConsultarImpactoEliminacionContexto(
        repositorio,
        transaccionEliminacion,
      ),
    eliminarContexto: new CasoDeUsoEliminarContextoPlanificacion(
      repositorio,
      transaccionEliminacion,
    ),
    completarBloque: new CasoDeUsoCompletarBloqueConPuntos(
      cortes,
      resoluciones,
      transaccionCumplimiento,
      reloj,
      new GeneradorIdentificadoresPredefinidos([
        "ingreso-1",
        "ingreso-2",
        "ingreso-3",
      ]),
      new FormulaPuntosBloque(),
    ),
    marcarBloqueIncumplido: new CasoDeUsoMarcarBloqueIncumplido(
      cortes,
      resoluciones,
      reloj,
    ),
    consultarCronometro: {
      ejecutar: (bloqueId: string) =>
        Promise.resolve({
          bloqueId,
          consultadoEn: reloj.ahora().toISOString(),
          sesiones: [],
          duracionTotalMilisegundos: 0,
        }),
    },
    gestionarCronometro: {
      ejecutar: () =>
        Promise.reject(
          new Error("El cronómetro no forma parte de este escenario."),
        ),
    },
    generarOperacionId: () => generadorOperaciones.generar(),
  };

  return { repositorio, bloques, cortes, resoluciones, servicios };
}

async function prepararAgendaEliminable(
  entorno: Awaited<ReturnType<typeof crearEntorno>>,
): Promise<void> {
  await entorno.repositorio.guardar(
    ContextoPlanificacion.crearNombrado({
      id: "contexto-eliminable",
      nombre: "Proyecto temporal",
      fechaInicio: FechaLocal.crear("2026-07-01"),
      fechaFin: FechaLocal.crear("2026-08-31"),
      creadaEn: new Date("2026-07-20T10:00:00.000Z"),
    }),
  );
  await entorno.bloques.guardar(
    new BloquePlanificacion({
      id: "bloque-eliminable",
      contextoId: "contexto-eliminable",
      actividadId: "actividad-eliminable",
      titulo: "Preparar entrega",
      fecha: FechaLocal.crear("2026-07-22"),
      minutosPlanificados: 45,
      politica: new PoliticaCompromiso({
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: ["REPROGRAMAR"],
      }),
      creadoEn: new Date("2026-07-20T10:00:00.000Z"),
    }),
  );
}

async function prepararBloquesConfirmados(
  entorno: Awaited<ReturnType<typeof crearEntorno>>,
): Promise<void> {
  const bloques = [
    crearBloqueConfirmado("bloque-completo", "Sesión terminada", 45),
    crearBloqueConfirmado("bloque-incumplido", "Sesión pendiente", 30),
  ];
  for (const bloque of bloques) await entorno.bloques.guardar(bloque);
  const corte = CortePlanificacion.crear({
    id: "corte-confirmado",
    bloques,
    creadoEn: new Date("2026-07-20T09:00:00.000Z"),
  });
  corte.iniciarRevision();
  corte.asignar(new Date("2026-07-20T09:40:00.000Z"));
  corte.actualizarSegunReloj(new Date("2026-07-20T09:50:00.000Z"));
  await entorno.cortes.guardar(corte);
}

function crearBloqueConfirmado(id: string, titulo: string, minutos: number) {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-libre",
    actividadId: `actividad-${id}`,
    titulo,
    fecha: FechaLocal.crear("2026-07-20"),
    minutosPlanificados: minutos,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["REPROGRAMAR"],
    }),
    creadoEn: new Date("2026-07-20T09:00:00.000Z"),
  });
}

class CalendarioLocalFijo implements CalendarioLocal {
  constructor(private readonly fecha: string) {}

  public hoy(): FechaLocal {
    return FechaLocal.crear(this.fecha);
  }
}
