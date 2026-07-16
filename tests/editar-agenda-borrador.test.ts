import { describe, expect, it } from "vitest";
import {
  CasoDeUsoGuardarBloquesAgendaBorrador,
  CasoDeUsoListarAgendasBorrador,
} from "../src/aplicacion";
import { Agenda, FechaLocal, PoliticaCompromiso } from "../src/dominio";
import { RepositorioAgendasEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioAgendasEnMemoria";
import { GeneradorIdentificadoresPredefinidos } from "./doblesAplicacion";

describe("edición de agendas borrador", () => {
  it("lista únicamente borradores mediante DTO inmutables", async () => {
    const repositorio = new RepositorioAgendasEnMemoria();
    const borrador = crearAgenda("agenda-borrador", "Borrador");
    const confirmada = crearAgenda("agenda-confirmada", "Confirmada");
    confirmada.agregarBloque(crearDatosBloque("bloque-confirmado"));
    confirmada.confirmar(new Date("2026-07-19T21:00:00.000Z"));
    await repositorio.guardar(confirmada);
    await repositorio.guardar(borrador);

    const agendas = await new CasoDeUsoListarAgendasBorrador(
      repositorio,
    ).ejecutar();

    expect(agendas).toHaveLength(1);
    expect(agendas[0]).toMatchObject({
      id: "agenda-borrador",
      estado: "BORRADOR",
      bloques: [],
      minutosPlanificados: 0,
    });
    expect(Object.isFrozen(agendas)).toBe(true);
    expect(Object.isFrozen(agendas[0])).toBe(true);
  });

  it("reemplaza atómicamente los bloques y devuelve su DTO", async () => {
    const repositorio = new RepositorioAgendasEnMemoria();
    await repositorio.guardar(crearAgenda("agenda-1"));
    const casoDeUso = new CasoDeUsoGuardarBloquesAgendaBorrador(
      repositorio,
      new GeneradorIdentificadoresPredefinidos([
        "bloque-1",
        "actividad-1",
        "bloque-2",
        "actividad-2",
      ]),
    );

    const resultado = await casoDeUso.ejecutar({
      agendaId: "agenda-1",
      bloques: [
        {
          actividad: "Preparar informe",
          fecha: "2026-07-20",
          minutosPlanificados: 45,
          rigidez: "ESTRICTO",
          autoridadPlazo: "EXTERNA",
          ajustesPermitidos: [],
        },
        {
          actividad: "Repasar notas",
          fecha: "2026-07-21",
          minutosPlanificados: 30,
          rigidez: "FLEXIBLE",
          autoridadPlazo: "PERSONAL",
          ajustesPermitidos: ["EXCUSAR"],
        },
      ],
    });

    expect(resultado).toMatchObject({
      exito: true,
      agenda: {
        id: "agenda-1",
        minutosPlanificados: 75,
        bloques: [
          { id: "bloque-1", actividadId: "actividad-1" },
          { id: "bloque-2", actividadId: "actividad-2" },
        ],
      },
    });
    await expect(repositorio.obtenerPorId("agenda-1")).resolves.toMatchObject({
      nombre: "Agenda",
    });
    expect(
      (await repositorio.obtenerPorId("agenda-1"))?.listarBloques(),
    ).toHaveLength(2);
  });

  it("conserva identificadores al editar bloques ya persistidos", async () => {
    const repositorio = new RepositorioAgendasEnMemoria();
    const agenda = crearAgenda("agenda-1");
    agenda.agregarBloque(crearDatosBloque("bloque-1"));
    await repositorio.guardar(agenda);
    const casoDeUso = new CasoDeUsoGuardarBloquesAgendaBorrador(
      repositorio,
      new GeneradorIdentificadoresPredefinidos([]),
    );

    const resultado = await casoDeUso.ejecutar({
      agendaId: agenda.id,
      bloques: [
        {
          id: "bloque-1",
          actividadId: "actividad-bloque-1",
          actividad: "Actividad modificada",
          fecha: "2026-07-21",
          minutosPlanificados: 60,
          rigidez: "FLEXIBLE",
          autoridadPlazo: "PERSONAL",
          ajustesPermitidos: ["EXCUSAR"],
        },
      ],
    });

    expect(resultado).toMatchObject({
      exito: true,
      agenda: {
        bloques: [
          {
            id: "bloque-1",
            actividadId: "actividad-bloque-1",
            actividad: "Actividad modificada",
          },
        ],
      },
    });
  });

  it("un bloque inválido no reemplaza el estado persistido", async () => {
    const repositorio = new RepositorioAgendasEnMemoria();
    const agenda = crearAgenda("agenda-1");
    agenda.agregarBloque(crearDatosBloque("bloque-original"));
    await repositorio.guardar(agenda);
    const casoDeUso = new CasoDeUsoGuardarBloquesAgendaBorrador(
      repositorio,
      new GeneradorIdentificadoresPredefinidos([
        "bloque-nuevo",
        "actividad-nueva",
      ]),
    );

    const resultado = await casoDeUso.ejecutar({
      agendaId: agenda.id,
      bloques: [
        {
          actividad: "Fuera de rango",
          fecha: "2026-07-22",
          minutosPlanificados: 30,
          rigidez: "ESTRICTO",
          autoridadPlazo: "PERSONAL",
          ajustesPermitidos: [],
        },
      ],
    });

    expect(resultado).toMatchObject({
      exito: false,
      error: { codigo: "BLOQUE_FUERA_DE_AGENDA", indiceBloque: 0 },
    });
    expect(
      (await repositorio.obtenerPorId(agenda.id))?.listarBloques()[0]?.id,
    ).toBe("bloque-original");
  });

  it("informa cuando el borrador dejó de existir", async () => {
    const resultado = await new CasoDeUsoGuardarBloquesAgendaBorrador(
      new RepositorioAgendasEnMemoria(),
      new GeneradorIdentificadoresPredefinidos([]),
    ).ejecutar({ agendaId: "ausente", bloques: [] });

    expect(resultado).toMatchObject({
      exito: false,
      error: { codigo: "AGENDA_NO_ENCONTRADA" },
    });
  });
});

function crearAgenda(id: string, nombre = "Agenda"): Agenda {
  return new Agenda({
    id,
    nombre,
    fechaInicio: FechaLocal.crear("2026-07-20"),
    fechaFin: FechaLocal.crear("2026-07-21"),
    creadaEn: new Date("2026-07-19T20:00:00.000Z"),
  });
}

function crearDatosBloque(id: string) {
  return {
    id,
    actividadId: `actividad-${id}`,
    titulo: "Actividad",
    fecha: FechaLocal.crear("2026-07-20"),
    minutosPlanificados: 30,
    politica: new PoliticaCompromiso({
      rigidez: "ESTRICTO" as const,
      autoridadPlazo: "PERSONAL" as const,
    }),
  };
}
