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
import type {
  CalendarioDto,
  VistaPreviaAplicacionDiaLibreDto,
} from "../src/aplicacion";
import { PantallaCalendario } from "../src/presentacion/calendario/PantallaCalendario";
import type { ServiciosCalendario } from "../src/presentacion/calendario/ServiciosCalendario";
import { comprobarAccesibilidad } from "./comprobarAccesibilidad";

afterEach(cleanup);

describe("asignables del calendario", () => {
  it("consulta el detalle de otra fecha sin mover el mes y descarta el detalle anterior si falla", async () => {
    const usuario = userEvent.setup();
    const entorno = crearServicios();
    const consultar = vi.fn(
      (
        consulta: Parameters<
          ServiciosCalendario["consultarCalendario"]["ejecutar"]
        >[0],
      ) => {
        if (consulta.vistaTemporal !== "DIA") {
          return Promise.resolve(crearCalendario());
        }
        if (consulta.fechaAncla === "2026-08-02") {
          return Promise.reject(new Error("Consulta indisponible"));
        }
        return Promise.resolve({
          ...crearCalendario(),
          bloquesVisibles: [
            {
              id: "bloque-agosto",
              actividadId: "actividad-libre",
              titulo: "Lectura de agosto",
              fecha: "2026-08-01",
              minutosPlanificados: 30,
              modoSeguimiento: "MANUAL" as const,
              estado: "PENDIENTE" as const,
              origen: {
                contextoId: "contexto-libre",
                nombreContexto: "Libre",
                tipoContexto: "LIBRE" as const,
              },
              politica: {
                rigidez: "FLEXIBLE" as const,
                autoridadPlazo: "PERSONAL" as const,
                ajustesPermitidos: [],
              },
              editable: true,
              historial: [],
            },
          ],
        });
      },
    );
    entorno.servicios.consultarCalendario.ejecutar = consultar;
    render(
      <PantallaCalendario
        servicios={entorno.servicios}
        fechaInicial="2026-07-20"
      />,
    );
    await screen.findByRole("heading", { name: "Actividades para asignar" });
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.change(screen.getByLabelText("Fecha de asignación"), {
      target: { value: "2026-08-01" },
    });
    await usuario.click(
      screen.getByRole("button", { name: "Asignar Leer paper" }),
    );
    await usuario.click(screen.getByText("Ya planificado para 2026-08-01"));
    expect(await screen.findByText("Lectura de agosto")).toBeTruthy();
    expect(consultar).toHaveBeenCalledWith({
      seleccion: { tipo: "TODAS" },
      vistaTemporal: "DIA",
      fechaAncla: "2026-08-01",
    });
    fireEvent.change(screen.getByLabelText("Fecha"), {
      target: { value: "2026-08-02" },
    });
    expect(
      screen.getByRole("dialog", { name: "Planificar 2026-08-02" }),
    ).toBeTruthy();
    expect(
      await screen.findByText(
        "No fue posible consultar los bloques de esta fecha.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Lectura de agosto")).toBeNull();
    expect(screen.getByLabelText("Fecha de referencia")).toHaveProperty(
      "value",
      "2026-07-20",
    );
    expect(entorno.asignarActividad).not.toHaveBeenCalled();
  });

  it("mantiene la vista al asignar otra fecha y permite cerrar por teclado", async () => {
    const usuario = userEvent.setup();
    const entorno = crearServicios();
    const overflowAnterior = document.body.style.overflow;
    render(
      <PantallaCalendario
        servicios={entorno.servicios}
        fechaInicial="2026-07-20"
      />,
    );
    await screen.findByRole("heading", { name: "Actividades para asignar" });
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    await usuario.clear(screen.getByLabelText("Fecha de asignación"));
    fireEvent.change(screen.getByLabelText("Fecha de asignación"), {
      target: { value: "2026-08-01" },
    });
    const origen = screen.getByRole("button", { name: "Asignar Leer paper" });
    await usuario.click(origen);
    const dialogo = screen.getByRole("dialog", {
      name: "Planificar 2026-08-01",
    });
    expect(screen.getByLabelText("Fecha de referencia")).toHaveProperty(
      "value",
      "2026-07-20",
    );
    expect(within(dialogo).getByText(/Agenda:/).textContent).toContain("Libre");
    expect(document.body.style.overflow).toBe("hidden");
    await comprobarAccesibilidad();
    await usuario.click(
      within(dialogo).getByRole("button", {
        name: "Nueva actividad",
      }),
    );
    await usuario.keyboard("{Escape}");
    expect(
      screen.getByRole("dialog", { name: "Planificar 2026-08-01" }),
    ).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");
    await usuario.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entorno.asignarActividad).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe(overflowAnterior);
    await waitFor(() => expect(document.activeElement).toBe(origen));
  });

  it("devuelve el foco al botón nuevo cuando la actividad cambia de grupo al guardar", async () => {
    const usuario = userEvent.setup();
    const entorno = crearServicios();
    let asignada = false;
    entorno.servicios.consultarCalendario.ejecutar = vi.fn(() => {
      const calendario = crearCalendario();
      return Promise.resolve(
        asignada
          ? {
              ...calendario,
              actividadesSinProgramar:
                calendario.actividadesSinProgramar.filter(
                  (actividad) => actividad.id !== "actividad-libre",
                ),
            }
          : calendario,
      );
    });
    entorno.asignarActividad.mockImplementation(() => {
      asignada = true;
      return Promise.resolve({ exito: true, bloque: { titulo: "Leer paper" } });
    });
    render(<PantallaCalendario servicios={entorno.servicios} />);
    const origen = await screen.findByRole("button", {
      name: "Asignar Leer paper",
    });
    await usuario.click(origen);
    await usuario.click(screen.getByRole("button", { name: "Agregar bloque" }));
    await screen.findByText(
      "La actividad Leer paper fue asignada a 2026-07-21.",
    );
    await waitFor(() => {
      const destino = screen.getByRole("button", {
        name: "Asignar Leer paper",
      });
      expect(destino).not.toBe(origen);
      expect(document.activeElement).toBe(destino);
    });
  });

  it("distingue actividades, muestra sólo inventario disponible y abre cada comando", async () => {
    const usuario = userEvent.setup();
    const entorno = crearServicios();
    render(<PantallaCalendario servicios={entorno.servicios} />);

    await screen.findByRole("heading", {
      name: "Actividades para asignar",
    });
    expect(
      screen.getByRole("heading", { name: "Sin programar", level: 4 }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Ya asignadas", level: 4 }),
    ).toBeTruthy();
    expect(screen.getByText("Unidad disponible")).toBeTruthy();
    expect(screen.queryByText("Unidad consumida")).toBeNull();

    await usuario.click(
      screen.getByRole("button", { name: "Asignar Leer paper" }),
    );
    expect(
      screen.getByRole("heading", { name: "Planificar 2026-07-21" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Actividad")).toHaveProperty(
      "value",
      "actividad-libre",
    );
    expect(entorno.asignarActividad).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    const botonAplicar = screen.getByRole("button", {
      name: "Aplicar Día libre",
    });
    await usuario.click(botonAplicar);
    const dialogo = await screen.findByRole("dialog", {
      name: "Aplicar Día libre",
    });
    expect(dialogo.textContent).toContain("Vista previa obligatoria");
    expect(entorno.preparar).toHaveBeenCalledWith({
      recompensaAdquiridaId: "unidad-disponible",
      fechaObjetivo: "2026-07-21",
    });
    expect(entorno.aplicar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );
    await comprobarAccesibilidad();
    await usuario.click(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );
    expect(entorno.aplicar).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Aplicar Día libre" }),
      ),
    );

    await usuario.click(
      screen.getByRole("button", { name: "Aplicar Día libre" }),
    );
    await usuario.click(
      await screen.findByRole("button", { name: "Confirmar aplicación" }),
    );
    await waitFor(() => expect(entorno.aplicar).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Día libre fue aplicada/)).toBeTruthy();
  });

  it("al soltar abre tareas, materializa hábitos y prepara recompensas", async () => {
    const usuario = userEvent.setup();
    const entorno = crearServicios();
    render(<PantallaCalendario servicios={entorno.servicios} />);
    await screen.findByRole("heading", {
      name: "Actividades para asignar",
    });
    const destino = screen
      .getByRole("button", { name: "Seleccionar día 2026-07-22" })
      .closest("article")!;

    const actividad = screen
      .getByRole("button", { name: "Asignar Leer paper" })
      .closest("li")!;
    fireEvent.dragStart(actividad);
    fireEvent.dragOver(destino);
    fireEvent.drop(destino);
    expect(
      screen.getByRole("heading", { name: "Planificar 2026-07-22" }),
    ).toBeTruthy();
    expect(entorno.asignarActividad).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    const habito = screen
      .getByRole("button", { name: "Asignar Practicar lectura" })
      .closest("li")!;
    fireEvent.dragStart(habito);
    fireEvent.dragOver(destino);
    fireEvent.drop(destino);
    await waitFor(() =>
      expect(entorno.asignarRecurrencia).toHaveBeenCalledWith({
        actividadId: "habito-diario",
        contextoId: "contexto-libre",
        fechaInicio: "2026-07-22",
        fechaFin: "2026-07-22",
        minutosPlanificados: 20,
        politica: {
          rigidez: "FLEXIBLE",
          autoridadPlazo: "PERSONAL",
          ajustesPermitidos: [
            "EXCUSAR",
            "REPROGRAMAR",
            "EXTENDER_PLAZO",
            "REDUCIR_CARGA",
          ],
        },
      }),
    );
    expect(
      await screen.findByText(/se asignó automáticamente a 1 día/),
    ).toBeTruthy();

    const recompensa = screen
      .getByRole("button", { name: "Aplicar Día libre" })
      .closest("li")!;
    fireEvent.dragStart(recompensa);
    fireEvent.dragOver(destino);
    fireEvent.drop(destino);
    expect(
      await screen.findByRole("dialog", { name: "Aplicar Día libre" }),
    ).toBeTruthy();
    expect(entorno.preparar).toHaveBeenLastCalledWith({
      recompensaAdquiridaId: "unidad-disponible",
      fechaObjetivo: "2026-07-22",
    });
    expect(entorno.aplicar).not.toHaveBeenCalled();
  });
});

