import { beforeEach, describe, expect, it } from "vitest";
import {
  ErrorContextoDuplicado,
  ErrorContextoNoEncontrado,
  type RepositorioContextosPlanificacion,
} from "../src/aplicacion";
import {
  ContextoPlanificacion,
  ErrorDominio,
  FechaLocal,
  IDENTIFICADOR_CONTEXTO_LIBRE,
} from "../src/dominio";

type FabricaRepositorioContextos = () =>
  | RepositorioContextosPlanificacion
  | Promise<RepositorioContextosPlanificacion>;

const CREADA_EN = new Date("2026-07-20T10:00:00.000Z");

function crearContexto(
  id: string,
  nombre = "Semestre académico",
): ContextoPlanificacion {
  return ContextoPlanificacion.crearNombrado({
    id,
    nombre,
    fechaInicio: FechaLocal.crear("2026-08-01"),
    fechaFin: FechaLocal.crear("2026-12-20"),
    creadaEn: CREADA_EN,
  });
}

export function verificarContratoRepositorioContextosPlanificacion(
  nombreAdaptador: string,
  crearRepositorio: FabricaRepositorioContextos,
): void {
  describe(`contrato RepositorioContextosPlanificacion: ${nombreAdaptador}`, () => {
    let repositorio: RepositorioContextosPlanificacion;

    beforeEach(async () => {
      repositorio = await crearRepositorio();
    });

    it("representa un contexto ausente mediante undefined", async () => {
      await expect(
        repositorio.obtenerPorId("contexto-ausente"),
      ).resolves.toBeUndefined();
    });

    it("guarda, recupera y lista contextos", async () => {
      await repositorio.guardar(crearContexto("contexto-1", "Primero"));
      await repositorio.guardar(crearContexto("contexto-2", "Segundo"));

      await expect(
        repositorio.obtenerPorId("contexto-1"),
      ).resolves.toMatchObject({
        id: "contexto-1",
        nombre: "Primero",
        tipo: "NOMBRADO",
        fechaInicio: { valor: "2026-08-01" },
        fechaFin: { valor: "2026-12-20" },
      });
      await expect(repositorio.listar()).resolves.toHaveLength(2);
    });

    it("rechaza duplicados sin reemplazar el contexto existente", async () => {
      await repositorio.guardar(crearContexto("contexto-1", "Original"));

      await expect(
        repositorio.guardar(crearContexto("contexto-1", "Sustituto")),
      ).rejects.toMatchObject({
        name: "ErrorContextoDuplicado",
        codigo: "CONTEXTO_DUPLICADO",
      } satisfies Partial<ErrorContextoDuplicado>);
      await expect(
        repositorio.obtenerPorId("contexto-1"),
      ).resolves.toMatchObject({ nombre: "Original" });
    });

    it("actualiza únicamente un contexto nombrado existente", async () => {
      await repositorio.guardar(crearContexto("contexto-1", "Original"));

      await repositorio.actualizar(crearContexto("contexto-1", "Actualizado"));

      await expect(
        repositorio.obtenerPorId("contexto-1"),
      ).resolves.toMatchObject({ nombre: "Actualizado" });
      await expect(
        repositorio.actualizar(crearContexto("contexto-ausente")),
      ).rejects.toMatchObject({
        name: "ErrorContextoNoEncontrado",
        codigo: "CONTEXTO_NO_ENCONTRADO",
      } satisfies Partial<ErrorContextoNoEncontrado>);
    });

    it("elimina un contexto nombrado y rechaza una segunda eliminación", async () => {
      const contexto = crearContexto("contexto-1");
      await repositorio.guardar(contexto);

      await repositorio.eliminar(contexto);

      await expect(
        repositorio.obtenerPorId(contexto.id),
      ).resolves.toBeUndefined();
      await expect(repositorio.eliminar(contexto)).rejects.toMatchObject({
        name: "ErrorContextoNoEncontrado",
        codigo: "CONTEXTO_NO_ENCONTRADO",
      } satisfies Partial<ErrorContextoNoEncontrado>);
    });

    it("impide eliminar Libre y conserva su registro", async () => {
      const libre = ContextoPlanificacion.crearLibre(CREADA_EN);
      await repositorio.guardar(libre);

      await expect(repositorio.eliminar(libre)).rejects.toMatchObject({
        name: "ErrorDominio",
        codigo: "CONTEXTO_LIBRE_NO_ELIMINABLE",
      } satisfies Partial<ErrorDominio>);
      await expect(
        repositorio.obtenerPorId(IDENTIFICADOR_CONTEXTO_LIBRE),
      ).resolves.toBeDefined();
    });
  });
}
