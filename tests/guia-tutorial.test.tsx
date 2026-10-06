import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ActividadDto,
  BloqueCalendarioDto,
  CalendarioDto,
  ConsultaCalendario,
} from "../src/aplicacion";
import { App } from "../src/app/App";
import type { ServiciosCalendario } from "../src/presentacion/calendario/ServiciosCalendario";
import { comprobarAccesibilidad } from "./comprobarAccesibilidad";
import type { ServiciosPerfil } from "../src/presentacion/perfil/ServiciosPerfil";

beforeEach(() => {
  globalThis.location.hash = "#/calendario";
});
afterEach(() => {
  cleanup();
  globalThis.location.hash = "";
});

describe("guía contextual opcional", () => {
  it("espera la bienvenida de perfil y después ofrece la guía sin quitar el foco", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const crearPerfil = vi.fn().mockResolvedValue({
      exito: true,
      perfil: {
        id: "perfil",
        nombreVisible: "Prueba tutorial",
        creadoEn: "2026-07-20T08:00:00.000Z",
        actualizadoEn: "2026-07-20T08:00:00.000Z",
      },
    });
    const serviciosPerfil = {
      consultar: { ejecutar: vi.fn().mockResolvedValue(undefined) },
      crear: { ejecutar: crearPerfil },
      actualizar: { ejecutar: vi.fn() },
    } as unknown as ServiciosPerfil;
    render(
      <App
        serviciosCalendario={entorno.servicios}
        serviciosPerfil={serviciosPerfil}
      />,
    );
    await screen.findByRole("heading", { name: "Antes de comenzar" });
    expect(screen.queryByRole("button", { name: "Iniciar guía" })).toBeNull();
    await usuario.type(
      screen.getByLabelText("Nombre visible"),
      "Prueba tutorial",
    );
    await usuario.click(screen.getByRole("button", { name: "Comenzar" }));
    await screen.findByRole("button", { name: "Iniciar guía" });
    expect(document.activeElement).not.toBe(
      screen.getByRole("heading", { name: "Conoce HereToPlan a tu ritmo" }),
    );
    expect(crearPerfil).toHaveBeenCalledTimes(1);
    esperarSinEscrituras(entorno);
  });

  it("ofrece iniciar o posponer sin tomar el foco ni escribir datos", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    render(<App serviciosCalendario={entorno.servicios} />);
    const crearAgenda = await screen.findByRole("button", {
      name: "Nueva agenda",
    });
    crearAgenda.focus();
    await screen.findByRole("heading", {
      name: "Conoce HereToPlan a tu ritmo",
    });
    expect(document.activeElement).toBe(crearAgenda);
    await comprobarAccesibilidad();
    await usuario.click(screen.getByRole("button", { name: "Más tarde" }));
    expect(
      screen.queryByRole("region", { name: "Conoce HereToPlan a tu ritmo" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Continuar guía" })).toBeTruthy();
    await usuario.click(screen.getByRole("button", { name: "Continuar guía" }));
    expect(
      screen.getByRole("heading", { name: "Tu espacio de trabajo" }),
    ).toBeTruthy();
    esperarSinEscrituras(entorno);
  });

  it("conserva el paso al cerrar y posponer, y reacciona a ruta y contexto", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("button", { name: "Nueva agenda" });
    await usuario.click(screen.getByRole("button", { name: "Iniciar guía" }));
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
    await usuario.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Empieza en Libre" }),
      ).toBeNull(),
    );
    await usuario.click(screen.getByRole("button", { name: "Continuar guía" }));
    expect(
      screen.getByRole("heading", { name: "Empieza en Libre" }),
    ).toBeTruthy();
    await usuario.selectOptions(
      screen.getByLabelText("Contexto visible"),
      "estudios",
    );
    expect(
      await screen.findByText(/Ahora estás consultando: Estudios/),
    ).toBeTruthy();
    await usuario.click(screen.getByRole("button", { name: "Posponer guía" }));
    await usuario.click(screen.getByRole("link", { name: "Puntos" }));
    await usuario.click(screen.getByRole("button", { name: "Continuar guía" }));
    expect(
      screen.getByRole("heading", { name: "Puntos", level: 1 }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Empieza en Libre" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Siguiente paso" }),
    ).toHaveProperty("disabled", true);
    await usuario.click(
      screen.getByRole("button", { name: "Ir a Calendario" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Siguiente paso" }),
      ).toHaveProperty("disabled", false),
    );
    await usuario.click(screen.getByRole("button", { name: "Omitir guía" }));
    expect(
      screen.queryByRole("heading", { name: "Empieza en Libre" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Guía de primeros pasos" }),
    ).toBeTruthy();
    esperarSinEscrituras(entorno);
  });

  it("lleva al control explícitamente y espera una actividad guardada", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("button", { name: "Nueva agenda" });
    await avanzarHasta("ACTIVIDAD", usuario);
    const siguiente = screen.getByRole("button", { name: "Siguiente paso" });
    expect(siguiente).toHaveProperty("disabled", true);
    const destino = screen.getByRole("button", { name: "Crear actividad" });
    const desplazarDestino = vi.fn();
    destino.scrollIntoView = desplazarDestino;
    await usuario.click(screen.getByRole("button", { name: "Ver control" }));
    expect(document.activeElement).toBe(destino);
    expect(desplazarDestino).toHaveBeenCalled();
    esperarSinEscrituras(entorno);
    await usuario.click(destino);
    await usuario.type(screen.getByLabelText("Título"), "Preparar informe");
    await usuario.click(
      screen.getByRole("button", { name: "Guardar sin programar" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Siguiente paso" }),
      ).toHaveProperty("disabled", false),
    );
    expect(entorno.crearActividad).toHaveBeenCalledTimes(1);
    expect(entorno.asignarActividad).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
    expect(globalThis.location.hash).toBe("#/crear");
    expect(
      screen.getByRole("button", { name: "Ir a Calendario" }),
    ).toBeTruthy();
  });

  it("convive con el editor sin adelantar una asignación cancelada o fallida", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno({ actividad: true });
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("button", { name: "Nueva agenda" });
    await avanzarHasta("ASIGNACION", usuario);
    const espacioGuia = document.getElementById("guia-tutorial");
    const contenidoGuia = espacioGuia?.textContent;
    const origen = screen.getByRole("button", {
      name: "Agendar Preparar informe",
    });
    await usuario.click(origen);
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByRole("note").textContent).toContain(
      "Guía: Elige cuándo realizarla",
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Elige cuándo realizarla" }),
      ).toBeNull(),
    );
    expect(document.getElementById("guia-tutorial")).toBe(espacioGuia);
    expect(espacioGuia?.textContent).toBe(contenidoGuia);
    expect(espacioGuia?.closest("[inert]")).toBeTruthy();
    await usuario.keyboard("{Escape}");
    await screen.findByRole("heading", { name: "Elige cuándo realizarla" });
    expect(
      screen.getByRole("button", { name: "Siguiente paso" }),
    ).toHaveProperty("disabled", true);
    expect(entorno.asignarActividad).not.toHaveBeenCalled();
    await usuario.click(origen);
    await usuario.click(screen.getByRole("button", { name: "Agregar bloque" }));
    expect(await screen.findByText("No fue posible asignar")).toBeTruthy();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    await screen.findByRole("heading", { name: "Elige cuándo realizarla" });
    expect(
      screen.getByRole("button", { name: "Siguiente paso" }),
    ).toHaveProperty("disabled", true);
    entorno.asignarActividad.mockResolvedValue({ exito: true, bloque: BLOQUE });
    await usuario.click(origen);
    await usuario.click(screen.getByRole("button", { name: "Agregar bloque" }));
    await screen.findByRole("heading", { name: "Elige cuándo realizarla" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Siguiente paso" }),
      ).toHaveProperty("disabled", false),
    );
  });

  it("reconoce revisión y confirmación sólo después de sus acciones normales", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno({
      actividad: true,
      bloque: true,
      editable: true,
    });
    entorno.revisarCorte.mockResolvedValue({
      exito: false,
      error: { mensaje: "La selección no se puede revisar" },
    });
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("button", { name: "Nueva agenda" });
    await avanzarHasta("REVISION", usuario);
    expect(
      screen.getByRole("button", { name: "Siguiente paso" }),
    ).toHaveProperty("disabled", true);
    await usuario.click(
      screen.getByRole("button", {
        name: "Seleccionar todos para revisión (1)",
      }),
    );
    await usuario.click(
      screen.getByRole("button", { name: "Revisar selección (1)" }),
    );
    await screen.findByText("La selección no se puede revisar");
    expect(
      screen.getByRole("button", { name: "Siguiente paso" }),
    ).toHaveProperty("disabled", true);
    entorno.revisarCorte.mockResolvedValue({
      exito: true,
      revision: {
        cantidadBloques: 1,
        minutosPlanificados: 30,
        cantidadEstrictos: 0,
        cantidadFlexibles: 1,
        fechaInicio: "2026-07-20",
        fechaFin: "2026-07-20",
        bloques: [
          {
            id: "bloque",
            titulo: "Preparar informe",
            fecha: "2026-07-20",
            minutosPlanificados: 30,
            rigidez: "FLEXIBLE",
          },
        ],
      },
    });
    await usuario.click(
      screen.getByRole("button", { name: "Revisar selección (1)" }),
    );
    const dialogo = await screen.findByRole("dialog", {
      name: "Revisar planificación",
    });
    expect(within(dialogo).getByRole("note").textContent).toContain(
      "Guía: Revisa tu selección",
    );
    await comprobarAccesibilidad();
    await usuario.click(
      screen.getByRole("button", { name: "Volver al calendario" }),
    );
    await screen.findByRole("heading", { name: "Revisa tu selección" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Siguiente paso" }),
      ).toHaveProperty("disabled", false),
    );
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
    expect(
      screen.getByRole("button", { name: "Siguiente paso" }),
    ).toHaveProperty("disabled", true);
    await usuario.click(
      screen.getByRole("button", { name: "Revisar selección (1)" }),
    );
    await screen.findByRole("dialog", { name: "Revisar planificación" });
    expect(screen.getByRole("note").textContent).toContain(
      "Guía: Comprende la gracia",
    );
    entorno.asignarCorte.mockResolvedValue({
      exito: true,
      corte: {
        id: "corte",
        estado: "EN_GRACIA",
        confirmarAutomaticamenteEn: new Date(Date.now() + 600000).toISOString(),
      },
    });
    await usuario.click(
      screen.getByRole("button", { name: "Confirmar revisión" }),
    );
    await screen.findByRole("heading", { name: "Comprende la gracia" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Siguiente paso" }),
      ).toHaveProperty("disabled", false),
    );
    expect(entorno.asignarCorte).toHaveBeenCalledTimes(1);
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
    expect(
      screen.getByRole("button", { name: "Terminar guía" }),
    ).toHaveProperty("disabled", true);
    expect(entorno.completarBloque).not.toHaveBeenCalled();
  });

  it("puede completar el recorrido con datos existentes sin ejecutar operaciones", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno({ actividad: true, bloque: true });
    render(<App serviciosCalendario={entorno.servicios} />);
    await screen.findByRole("button", { name: "Nueva agenda" });
    await avanzarHasta("EJECUCION", usuario);
    await usuario.click(screen.getByRole("button", { name: "Terminar guía" }));
    expect(
      screen.getByRole("heading", { name: "Recorrido completado" }),
    ).toBeTruthy();
    await comprobarAccesibilidad();
    esperarSinEscrituras(entorno);
  });
});

