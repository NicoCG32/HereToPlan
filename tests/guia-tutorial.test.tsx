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
import { StrictMode } from "react";
import {
  CLAVE_PREFERENCIAS_TUTORIAL,
  PreferenciasTutorialLocalStorage,
} from "../src/infraestructura/persistencia/preferencias/PreferenciasTutorialLocalStorage";
import type { EstadoTutorialV1 } from "../src/aplicacion/tutorial/EstadoTutorialV1";

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
    expect(screen.getByRole("button", { name: "Guía omitida" })).toBeTruthy();
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

describe("progreso persistente de la guía", () => {
  it("rehidrata el paso activo y la pausa con un proveedor y adaptador nuevos", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias();
    let vista = render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await screen.findByRole("button", { name: "Nueva agenda" });
    await usuario.click(screen.getByRole("button", { name: "Iniciar guía" }));
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "EN_CURSO",
      pasoActual: "LIBRE",
    });
    const guardados = almacen.almacen.setItem.mock.calls.length;
    await usuario.click(screen.getByRole("button", { name: "Cerrar guía" }));
    expect(almacen.almacen.setItem).toHaveBeenCalledTimes(guardados);
    vista.unmount();
    vista = render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await screen.findByRole("heading", { name: "Empieza en Libre" });
    expect(
      screen.queryByRole("heading", { name: "Conoce HereToPlan a tu ritmo" }),
    ).toBeNull();
    await usuario.click(screen.getByRole("button", { name: "Posponer guía" }));
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "POSPUESTO",
      pasoActual: "LIBRE",
    });
    vista.unmount();
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await screen.findByRole("button", { name: "Continuar guía" });
    expect(
      screen.queryByRole("heading", { name: "Empieza en Libre" }),
    ).toBeNull();
    await usuario.click(screen.getByRole("button", { name: "Continuar guía" }));
    expect(
      await screen.findByRole("heading", { name: "Empieza en Libre" }),
    ).toBeTruthy();
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "EN_CURSO",
      pasoActual: "LIBRE",
    });
    esperarSinEscrituras(entorno);
  });

  it("conserva la omisión y abrir la ayuda no inicia otro recorrido", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias();
    const vista = render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await usuario.click(screen.getByRole("button", { name: "Omitir guía" }));
    vista.unmount();
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await screen.findByRole("button", { name: "Guía omitida" });
    const guardados = almacen.almacen.setItem.mock.calls.length;
    await usuario.click(screen.getByRole("button", { name: "Guía omitida" }));
    expect(screen.getByRole("heading", { name: "Guía omitida" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Iniciar guía" })).toBeNull();
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "OMITIDO",
      pasoActual: null,
    });
    expect(almacen.almacen.setItem).toHaveBeenCalledTimes(guardados);
    esperarSinEscrituras(entorno);
  });

  it("conserva el término después de una recarga y distingue mostrar de reiniciar", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno({ actividad: true, bloque: true });
    const almacen = crearAlmacenPreferencias();
    const vista = render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await screen.findByRole("button", { name: "Nueva agenda" });
    await avanzarHasta("EJECUCION", usuario);
    await usuario.click(screen.getByRole("button", { name: "Terminar guía" }));
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "COMPLETADO",
      pasoActual: null,
    });
    vista.unmount();
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await usuario.click(
      await screen.findByRole("button", { name: "Guía completada" }),
    );
    expect(
      screen.getByRole("heading", { name: "Recorrido completado" }),
    ).toBeTruthy();
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "COMPLETADO",
      pasoActual: null,
    });
    expect(screen.getByRole("button", { name: "Reiniciar guía" })).toBeTruthy();
    esperarSinEscrituras(entorno);
  });

  it("el reinicio persiste sólo la guía y vuelve a ofrecer el inicio", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias({
      version: 1,
      situacion: "POSPUESTO",
      pasoActual: "ACTIVIDAD",
    });
    almacen.datos.set("preferencia-ajena", "conservar");
    const vista = render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await usuario.click(screen.getByRole("button", { name: "Reiniciar guía" }));
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "NO_INICIADO",
      pasoActual: null,
    });
    expect(almacen.datos.get("preferencia-ajena")).toBe("conservar");
    vista.unmount();
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Conoce HereToPlan a tu ritmo" }),
    ).toBeTruthy();
    await comprobarAccesibilidad();
    esperarSinEscrituras(entorno);
  });

  it("mantiene una versión incompatible al usar la guía temporal y exige reinicio explícito", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias({ version: 9, estado: "futuro" });
    const original = almacen.datos.get(CLAVE_PREFERENCIAS_TUTORIAL);
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Recuperar la guía" }),
    ).toBeTruthy();
    await comprobarAccesibilidad();
    expect(almacen.almacen.setItem).not.toHaveBeenCalled();
    await usuario.click(
      screen.getByRole("button", { name: "Usar guía sin guardar" }),
    );
    await screen.findByRole("button", { name: "Nueva agenda" });
    await usuario.click(screen.getByRole("button", { name: "Iniciar guía" }));
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
    expect(almacen.datos.get(CLAVE_PREFERENCIAS_TUTORIAL)).toBe(original);
    expect(almacen.almacen.setItem).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Reiniciar guía" }));
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "NO_INICIADO",
      pasoActual: null,
    });
    esperarSinEscrituras(entorno);
  });

  it("recupera una lectura fallida sin sobrescribir el registro ni perder el foco", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias({
      version: 1,
      situacion: "POSPUESTO",
      pasoActual: "LIBRE",
    });
    let disponible = false;
    almacen.almacen.getItem.mockImplementation((clave: string) => {
      if (!disponible) throw new Error("Lectura bloqueada");
      return almacen.datos.get(clave) ?? null;
    });
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Recuperar la guía" }),
    ).toBeTruthy();
    expect(almacen.almacen.setItem).not.toHaveBeenCalled();
    disponible = true;
    await usuario.click(
      screen.getByRole("button", { name: "Reintentar lectura" }),
    );
    const continuar = await screen.findByRole("button", {
      name: "Continuar guía",
    });
    await waitFor(() => expect(document.activeElement).toBe(continuar));
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "POSPUESTO",
      pasoActual: "LIBRE",
    });
    expect(almacen.almacen.setItem).not.toHaveBeenCalled();
    await usuario.click(continuar);
    expect(
      await screen.findByRole("heading", { name: "Empieza en Libre" }),
    ).toBeTruthy();
    esperarSinEscrituras(entorno);
  });

  it("mantiene el avance en memoria al fallar el guardado y reintenta el estado más reciente", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias();
    let bloqueado = true;
    almacen.almacen.setItem.mockImplementation(
      (clave: string, valor: string) => {
        if (bloqueado) throw new Error("Cuota agotada");
        almacen.datos.set(clave, valor);
      },
    );
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await screen.findByRole("button", { name: "Nueva agenda" });
    await usuario.click(screen.getByRole("button", { name: "Iniciar guía" }));
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
    expect(
      screen.getByRole("heading", { name: "Empieza en Libre" }),
    ).toBeTruthy();
    expect(screen.getByText(/No se pudo guardar la guía/)).toBeTruthy();
    expect(almacen.datos.has(CLAVE_PREFERENCIAS_TUTORIAL)).toBe(false);
    await comprobarAccesibilidad();
    bloqueado = false;
    await usuario.click(
      screen.getByRole("button", { name: "Reintentar guardado" }),
    );
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "EN_CURSO",
      pasoActual: "LIBRE",
    });
    expect(screen.queryByText(/No se pudo guardar la guía/)).toBeNull();
    esperarSinEscrituras(entorno);
  });

  it("no guarda durante el renderizado ni duplica comandos en StrictMode", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias();
    render(
      <StrictMode>
        <App
          serviciosCalendario={entorno.servicios}
          preferenciasTutorial={almacen.preferencias()}
        />
      </StrictMode>,
    );
    await screen.findByRole("button", { name: "Nueva agenda" });
    expect(almacen.almacen.setItem).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Iniciar guía" }));
    expect(almacen.almacen.setItem).toHaveBeenCalledTimes(1);
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
    expect(almacen.almacen.setItem).toHaveBeenCalledTimes(2);
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "EN_CURSO",
      pasoActual: "LIBRE",
    });
    esperarSinEscrituras(entorno);
  });
});

