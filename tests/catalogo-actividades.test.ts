import { describe, expect, it } from "vitest";
import {
  CasoDeUsoConsultarCatalogoActividades,
  CasoDeUsoCrearActividad,
} from "../src/aplicacion";
import { Agenda, FechaLocal, PoliticaCompromiso, Tarea } from "../src/dominio";
import { RepositorioActividadesEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioActividadesEnMemoria";
import { RepositorioAgendasEnMemoria } from "../src/infraestructura/persistencia/memoria/RepositorioAgendasEnMemoria";
import { verificarContratoRepositorioActividades } from "./contratoRepositorioActividades";
import {
  GeneradorIdentificadoresPredefinidos,
  RelojFijo,
} from "./doblesAplicacion";

verificarContratoRepositorioActividades(
  "adaptador en memoria",
  () => new RepositorioActividadesEnMemoria(),
);

describe("catálogo de actividades", () => {
  it("crea una actividad mediante DTO sin programarla automáticamente", async () => {
    const actividades = new RepositorioActividadesEnMemoria();
    const agendas = new RepositorioAgendasEnMemoria();
    const crear = new CasoDeUsoCrearActividad(
      actividades,
      new RelojFijo(new Date("2026-07-20T10:00:00.000Z")),
      new GeneradorIdentificadoresPredefinidos(["actividad-1"]),
    );

    const resultado = await crear.ejecutar({
      titulo: "Preparar evaluación",
      tipo: "TAREA_SIMPLE",
      descripcion: "Repasar unidades uno y dos",
      tiempoNecesarioMinutos: 90,
    });

    expect(resultado).toEqual({
      exito: true,
      actividad: {
        id: "actividad-1",
        titulo: "Preparar evaluación",
        tipo: "TAREA_SIMPLE",
        descripcion: "Repasar unidades uno y dos",
        tiempoNecesarioMinutos: 90,
        subtareasIds: [],
        estado: "PENDIENTE",
        creadaEn: "2026-07-20T10:00:00.000Z",
      },
    });
    await expect(agendas.listar()).resolves.toEqual([]);
  });

  it("crea un proyecto compuesto con plazo y política predeterminada", async () => {
    const actividades = new RepositorioActividadesEnMemoria();
    await actividades.guardar(
      new Tarea({
        id: "tarea-base",
        titulo: "Preparar borrador",
        tipo: "TAREA_SIMPLE",
        tiempoNecesarioMinutos: 60,
        creadaEn: new Date("2026-07-20T09:00:00.000Z"),
      }),
    );
    const crear = new CasoDeUsoCrearActividad(
      actividades,
      new RelojFijo(new Date("2026-07-20T10:00:00.000Z")),
      new GeneradorIdentificadoresPredefinidos(["proyecto-1"]),
    );

    const resultado = await crear.ejecutar({
      titulo: "Publicar informe",
      descripcion: "Coordinar la entrega",
      tipo: "PROYECTO",
      tiempoNecesarioMinutos: 240,
      fechaLimite: "2026-08-15",
      subtareasIds: ["tarea-base"],
      politicaPredeterminada: {
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: ["EXCUSAR", "EXTENDER_PLAZO"],
      },
    });

    expect(resultado).toEqual({
      exito: true,
      actividad: {
        id: "proyecto-1",
        titulo: "Publicar informe",
        descripcion: "Coordinar la entrega",
        tipo: "PROYECTO",
        tiempoNecesarioMinutos: 240,
        fechaLimite: "2026-08-15",
        subtareasIds: ["tarea-base"],
        estado: "PENDIENTE",
        creadaEn: "2026-07-20T10:00:00.000Z",
        politicaPredeterminada: {
          versionEsquema: 1,
          rigidez: "FLEXIBLE",
          autoridadPlazo: "PERSONAL",
          ajustesPermitidos: ["EXCUSAR", "EXTENDER_PLAZO"],
        },
      },
    });
    if (resultado.exito) {
      expect(Object.isFrozen(resultado.actividad)).toBe(true);
      expect(Object.isFrozen(resultado.actividad.politicaPredeterminada)).toBe(
        true,
      );
    }
  });

  it.each([
    {
      comando: {
        titulo: "Fecha inválida",
        tipo: "TAREA_SIMPLE" as const,
        tiempoNecesarioMinutos: 30,
        fechaLimite: "15-08-2026",
      },
      codigo: "FECHA_LOCAL_INVALIDA",
      campo: "fechaLimite",
    },
    {
      comando: {
        titulo: "Política inválida",
        tipo: "HABITO" as const,
        tiempoNecesarioMinutos: 30,
        frecuencia: "DIARIA" as const,
        politicaPredeterminada: {
          rigidez: "ESTRICTO" as const,
          autoridadPlazo: "PERSONAL" as const,
          ajustesPermitidos: ["EXCUSAR" as const],
        },
      },
      codigo: "COMPROMISO_ESTRICTO_CON_AJUSTES",
      campo: "politicaPredeterminada",
    },
  ])(
    "traduce $codigo al campo de entrada",
    async ({ comando, codigo, campo }) => {
      const actividades = new RepositorioActividadesEnMemoria();
      const crear = new CasoDeUsoCrearActividad(
        actividades,
        new RelojFijo(new Date("2026-07-20T10:00:00.000Z")),
        new GeneradorIdentificadoresPredefinidos(["actividad-invalida"]),
      );

      await expect(crear.ejecutar(comando)).resolves.toMatchObject({
        exito: false,
        error: { codigo, campo },
      });
      await expect(actividades.listar()).resolves.toEqual([]);
    },
  );

  it("considera sin programar solo actividades que no tienen bloques", async () => {
    const actividades = new RepositorioActividadesEnMemoria();
    const agendas = new RepositorioAgendasEnMemoria();
    const reloj = new RelojFijo(new Date("2026-07-20T10:00:00.000Z"));
    const crear = new CasoDeUsoCrearActividad(
      actividades,
      reloj,
      new GeneradorIdentificadoresPredefinidos([
        "actividad-programada",
        "actividad-libre",
      ]),
    );
    await crear.ejecutar({
      titulo: "Programada",
      tipo: "TAREA_SIMPLE",
      tiempoNecesarioMinutos: 30,
    });
    await crear.ejecutar({
      titulo: "Sin fecha",
      tipo: "HABITO",
      tiempoNecesarioMinutos: 20,
      frecuencia: "DIARIA",
    });

    const agenda = new Agenda({
      id: "agenda-1",
      nombre: "Semestre",
      fechaInicio: FechaLocal.crear("2026-07-20"),
      fechaFin: FechaLocal.crear("2026-12-20"),
      creadaEn: reloj.ahora(),
    });
    agenda.agregarBloque({
      id: "bloque-1",
      actividadId: "actividad-programada",
      titulo: "Programada",
      fecha: FechaLocal.crear("2026-07-21"),
      minutosPlanificados: 60,
      politica: new PoliticaCompromiso({
        rigidez: "FLEXIBLE",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: ["EXCUSAR"],
      }),
    });
    await agendas.guardar(agenda);

    const consultar = new CasoDeUsoConsultarCatalogoActividades(
      actividades,
      agendas,
    );

    await expect(consultar.listar("SIN_PROGRAMAR")).resolves.toEqual([
      {
        id: "actividad-libre",
        titulo: "Sin fecha",
        tipo: "HABITO",
        tiempoNecesarioMinutos: 20,
        frecuencia: "DIARIA",
        diasSemana: [],
        creadaEn: "2026-07-20T10:00:00.000Z",
      },
    ]);
    await expect(
      consultar.obtenerPorId("actividad-programada"),
    ).resolves.toMatchObject({ id: "actividad-programada" });
  });
});
