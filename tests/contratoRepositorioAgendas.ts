import { beforeEach, describe, expect, it } from "vitest";
import type { RepositorioAgendas } from "../src/aplicacion";
import {
  ErrorAgendaDuplicada,
  ErrorAgendaNoEncontrada,
} from "../src/aplicacion";
import { Agenda, FechaLocal } from "../src/dominio";

type FabricaRepositorioAgendas = () =>
  RepositorioAgendas | Promise<RepositorioAgendas>;

function crearAgenda(id: string, nombre = "Agenda contractual"): Agenda {
  return new Agenda({
    id,
    nombre,
    fechaInicio: FechaLocal.crear("2026-07-20"),
    fechaFin: FechaLocal.crear("2026-07-21"),
    creadaEn: new Date("2026-07-19T20:00:00.000Z"),
  });
}

export function verificarContratoRepositorioAgendas(
  nombreAdaptador: string,
  crearRepositorio: FabricaRepositorioAgendas,
): void {
  describe(`contrato RepositorioAgendas: ${nombreAdaptador}`, () => {
    let repositorio: RepositorioAgendas;

    beforeEach(async () => {
      repositorio = await crearRepositorio();
    });

    it("representa una agenda ausente mediante undefined", async () => {
      await expect(
        repositorio.obtenerPorId("agenda-ausente"),
      ).resolves.toBeUndefined();
    });

    it("guarda y recupera una agenda por su identificador", async () => {
      const agenda = crearAgenda("agenda-1");

      await repositorio.guardar(agenda);

      const recuperada = await repositorio.obtenerPorId("agenda-1");
      expect(recuperada).toBeDefined();
      expect(recuperada?.id).toBe("agenda-1");
      expect(recuperada?.nombre).toBe("Agenda contractual");
      expect(recuperada?.estado).toBe("BORRADOR");
      expect(recuperada?.fechaInicio.toString()).toBe("2026-07-20");
      expect(recuperada?.fechaFin.toString()).toBe("2026-07-21");
      expect(recuperada?.creadaEn.toISOString()).toBe(
        "2026-07-19T20:00:00.000Z",
      );
    });

    it("rechaza duplicados sin reemplazar la agenda existente", async () => {
      const original = crearAgenda("agenda-1", "Agenda original");
      const duplicada = crearAgenda("agenda-1", "Agenda sustituta");

      await repositorio.guardar(original);

      await expect(repositorio.guardar(duplicada)).rejects.toMatchObject({
        name: "ErrorAgendaDuplicada",
        codigo: "AGENDA_DUPLICADA",
      } satisfies Partial<ErrorAgendaDuplicada>);

      await expect(repositorio.obtenerPorId("agenda-1")).resolves.toMatchObject(
        {
          nombre: "Agenda original",
        },
      );
    });

    it("lista las agendas almacenadas", async () => {
      await repositorio.guardar(crearAgenda("agenda-1", "Primera"));
      await repositorio.guardar(crearAgenda("agenda-2", "Segunda"));

      const agendas = await repositorio.listar();

      expect(agendas).toHaveLength(2);
      expect(agendas.map((agenda) => agenda.nombre)).toEqual([
        "Primera",
        "Segunda",
      ]);
    });

    it("actualiza una agenda existente", async () => {
      await repositorio.guardar(crearAgenda("agenda-1", "Original"));

      await repositorio.actualizar(crearAgenda("agenda-1", "Actualizada"));

      await expect(repositorio.obtenerPorId("agenda-1")).resolves.toMatchObject(
        { nombre: "Actualizada" },
      );
    });

    it("rechaza la actualización de una agenda ausente", async () => {
      await expect(
        repositorio.actualizar(crearAgenda("agenda-ausente")),
      ).rejects.toMatchObject({
        name: "ErrorAgendaNoEncontrada",
        codigo: "AGENDA_NO_ENCONTRADA",
      } satisfies Partial<ErrorAgendaNoEncontrada>);
    });
  });
}
