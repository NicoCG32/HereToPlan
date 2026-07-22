import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type {
  ActividadDto,
  CalendarioDto,
  ContextoPlanificacionDto,
} from "../src/aplicacion";
import { PaginaCrear } from "../src/presentacion/paginas/PaginaCrear";
import type { ServiciosCalendario } from "../src/presentacion/calendario/ServiciosCalendario";

afterEach(cleanup);

const CONTEXTO: ContextoPlanificacionDto = {
  id: "semestre",
  nombre: "Semestre",
  proposito: "Cerrar asignaturas",
  tipo: "NOMBRADO",
  creadaEn: "2026-07-21T10:00:00.000Z",
  eliminable: true,
};

const ACTIVIDAD: ActividadDto = {
  id: "actividad",
  tipo: "TAREA_SIMPLE",
  titulo: "Preparar informe",
  creadaEn: "2026-07-21T10:00:00.000Z",
  tiempoNecesarioMinutos: 45,
  modoSeguimiento: "MANUAL",
  subtareasIds: [],
  estado: "PENDIENTE",
};

describe("página Crear", () => {
  it("edita agendas y actividades reutilizando sus formularios", async () => {
    const usuario = userEvent.setup();
    const editarContexto = vi.fn().mockResolvedValue({
      exito: true,
      contexto: { ...CONTEXTO, nombre: "Semestre editado" },
    });
    const editarActividad = vi.fn().mockResolvedValue({
      exito: true,
      actividad: { ...ACTIVIDAD, titulo: "Informe editado" },
    });
    const servicios = crearServicios({ editarContexto, editarActividad });
    renderPagina(servicios);

    const itemAgenda = (await screen.findByText("Semestre")).closest("li")!;
    await usuario.click(
      within(itemAgenda).getByRole("button", { name: "Editar" }),
    );
    const nombreAgenda = screen.getByRole("textbox", { name: "Nombre" });
    expect((nombreAgenda as HTMLInputElement).value).toBe("Semestre");
    await usuario.clear(nombreAgenda);
    await usuario.type(nombreAgenda, "Semestre editado");
    await usuario.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(editarContexto).toHaveBeenCalledWith(
      expect.objectContaining({
        contextoId: "semestre",
        nombre: "Semestre editado",
      }),
    );

    const itemActividad = screen.getByText("Preparar informe").closest("li")!;
    await usuario.click(
      within(itemActividad).getByRole("button", { name: "Editar" }),
    );
    const titulo = screen.getByRole("textbox", { name: "Título" });
    expect((titulo as HTMLInputElement).value).toBe("Preparar informe");
    await usuario.clear(titulo);
    await usuario.type(titulo, "Informe editado");
    await usuario.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(editarActividad).toHaveBeenCalledWith(
      expect.objectContaining({
        actividadId: "actividad",
        titulo: "Informe editado",
      }),
    );
  });

  it("confirma la eliminación de una actividad y restaura el foco al cancelar", async () => {
    const usuario = userEvent.setup();
    const eliminarActividad = vi.fn().mockResolvedValue({
      exito: true,
      actividadId: ACTIVIDAD.id,
      titulo: ACTIVIDAD.titulo,
    });
    renderPagina(crearServicios({ eliminarActividad }));
    const item = (await screen.findByText(ACTIVIDAD.titulo)).closest("li")!;
    const eliminar = within(item).getByRole("button", { name: "Eliminar" });

    await usuario.click(eliminar);
    expect(
      screen.getByRole("heading", { name: `Eliminar ${ACTIVIDAD.titulo}` }),
    ).toBeTruthy();
    await usuario.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(eliminar));
    expect(eliminarActividad).not.toHaveBeenCalled();

    await usuario.click(eliminar);
    await usuario.click(
      screen.getByRole("button", { name: "Eliminar actividad" }),
    );
    expect(eliminarActividad).toHaveBeenCalledWith(ACTIVIDAD.id);
  });

  it("guarda sin programar o navega con actividad y fecha explícitas", async () => {
    const usuario = userEvent.setup();
    const crearActividad = vi.fn().mockResolvedValue({
      exito: true,
      actividad: { ...ACTIVIDAD, id: "actividad-nueva", titulo: "Lectura" },
    });
    renderPagina(crearServicios({ crearActividad }));

    await usuario.click(
      await screen.findByRole("button", { name: "Crear actividad" }),
    );
    await usuario.type(
      screen.getByRole("textbox", { name: "Título" }),
      "Lectura",
    );
    expect(screen.getByRole("radio", { name: /Manual/ })).toHaveProperty(
      "checked",
      true,
    );
    await usuario.click(screen.getByRole("radio", { name: /Cronometrado/ }));
    await usuario.click(
      screen.getByRole("button", { name: /Guardar y asignar a/ }),
    );

    expect(await screen.findByText(/actividad=actividad-nueva/)).toBeTruthy();
    expect(screen.getByText(/fecha=\d{4}-\d{2}-\d{2}/)).toBeTruthy();
    expect(crearActividad).toHaveBeenCalledWith(
      expect.objectContaining({ modoSeguimiento: "CRONOMETRADO" }),
    );
  });
});

function renderPagina(servicios: ServiciosCalendario) {
  return render(
    <MemoryRouter initialEntries={["/crear"]}>
      <Routes>
        <Route
          path="/crear"
          element={<PaginaCrear serviciosCalendario={servicios} />}
        />
        <Route path="/calendario" element={<UbicacionActual />} />
      </Routes>
    </MemoryRouter>,
  );
}

function UbicacionActual() {
  const ubicacion = useLocation();
  return <p>{ubicacion.search}</p>;
}

interface SustitucionesServicios {
  readonly crearActividad?: ReturnType<typeof vi.fn>;
  readonly editarActividad?: ReturnType<typeof vi.fn>;
  readonly eliminarActividad?: ReturnType<typeof vi.fn>;
  readonly editarContexto?: ReturnType<typeof vi.fn>;
}

function crearServicios(
  sustituciones: SustitucionesServicios = {},
): ServiciosCalendario {
  const calendario = {
    contextos: [
      {
        id: "contexto-libre",
        nombre: "Libre",
        tipo: "LIBRE",
        creadaEn: "2026-07-21T10:00:00.000Z",
        eliminable: false,
      },
      CONTEXTO,
    ],
    actividadesAsignables: [ACTIVIDAD],
  } as unknown as CalendarioDto;
  return {
    consultarCalendario: { ejecutar: vi.fn().mockResolvedValue(calendario) },
    crearContexto: { ejecutar: vi.fn() },
    crearActividad: {
      ejecutar: sustituciones.crearActividad ?? vi.fn(),
    },
    editarContexto: {
      ejecutar: sustituciones.editarContexto ?? vi.fn(),
    },
    editarActividad: {
      ejecutar: sustituciones.editarActividad ?? vi.fn(),
    },
    eliminarActividad: {
      ejecutar: sustituciones.eliminarActividad ?? vi.fn(),
    },
  } as unknown as ServiciosCalendario;
}