describe("recuperación segura de preferencias", () => {
  it("detecta un registro incompatible que aparece después de iniciar la aplicación", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias();
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await screen.findByRole("button", { name: "Nueva agenda" });
    const futuro = '{"version":4,"progreso":"futuro"}';
    almacen.datos.set(CLAVE_PREFERENCIAS_TUTORIAL, futuro);
    await usuario.click(screen.getByRole("button", { name: "Iniciar guía" }));
    expect(
      screen.getByRole("heading", { name: "Recuperar la guía" }),
    ).toBeTruthy();
    expect(almacen.datos.get(CLAVE_PREFERENCIAS_TUTORIAL)).toBe(futuro);
    expect(almacen.almacen.setItem).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Cerrar guía" }));
    await usuario.click(screen.getByRole("button", { name: "Recuperar guía" }));
    expect(
      screen.getByRole("heading", { name: "Recuperar la guía" }),
    ).toBeTruthy();
    expect(almacen.datos.get(CLAVE_PREFERENCIAS_TUTORIAL)).toBe(futuro);
    esperarSinEscrituras(entorno);
  });

  it("mantiene JSON inválido y permite operar las páginas durante la recuperación", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias();
    almacen.datos.set(CLAVE_PREFERENCIAS_TUTORIAL, '{"version":');
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await screen.findByRole("button", { name: "Nueva agenda" });
    expect(
      screen.getByText(
        "El progreso guardado de la guía no tiene un formato válido.",
      ),
    ).toBeTruthy();
    await usuario.click(
      screen.getByRole("button", { name: "Reintentar lectura" }),
    );
    expect(almacen.datos.get(CLAVE_PREFERENCIAS_TUTORIAL)).toBe('{"version":');
    await usuario.click(screen.getByRole("button", { name: "Nueva agenda" }));
    expect(screen.getByLabelText("Nombre")).toBeTruthy();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(almacen.almacen.setItem).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Reiniciar guía" }));
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "NO_INICIADO",
      pasoActual: null,
    });
    esperarSinEscrituras(entorno);
  });

  it("reintenta un reinicio autorizado fallido guardando el avance actual", async () => {
    const usuario = userEvent.setup();
    const entorno = crearEntorno();
    const almacen = crearAlmacenPreferencias({
      version: 2,
      progreso: "futuro",
    });
    const anterior = almacen.datos.get(CLAVE_PREFERENCIAS_TUTORIAL);
    let bloqueado = true;
    almacen.almacen.setItem.mockImplementation(
      (clave: string, valor: string) => {
        if (bloqueado) throw new Error("No disponible");
        almacen.datos.set(clave, valor);
      },
    );
    render(
      <App
        serviciosCalendario={entorno.servicios}
        preferenciasTutorial={almacen.preferencias()}
      />,
    );
    await screen.findByRole("button", { name: "Nueva agenda" });
    await usuario.click(screen.getByRole("button", { name: "Reiniciar guía" }));
    await usuario.click(screen.getByRole("button", { name: "Iniciar guía" }));
    await usuario.click(screen.getByRole("button", { name: "Siguiente paso" }));
    expect(almacen.datos.get(CLAVE_PREFERENCIAS_TUTORIAL)).toBe(anterior);
    expect(
      screen.getByRole("heading", { name: "Empieza en Libre" }),
    ).toBeTruthy();
    bloqueado = false;
    await usuario.click(
      screen.getByRole("button", { name: "Reintentar guardado" }),
    );
    expect(almacen.leer()).toEqual({
      version: 1,
      situacion: "EN_CURSO",
      pasoActual: "LIBRE",
    });
    expect(screen.queryByText(/No se pudo guardar la guía/)).toBeNull();
    esperarSinEscrituras(entorno);
  });
});

function crearAlmacenPreferencias(inicial?: unknown) {
  const datos = new Map<string, string>();
  if (inicial !== undefined)
    datos.set(CLAVE_PREFERENCIAS_TUTORIAL, JSON.stringify(inicial));
  const almacen = {
    getItem: vi.fn((clave: string) => datos.get(clave) ?? null),
    setItem: vi.fn((clave: string, valor: string) => {
      datos.set(clave, valor);
    }),
  };
  return {
    datos,
    almacen,
    preferencias: () => new PreferenciasTutorialLocalStorage(almacen),
    leer: () =>
      JSON.parse(datos.get(CLAVE_PREFERENCIAS_TUTORIAL)!) as EstadoTutorialV1,
  };
}

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