function crearServicios() {
  const asignarActividad = vi.fn();
  const asignarRecurrencia = vi.fn(() =>
    Promise.resolve({
      exito: true as const,
      bloques: [
        {
          id: "bloque-habito",
          contextoId: "contexto-libre",
          actividadId: "habito-diario",
          titulo: "Practicar lectura",
          fecha: "2026-07-22",
          minutosPlanificados: 20,
          modoSeguimiento: "MANUAL" as const,
          politica: {
            versionEsquema: 1 as const,
            rigidez: "FLEXIBLE" as const,
            autoridadPlazo: "PERSONAL" as const,
            ajustesPermitidos: ["EXCUSAR" as const],
          },
          creadoEn: "2026-07-20T10:00:00.000Z",
        },
      ],
      fechasOmitidas: [],
    }),
  );
  const preparar = vi.fn((comando: { fechaObjetivo: string }) =>
    Promise.resolve(crearVistaPrevia(comando.fechaObjetivo)),
  );
  const aplicar = vi.fn(() =>
    Promise.resolve({
      id: "aplicacion-1",
      recompensaAdquiridaId: "unidad-disponible",
      recompensaId: "dia-libre",
      nombre: "Día libre",
      fechaObjetivo: "2026-07-21",
      aplicadaEn: "2026-07-20T10:00:00.000Z",
      bloquesAfectados: [
        {
          id: "bloque-1",
          titulo: "Trabajo flexible",
          contextoId: "contexto-libre",
          contextoNombre: "Libre",
        },
      ],
      contextosAfectados: [{ id: "contexto-libre", nombre: "Libre" }],
      reintentoIdempotente: false,
    }),
  );
  const servicios = {
    consultarCalendario: { ejecutar: () => Promise.resolve(crearCalendario()) },
    sincronizarCortes: { ejecutar: () => Promise.resolve([]) },
    corregirCorte: { ejecutar: vi.fn() },
    consultarInventarioRecompensas: {
      ejecutar: () =>
        Promise.resolve({
          disponibles: [
            {
              id: "unidad-disponible",
              recompensaId: "dia-libre",
              nombre: "Día libre",
              puntosGastados: 3,
              adquiridaEn: "2026-07-20T09:00:00.000Z",
              estado: "DISPONIBLE" as const,
            },
          ],
          consumidas: [
            {
              id: "unidad-consumida",
              recompensaId: "dia-libre",
              nombre: "Unidad consumida",
              puntosGastados: 3,
              adquiridaEn: "2026-07-19T09:00:00.000Z",
              estado: "CONSUMIDA" as const,
              aplicacionId: "aplicacion-vieja",
              consumidaEn: "2026-07-19T10:00:00.000Z",
            },
          ],
          aplicaciones: [],
        }),
    },
    prepararAplicacionDiaLibre: { ejecutar: preparar },
    aplicarDiaLibre: { ejecutar: aplicar },
    asignarActividad: {
      ejecutar: asignarActividad,
      ejecutarRecurrencia: asignarRecurrencia,
    },
    editarBloque: { ejecutar: vi.fn() },
    generarOperacionId: () => "aplicacion-1",
  } as unknown as ServiciosCalendario;
  return {
    servicios,
    asignarActividad,
    asignarRecurrencia,
    preparar,
    aplicar,
  };
}

