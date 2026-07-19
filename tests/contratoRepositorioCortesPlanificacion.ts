import { beforeEach, describe, expect, it } from "vitest";
import {
  ErrorCortePlanificacionDuplicado,
  ErrorCortePlanificacionNoEncontrado,
  type RepositorioCortesPlanificacion,
} from "../src/aplicacion";
import {
  BloquePlanificacion,
  CortePlanificacion,
  FechaLocal,
  PoliticaCompromiso,
} from "../src/dominio";

type FabricaRepositorio = () =>
  RepositorioCortesPlanificacion | Promise<RepositorioCortesPlanificacion>;

export const CORTE_CREADO_EN = new Date("2026-07-20T09:00:00.000Z");
export const CORTE_ASIGNADO_EN = new Date("2026-07-20T10:00:00.000Z");
export const CORTE_CONFIRMAR_EN = new Date("2026-07-20T10:10:00.000Z");

export function crearCorteEnGracia(id: string): CortePlanificacion {
  const corte = CortePlanificacion.crear({
    id,
    bloques: [crearBloque(`bloque-${id}`)],
    creadoEn: CORTE_CREADO_EN,
  });
  corte.iniciarRevision();
  corte.asignar(CORTE_ASIGNADO_EN);
  return corte;
}

export function verificarContratoRepositorioCortesPlanificacion(
  nombreAdaptador: string,
  crearRepositorio: FabricaRepositorio,
): void {
  describe(`contrato RepositorioCortesPlanificacion: ${nombreAdaptador}`, () => {
    let repositorio: RepositorioCortesPlanificacion;

    beforeEach(async () => {
      repositorio = await crearRepositorio();
    });

    it("representa un corte ausente mediante undefined", async () => {
      await expect(
        repositorio.obtenerPorId("corte-ausente"),
      ).resolves.toBeUndefined();
    });

    it("guarda, recupera y lista los instantes autoritativos", async () => {
      await repositorio.guardar(crearCorteEnGracia("corte-1"));
      await repositorio.guardar(crearCorteEnGracia("corte-2"));

      await expect(repositorio.obtenerPorId("corte-1")).resolves.toMatchObject({
        id: "corte-1",
        estado: "EN_GRACIA",
      });
      const cortes = await repositorio.listar();
      expect(cortes).toHaveLength(2);
      expect(cortes[0]?.asignadaEn?.toISOString()).toBe(
        CORTE_ASIGNADO_EN.toISOString(),
      );
      expect(cortes[0]?.confirmarAutomaticamenteEn?.toISOString()).toBe(
        CORTE_CONFIRMAR_EN.toISOString(),
      );
    });

    it("rechaza duplicados sin reemplazar el registro existente", async () => {
      await repositorio.guardar(crearCorteEnGracia("corte-1"));

      await expect(
        repositorio.guardar(crearCorteEnGracia("corte-1")),
      ).rejects.toMatchObject({
        name: "ErrorCortePlanificacionDuplicado",
        codigo: "CORTE_PLANIFICACION_DUPLICADO",
      } satisfies Partial<ErrorCortePlanificacionDuplicado>);
      await expect(repositorio.obtenerPorId("corte-1")).resolves.toMatchObject({
        estado: "EN_GRACIA",
      });
    });

    it("solo persiste una transición temporal mediante actualización explícita", async () => {
      await repositorio.guardar(crearCorteEnGracia("corte-1"));
      const recuperado = (await repositorio.obtenerPorId("corte-1"))!;

      recuperado.actualizarSegunReloj(new Date("2026-07-20T10:30:00.000Z"));
      await expect(repositorio.obtenerPorId("corte-1")).resolves.toMatchObject({
        estado: "EN_GRACIA",
      });

      await repositorio.actualizar(recuperado);
      const persistido = await repositorio.obtenerPorId("corte-1");
      expect(persistido?.estado).toBe("CONFIRMADA");
      expect(persistido?.confirmadaEn?.toISOString()).toBe(
        CORTE_CONFIRMAR_EN.toISOString(),
      );
    });

    it("rechaza la actualización de un corte ausente", async () => {
      await expect(
        repositorio.actualizar(crearCorteEnGracia("corte-ausente")),
      ).rejects.toMatchObject({
        name: "ErrorCortePlanificacionNoEncontrado",
        codigo: "CORTE_PLANIFICACION_NO_ENCONTRADO",
      } satisfies Partial<ErrorCortePlanificacionNoEncontrado>);
    });
  });
}

function crearBloque(id: string): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-libre",
    actividadId: "actividad-1",
    titulo: "Preparar informe",
    fecha: FechaLocal.crear("2026-07-20"),
    minutosPlanificados: 45,
    politica: new PoliticaCompromiso({
      rigidez: "FLEXIBLE",
      autoridadPlazo: "PERSONAL",
      ajustesPermitidos: ["REPROGRAMAR"],
    }),
    creadoEn: CORTE_CREADO_EN,
  });
}