const TITULOS = [
  "Tu espacio de trabajo",
  "Empieza en Libre",
  "Una agenda es opcional",
  "Define una actividad",
  "Elige cuándo realizarla",
  "Revisa tu selección",
  "Comprende la gracia",
  "Registra el resultado real",
];
const IDS = [
  "NAVEGACION",
  "LIBRE",
  "AGENDA_OPCIONAL",
  "ACTIVIDAD",
  "ASIGNACION",
  "REVISION",
  "CONFIRMACION",
  "EJECUCION",
];

async function avanzarHasta(
  paso: string,
  usuario: ReturnType<typeof userEvent.setup>,
) {
  await usuario.click(screen.getByRole("button", { name: "Iniciar guía" }));
  for (let indice = 0; indice <= IDS.indexOf(paso); indice++) {
    await screen.findByRole("heading", { name: TITULOS[indice]! });
    const ir = screen.queryByRole("button", { name: /^Ir a / });
    if (ir) await usuario.click(ir);
    if (IDS[indice] === paso) return;
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Siguiente paso" }),
      ).toHaveProperty("disabled", false),
    );
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
  }
}

const ACTIVIDAD: ActividadDto = {
  id: "actividad",
  tipo: "TAREA_SIMPLE",
  titulo: "Preparar informe",
  creadaEn: "2026-07-20T08:00:00.000Z",
  tiempoNecesarioMinutos: 30,
  modoSeguimiento: "MANUAL",
  subtareasIds: [],
  estado: "PENDIENTE",
};
const BLOQUE: BloqueCalendarioDto = {
  id: "bloque",
  actividadId: "actividad",
  titulo: "Preparar informe",
  fecha: "2026-07-20",
  minutosPlanificados: 30,
  modoSeguimiento: "MANUAL",
  estado: "COMPLETADO",
  origen: {
    contextoId: "contexto-libre",
    nombreContexto: "Libre",
    tipoContexto: "LIBRE",
  },
  politica: {
    rigidez: "FLEXIBLE",
    autoridadPlazo: "PERSONAL",
    ajustesPermitidos: [],
  },
  editable: false,
  historial: [],
  proteccion: { corteId: "corte", estado: "CONFIRMADA" },
};