function crearCalendario(): CalendarioDto {
  const sinProgramar = {
    id: "actividad-libre",
    tipo: "TAREA_SIMPLE" as const,
    titulo: "Leer paper",
    creadaEn: "2026-07-20T08:00:00.000Z",
    tiempoNecesarioMinutos: 30,
    modoSeguimiento: "MANUAL" as const,
    subtareasIds: [],
    estado: "PENDIENTE" as const,
  };
  const asignada = {
    id: "actividad-asignada",
    tipo: "PROYECTO" as const,
    titulo: "Proyecto editorial",
    creadaEn: "2026-07-19T08:00:00.000Z",
    tiempoNecesarioMinutos: 60,
    modoSeguimiento: "MANUAL" as const,
    subtareasIds: [],
    estado: "PENDIENTE" as const,
  };
  const habito = {
    id: "habito-diario",
    tipo: "HABITO" as const,
    titulo: "Practicar lectura",
    creadaEn: "2026-07-20T08:30:00.000Z",
    tiempoNecesarioMinutos: 20,
    modoSeguimiento: "MANUAL" as const,
    frecuencia: "DIARIA" as const,
    diasSemana: [],
  };
  const fechas = ["2026-07-20", "2026-07-21", "2026-07-22"];
  return {
    seleccion: { tipo: "TODAS", nombre: "Todas" },
    vistaTemporal: "MES",
    rangoVisible: { fechaInicio: fechas[0]!, fechaFin: fechas[2]! },
    hoy: fechas[0]!,
    contextos: [
      {
        id: "contexto-libre",
        nombre: "Libre",
        tipo: "LIBRE",
        creadaEn: "2026-07-20T08:00:00.000Z",
        eliminable: false,
      },
    ],
    actividadesAsignables: [sinProgramar, habito, asignada],
    actividadesSinProgramar: [sinProgramar, habito],
    bloquesVisibles: [],
    proximosSieteDias: fechas.map((fecha, indice) => ({
      fecha,
      esHoy: indice === 0,
      bloques: [],
      minutosPlanificados: 0,
    })),
    listaEquivalente: [],
    resumenSeleccion: { cantidadBloques: 0, minutosPlanificados: 0 },
  };
}

function crearVistaPrevia(
  fechaObjetivo: string,
): VistaPreviaAplicacionDiaLibreDto {
  return {
    unidad: {
      id: "unidad-disponible",
      recompensaId: "dia-libre",
      nombre: "Día libre",
      adquiridaEn: "2026-07-20T09:00:00.000Z",
    },
    fechaObjetivo,
    puedeAplicar: true,
    afectados: [
      {
        id: "bloque-1",
        titulo: "Trabajo flexible",
        contextoId: "contexto-libre",
        contextoNombre: "Libre",
      },
    ],
    protegidos: [],
  };
}
