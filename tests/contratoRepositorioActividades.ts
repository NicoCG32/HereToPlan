import { beforeEach, describe, expect, it } from "vitest";
import {
  ErrorActividadDuplicada,
  type RepositorioActividades,
} from "../src/aplicacion";
import { Tarea } from "../src/dominio";

type FabricaRepositorio = () =>
  RepositorioActividades | Promise<RepositorioActividades>;

function crearActividad(id: string, titulo = "Actividad contractual"): Tarea {
  return new Tarea({
    id,
    titulo,
    tipo: "TAREA_SIMPLE",
    tiempoNecesarioMinutos: 30,
    creadaEn: new Date("2026-07-20T10:00:00.000Z"),
  });
}

export function verificarContratoRepositorioActividades(
  nombreAdaptador: string,
  crearRepositorio: FabricaRepositorio,
): void {
  describe(`contrato RepositorioActividades: ${nombreAdaptador}`, () => {
    let repositorio: RepositorioActividades;

    beforeEach(async () => {
      repositorio = await crearRepositorio();
    });

    it("representa una actividad ausente mediante undefined", async () => {
      await expect(
        repositorio.obtenerPorId("actividad-ausente"),
      ).resolves.toBeUndefined();
    });

    it("guarda, obtiene y lista actividades", async () => {
      await repositorio.guardar(crearActividad("actividad-1", "Primera"));
      await repositorio.guardar(crearActividad("actividad-2", "Segunda"));

      await expect(
        repositorio.obtenerPorId("actividad-1"),
      ).resolves.toMatchObject({
        id: "actividad-1",
        titulo: "Primera",
        tipo: "TAREA_SIMPLE",
      });
      const actividades = await repositorio.listar();
      expect(actividades.map((actividad) => actividad.titulo)).toEqual([
        "Primera",
        "Segunda",
      ]);
    });

    it("rechaza duplicados sin reemplazar la actividad existente", async () => {
      await repositorio.guardar(crearActividad("actividad-1", "Original"));

      await expect(
        repositorio.guardar(crearActividad("actividad-1", "Sustituta")),
      ).rejects.toMatchObject({
        name: "ErrorActividadDuplicada",
        codigo: "ACTIVIDAD_DUPLICADA",
      } satisfies Partial<ErrorActividadDuplicada>);

      await expect(
        repositorio.obtenerPorId("actividad-1"),
      ).resolves.toMatchObject({ titulo: "Original" });
    });
  });
}
