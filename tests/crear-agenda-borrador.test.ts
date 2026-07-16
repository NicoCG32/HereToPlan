import { describe, expect, it } from "vitest";
import {
  CasoDeUsoCrearAgendaBorrador,
  ErrorAgendaDuplicada,
  type RepositorioAgendas,
} from "../src/aplicacion";
import { Agenda, FechaLocal } from "../src/dominio";
import { RepositorioAgendasEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioAgendasEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const instanteCreacion = new Date("2026-07-19T20:00:00.000Z");

function prepararCasoDeUso(
  repositorio: RepositorioAgendas = new RepositorioAgendasEnMemoria(),
  identificadores: readonly string[] = ["agenda-1"],
) {
  return {
    repositorio,
    casoDeUso: new CasoDeUsoCrearAgendaBorrador(
      repositorio,
      new RelojFijo(instanteCreacion),
      new GeneradorIdentificadoresPredefinidos(identificadores),
    ),
  };
}

describe("CrearAgendaBorrador", () => {
  it("crea y guarda una agenda mediante sus puertos", async () => {
    const { casoDeUso, repositorio } = prepararCasoDeUso();

    const resultado = await casoDeUso.ejecutar({
      nombre: "  Semana de estudio  ",
      fechaInicio: "2026-07-20",
      fechaFin: "2026-07-26",
    });

    expect(resultado).toEqual({
      exito: true,
      agenda: {
        id: "agenda-1",
        nombre: "Semana de estudio",
        fechaInicio: "2026-07-20",
        fechaFin: "2026-07-26",
        estado: "BORRADOR",
        creadaEn: "2026-07-19T20:00:00.000Z",
      },
    });
    expect(Object.isFrozen(resultado)).toBe(true);
    if (resultado.exito) {
      expect(Object.isFrozen(resultado.agenda)).toBe(true);
    }

    const guardada = await repositorio.obtenerPorId("agenda-1");
    expect(guardada?.nombre).toBe("Semana de estudio");
    expect(guardada?.estado).toBe("BORRADOR");
  });

  it.each([
    {
      comando: {
        nombre: "",
        fechaInicio: "2026-07-20",
        fechaFin: "2026-07-26",
      },
      codigo: "NOMBRE_AGENDA_VACIO",
      campo: "nombre",
    },
    {
      comando: {
        nombre: "Agenda",
        fechaInicio: "20-07-2026",
        fechaFin: "2026-07-26",
      },
      codigo: "FECHA_LOCAL_INVALIDA",
      campo: "fechaInicio",
    },
    {
      comando: {
        nombre: "Agenda",
        fechaInicio: "2026-07-20",
        fechaFin: "2026-02-30",
      },
      codigo: "FECHA_LOCAL_INEXISTENTE",
      campo: "fechaFin",
    },
    {
      comando: {
        nombre: "Agenda",
        fechaInicio: "2026-07-26",
        fechaFin: "2026-07-20",
      },
      codigo: "RANGO_AGENDA_INVALIDO",
      campo: "fechaFin",
    },
  ])(
    "rechaza $codigo sin guardar estado parcial",
    async ({ comando, codigo, campo }) => {
      const { casoDeUso, repositorio } = prepararCasoDeUso();

      const resultado = await casoDeUso.ejecutar(comando);

      expect(resultado).toMatchObject({
        exito: false,
        error: { codigo, campo },
      });
      await expect(
        repositorio.obtenerPorId("agenda-1"),
      ).resolves.toBeUndefined();
    },
  );

  it("rechaza una colisión de ID sin reemplazar la agenda existente", async () => {
    const repositorio = new RepositorioAgendasEnMemoria();
    await repositorio.guardar(
      new Agenda({
        id: "agenda-1",
        nombre: "Agenda original",
        fechaInicio: FechaLocal.crear("2026-07-20"),
        fechaFin: FechaLocal.crear("2026-07-21"),
        creadaEn: instanteCreacion,
      }),
    );
    const { casoDeUso } = prepararCasoDeUso(repositorio);

    const resultado = await casoDeUso.ejecutar({
      nombre: "Agenda sustituta",
      fechaInicio: "2026-07-20",
      fechaFin: "2026-07-21",
    });

    expect(resultado).toMatchObject({
      exito: false,
      error: { codigo: "IDENTIFICADOR_AGENDA_DUPLICADO" },
    });
    await expect(repositorio.obtenerPorId("agenda-1")).resolves.toMatchObject({
      nombre: "Agenda original",
    });
  });

  it("traduce una colisión detectada atómicamente al guardar", async () => {
    const repositorio: RepositorioAgendas = {
      obtenerPorId: () => Promise.resolve(undefined),
      listar: () => Promise.resolve([]),
      guardar: (agenda) => Promise.reject(new ErrorAgendaDuplicada(agenda.id)),
      actualizar: () => Promise.resolve(),
    };
    const { casoDeUso } = prepararCasoDeUso(repositorio);

    const resultado = await casoDeUso.ejecutar({
      nombre: "Agenda concurrente",
      fechaInicio: "2026-07-20",
      fechaFin: "2026-07-21",
    });

    expect(resultado).toMatchObject({
      exito: false,
      error: { codigo: "IDENTIFICADOR_AGENDA_DUPLICADO" },
    });
  });
});
