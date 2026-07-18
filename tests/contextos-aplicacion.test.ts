import { describe, expect, it } from "vitest";
import {
  CasoDeUsoCrearContextoNombrado,
  CasoDeUsoInicializarContextosPlanificacion,
  CasoDeUsoListarContextosPlanificacion,
} from "../src/aplicacion";
import { ContextoPlanificacion } from "../src/dominio";
import { RepositorioContextosPlanificacionEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioContextosPlanificacionEnMemoria";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

const PRIMER_INSTANTE = new Date("2026-07-20T10:00:00.000Z");

describe("casos de uso de contextos de planificación", () => {
  it("garantiza Libre de forma idempotente", async () => {
    const repositorio = new RepositorioContextosPlanificacionEnMemoria();
    const reloj = new RelojFijo(PRIMER_INSTANTE);
    const inicializar = new CasoDeUsoInicializarContextosPlanificacion(
      repositorio,
      reloj,
    );

    const primera = await inicializar.ejecutar();
    reloj.establecer(new Date("2027-01-01T00:00:00.000Z"));
    const segunda = await inicializar.ejecutar();

    expect(primera).toEqual({
      id: "contexto-libre",
      nombre: "Libre",
      tipo: "LIBRE",
      creadaEn: "2026-07-20T10:00:00.000Z",
      eliminable: false,
    });
    expect(segunda).toEqual(primera);
    await expect(repositorio.listar()).resolves.toHaveLength(1);
  });

  it("crea un contexto nombrado y devuelve solo valores serializables", async () => {
    const repositorio = new RepositorioContextosPlanificacionEnMemoria();
    const crear = new CasoDeUsoCrearContextoNombrado(
      repositorio,
      new RelojFijo(PRIMER_INSTANTE),
      new GeneradorIdentificadoresPredefinidos(["contexto-semestre"]),
    );

    const resultado = await crear.ejecutar({
      nombre: "  Semestre académico  ",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-12-20",
    });

    expect(resultado).toEqual({
      exito: true,
      contexto: {
        id: "contexto-semestre",
        nombre: "Semestre académico",
        tipo: "NOMBRADO",
        fechaInicio: "2026-08-01",
        fechaFin: "2026-12-20",
        creadaEn: "2026-07-20T10:00:00.000Z",
        eliminable: true,
      },
    });
    if (resultado.exito) {
      expect(resultado.contexto).not.toBeInstanceOf(ContextoPlanificacion);
      expect(Object.isFrozen(resultado.contexto)).toBe(true);
    }
  });

  it.each([
    {
      comando: {
        nombre: "",
        fechaInicio: "2026-08-01",
        fechaFin: "2026-12-20",
      },
      codigo: "NOMBRE_CONTEXTO_VACIO",
      campo: "nombre",
    },
    {
      comando: {
        nombre: "Semestre",
        fechaInicio: "01-08-2026",
        fechaFin: "2026-12-20",
      },
      codigo: "FECHA_LOCAL_INVALIDA",
      campo: "fechaInicio",
    },
    {
      comando: {
        nombre: "Semestre",
        fechaInicio: "2026-08-01",
        fechaFin: "2026-02-30",
      },
      codigo: "FECHA_LOCAL_INEXISTENTE",
      campo: "fechaFin",
    },
    {
      comando: { nombre: "Semestre", fechaInicio: "2026-08-01" },
      codigo: "RANGO_CONTEXTO_INCOMPLETO",
      campo: "fechaFin",
    },
  ])("rechaza $codigo sin persistir", async ({ comando, codigo, campo }) => {
    const repositorio = new RepositorioContextosPlanificacionEnMemoria();
    const crear = new CasoDeUsoCrearContextoNombrado(
      repositorio,
      new RelojFijo(PRIMER_INSTANTE),
      new GeneradorIdentificadoresPredefinidos(["contexto-1"]),
    );

    await expect(crear.ejecutar(comando)).resolves.toMatchObject({
      exito: false,
      error: { codigo, campo },
    });
    await expect(repositorio.listar()).resolves.toHaveLength(0);
  });

  it("lista Libre primero y luego los contextos por creación", async () => {
    const repositorio = new RepositorioContextosPlanificacionEnMemoria();
    await repositorio.guardar(
      ContextoPlanificacion.crearNombrado({
        id: "contexto-reciente",
        nombre: "Reciente",
        creadaEn: new Date("2026-07-21T10:00:00.000Z"),
      }),
    );
    await repositorio.guardar(
      ContextoPlanificacion.crearLibre(PRIMER_INSTANTE),
    );
    await repositorio.guardar(
      ContextoPlanificacion.crearNombrado({
        id: "contexto-antiguo",
        nombre: "Antiguo",
        creadaEn: new Date("2026-07-20T11:00:00.000Z"),
      }),
    );

    const listar = new CasoDeUsoListarContextosPlanificacion(repositorio);

    await expect(listar.ejecutar()).resolves.toMatchObject([
      { id: "contexto-libre" },
      { id: "contexto-antiguo" },
      { id: "contexto-reciente" },
    ]);
  });
});