function crearEntorno(
  inicial: { actividad?: boolean; bloque?: boolean; editable?: boolean } = {},
) {
  let actividad = inicial.actividad ?? false;
  const crearActividad = vi.fn(() => {
    actividad = true;
    return Promise.resolve({ exito: true, actividad: ACTIVIDAD });
  });
  const asignarActividad = vi.fn().mockResolvedValue({
    exito: false,
    error: { mensaje: "No fue posible asignar" },
  });
  const revisarCorte = vi.fn();
  const asignarCorte = vi.fn();
  const completarBloque = vi.fn();
  const crearContexto = vi.fn();
  const servicios = {
    consultarCalendario: {
      ejecutar: (consulta: ConsultaCalendario) => {
        const seleccion =
          consulta.seleccion.tipo === "CONTEXTO" &&
          consulta.seleccion.contextoId === "estudios"
            ? {
                tipo: "CONTEXTO" as const,
                contextoId: "estudios",
                nombre: "Estudios",
                tipoContexto: "NOMBRADO" as const,
              }
            : { tipo: "TODAS" as const, nombre: "Todas" as const };
        const bloque = {
          ...BLOQUE,
          editable: inicial.editable ?? false,
          estado: inicial.editable
            ? ("PENDIENTE" as const)
            : ("COMPLETADO" as const),
        };
        if (inicial.editable) delete bloque.proteccion;
        const resultado: CalendarioDto = {
          seleccion,
          vistaTemporal: "MES",
          rangoVisible: { fechaInicio: "2026-07-20", fechaFin: "2026-07-20" },
          hoy: "2026-07-20",
          contextos: [
            {
              id: "contexto-libre",
              nombre: "Libre",
              tipo: "LIBRE",
              creadaEn: "2026-07-20T08:00:00.000Z",
              eliminable: false,
            },
            {
              id: "estudios",
              nombre: "Estudios",
              tipo: "NOMBRADO",
              creadaEn: "2026-07-20T08:00:00.000Z",
              eliminable: true,
            },
          ],
          actividadesAsignables: actividad ? [ACTIVIDAD] : [],
          actividadesSinProgramar: actividad ? [ACTIVIDAD] : [],
          bloquesVisibles: inicial.bloque ? [bloque] : [],
          listaEquivalente: inicial.bloque ? [bloque] : [],
          proximosSieteDias: [],
          resumenSeleccion: {
            cantidadBloques: inicial.bloque ? 1 : 0,
            minutosPlanificados: inicial.bloque ? 30 : 0,
          },
        };
        return Promise.resolve(resultado);
      },
    },
    crearActividad: { ejecutar: crearActividad },
    crearContexto: { ejecutar: crearContexto },
    asignarActividad: { ejecutar: asignarActividad },
    revisarCorte: { ejecutar: revisarCorte },
    asignarCorte: { ejecutar: asignarCorte },
    completarBloque: { ejecutar: completarBloque },
    sincronizarCortes: { ejecutar: () => Promise.resolve([]) },
    corregirCorte: { ejecutar: vi.fn() },
  } as unknown as ServiciosCalendario;
  return {
    servicios,
    crearActividad,
    asignarActividad,
    revisarCorte,
    asignarCorte,
    completarBloque,
    crearContexto,
  };
}

function esperarSinEscrituras(entorno: ReturnType<typeof crearEntorno>) {
  for (const caso of [
    entorno.crearActividad,
    entorno.asignarActividad,
    entorno.revisarCorte,
    entorno.asignarCorte,
    entorno.completarBloque,
    entorno.crearContexto,
  ])
    expect(caso).not.toHaveBeenCalled();
}
