import { describe, expect, it } from "vitest";
import {
  ErrorMapeoPerfilUsuarioV1,
  rehidratarPerfilUsuarioDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorPerfilUsuarioV1";
import {
  ErrorMapeoBloquePlanificacionV1,
  rehidratarBloquePlanificacionDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorBloquePlanificacionV1";
import {
  ErrorMapeoResolucionBloquePlanificacionV1,
  rehidratarResolucionBloquePlanificacionDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorResolucionBloquePlanificacionV1";
import {
  ErrorMapeoRecompensaAdquiridaV1,
  rehidratarRecompensaAdquiridaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorRecompensaAdquiridaV1";
import {
  ErrorMapeoAplicacionRecompensaV1,
  rehidratarAplicacionRecompensaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorAplicacionRecompensaV1";
import {
  ErrorMapeoMovimientoRecuperacionV1,
  rehidratarMovimientoRecuperacionDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorMovimientoRecuperacionV1";
import {
  ErrorMapeoReduccionCargaV1,
  rehidratarReduccionCargaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorReduccionCargaV1";
import {
  ErrorMapeoCanjeRecompensaV1,
  rehidratarCanjeRecompensaDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorCanjeRecompensaV1";
import {
  ErrorMapeoTransaccionPuntosV1,
  rehidratarTransaccionPuntosDesdeV1,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorTransaccionPuntosV1";
import {
  convertirActividadEnV2,
  rehidratarActividadDesdeV2,
  migrarActividadV1AV2,
  ErrorMapeoActividadV2,
} from "../src/infraestructura/persistencia/mapeadores/MapeadorActividadV2";
import { convertirActividadEnV1 } from "../src/infraestructura/persistencia/mapeadores/MapeadorActividadV1";
import { FechaLocal, Habito, PoliticaCompromiso, Tarea } from "../src/dominio";

const instante = "2026-10-10T10:00:00.000Z";

function matriz<R extends object>(
  nombre: string,
  rehidratar: (registro: R) => unknown,
  base: R,
  campoInstante: keyof R,
  error: new (...argumentos: never[]) => Error,
  campoId: keyof R,
) {
  return [
    { motivo: "versión futura", cambios: { versionEsquema: 999 } },
    { motivo: "instante ilegible", cambios: { [campoInstante]: "sin-fecha" } },
    {
      motivo: "instante con zona sin normalizar",
      cambios: { [campoInstante]: "2026-10-10T07:00:00-03:00" },
    },
    { motivo: "identidad vacía", cambios: { [campoId]: " " } },
  ].map(({ motivo, cambios }) => ({
    nombre,
    motivo,
    error,
    registro: { ...base, ...cambios },
    rehidratar: (registro: unknown) => rehidratar(registro as R),
  }));
}

const registros = [
  ...matriz(
    "perfil",
    rehidratarPerfilUsuarioDesdeV1,
    {
      versionEsquema: 1,
      id: "perfil",
      nombreVisible: "Auditoría",
      creadoEn: instante,
      actualizadoEn: instante,
    },
    "creadoEn",
    ErrorMapeoPerfilUsuarioV1,
    "id",
  ),
  ...matriz(
    "bloque",
    rehidratarBloquePlanificacionDesdeV1,
    {
      versionEsquema: 1,
      id: "bloque",
      contextoId: "contexto-libre",
      actividadId: "actividad",
      titulo: "Trabajo",
      fecha: "2026-10-11",
      minutosPlanificados: 30,
      politica: {
        versionEsquema: 1,
        rigidez: "ESTRICTO",
        autoridadPlazo: "PERSONAL",
        ajustesPermitidos: [],
      },
      creadoEn: instante,
    },
    "creadoEn",
    ErrorMapeoBloquePlanificacionV1,
    "id",
  ),
  ...matriz(
    "resolución",
    rehidratarResolucionBloquePlanificacionDesdeV1,
    {
      versionEsquema: 1,
      bloqueId: "bloque",
      operacionId: "completar",
      resultado: "COMPLETADO",
      resueltoEn: instante,
    },
    "resueltoEn",
    ErrorMapeoResolucionBloquePlanificacionV1,
    "bloqueId",
  ),
  ...matriz(
    "unidad",
    rehidratarRecompensaAdquiridaDesdeV1,
    {
      versionEsquema: 1,
      id: "unidad",
      recompensaId: "dia-libre",
      puntosGastados: 3,
      adquiridaEn: instante,
      estado: "DISPONIBLE",
    },
    "adquiridaEn",
    ErrorMapeoRecompensaAdquiridaV1,
    "id",
  ),
  ...matriz(
    "aplicación",
    rehidratarAplicacionRecompensaDesdeV1,
    {
      versionEsquema: 1,
      id: "aplicacion",
      recompensaAdquiridaId: "unidad",
      recompensaId: "dia-libre",
      puntosGastados: 3,
      aplicadaEn: instante,
      fechaObjetivo: "2026-10-11",
      bloquesAfectados: ["bloque"],
    },
    "aplicadaEn",
    ErrorMapeoAplicacionRecompensaV1,
    "id",
  ),
  ...matriz(
    "recuperación",
    rehidratarMovimientoRecuperacionDesdeV1,
    {
      versionEsquema: 1,
      id: "movimiento",
      operacionId: "acreditar",
      tipo: "ACREDITACION",
      minutos: 5,
      bloqueFuenteId: "bloque",
      fechaFuente: "2026-10-10",
      descripcion: "Excedente",
      ocurridoEn: instante,
    },
    "ocurridoEn",
    ErrorMapeoMovimientoRecuperacionV1,
    "id",
  ),
  ...matriz(
    "reducción",
    rehidratarReduccionCargaDesdeV1,
    {
      versionEsquema: 1,
      id: "reduccion",
      operacionId: "consumir",
      movimientoId: "movimiento",
      bloqueId: "bloque",
      minutosReducidos: 5,
      aplicadaEn: instante,
    },
    "aplicadaEn",
    ErrorMapeoReduccionCargaV1,
    "id",
  ),
  ...matriz(
    "canje histórico",
    rehidratarCanjeRecompensaDesdeV1,
    {
      versionEsquema: 1,
      id: "canje",
      recompensaId: "dia-libre",
      puntosGastados: 3,
      canjeadoEn: instante,
      fechaObjetivo: "2026-10-11",
      bloquesAfectados: ["bloque"],
    },
    "canjeadoEn",
    ErrorMapeoCanjeRecompensaV1,
    "id",
  ),
  ...matriz(
    "puntos",
    rehidratarTransaccionPuntosDesdeV1,
    {
      versionEsquema: 1,
      id: "ingreso",
      tipo: "INGRESO",
      cantidad: 2,
      fuenteTipo: "COMPROMISO_COMPLETADO",
      fuenteId: "bloque",
      descripcion: "Cumplimiento",
      ocurridaEn: instante,
    },
    "ocurridaEn",
    ErrorMapeoTransaccionPuntosV1,
    "id",
  ),
];

describe("rechazo de registros persistidos incompatibles o corruptos", () => {
  it.each(registros)(
    "$nombre rechaza $motivo sin transformar el registro",
    ({ registro, rehidratar, error }) => {
      const antes = JSON.stringify(registro);
      expect(() => rehidratar(registro)).toThrow(error);
      expect(JSON.stringify(registro)).toBe(antes);
    },
  );

  it("rechaza un estado de inventario que contradice la aplicación persistida", () => {
    expect(() =>
      rehidratarRecompensaAdquiridaDesdeV1({
        versionEsquema: 1,
        id: "unidad",
        recompensaId: "dia-libre",
        puntosGastados: 3,
        adquiridaEn: instante,
        estado: "DISPONIBLE",
        aplicacionId: "aplicacion",
        consumidaEn: instante,
      }),
    ).toThrow(ErrorMapeoRecompensaAdquiridaV1);
  });

  it("rechaza el instante de consumo inválido de una unidad histórica", () => {
    expect(() =>
      rehidratarRecompensaAdquiridaDesdeV1({
        versionEsquema: 1,
        id: "unidad",
        recompensaId: "dia-libre",
        puntosGastados: 3,
        adquiridaEn: instante,
        estado: "CONSUMIDA",
        aplicacionId: "aplicacion",
        consumidaEn: "sin-fecha",
      }),
    ).toThrow(ErrorMapeoRecompensaAdquiridaV1);
  });
});

describe("rehidratación completa de actividades V2", () => {
  it.each([
    {
      cambios: { versionEsquema: 999 },
      codigo: "VERSION_ACTIVIDAD_NO_SOPORTADA",
    },
    {
      cambios: { modoSeguimiento: "DESCONOCIDO" },
      codigo: "MODO_SEGUIMIENTO_INVALIDO",
    },
  ])("rechaza un contrato V2 desconocido: $codigo", ({ cambios, codigo }) => {
    const tarea = new Tarea({
      id: "tarea",
      titulo: "Trabajo",
      tipo: "TAREA_SIMPLE",
      tiempoNecesarioMinutos: 30,
      creadaEn: new Date(instante),
    });
    const base = convertirActividadEnV2(tarea);
    const registro = { ...base, ...cambios } as unknown as typeof base;
    expect(() => rehidratarActividadDesdeV2(registro)).toThrow(
      ErrorMapeoActividadV2,
    );
    try {
      rehidratarActividadDesdeV2(registro);
    } catch (error: unknown) {
      expect(error).toMatchObject({ codigo });
    }
  });

  const politica = new PoliticaCompromiso({
    rigidez: "FLEXIBLE",
    autoridadPlazo: "PERSONAL",
    ajustesPermitidos: ["EXCUSAR"],
  });

  it("conserva el resultado, plazo y política de una tarea compuesta sin repetir su resolución", () => {
    const tarea = Tarea.rehidratar({
      id: "compuesta",
      titulo: "Entrega",
      descripcion: "Trabajo con subtareas",
      tipo: "TAREA_COMPUESTA",
      modoSeguimiento: "CRONOMETRADO",
      tiempoNecesarioMinutos: 60,
      subtareasIds: ["parte-a"],
      fechaLimite: FechaLocal.crear("2026-10-20"),
      creadaEn: new Date(instante),
      politicaPredeterminada: politica,
      estado: "COMPLETADA",
      resueltaEn: new Date("2026-10-11T10:00:00.000Z"),
    });
    const registro = convertirActividadEnV2(tarea);
    const copia = rehidratarActividadDesdeV2(registro);
    expect(copia).toBeInstanceOf(Tarea);
    expect(copia).toMatchObject({
      estado: "COMPLETADA",
      modoSeguimiento: "CRONOMETRADO",
      descripcion: "Trabajo con subtareas",
      fechaLimite: { valor: "2026-10-20" },
    });
    expect(
      copia
        .obtenerPoliticaPredeterminada()
        ?.ajustesPermitidos.includes("EXCUSAR"),
    ).toBe(true);
    expect((copia as Tarea).listarSubtareasIds()).toEqual(["parte-a"]);
    expect((copia as Tarea).resueltaEn?.toISOString()).toBe(
      "2026-10-11T10:00:00.000Z",
    );
  });

  it("conserva descripción, política y días ISO de un hábito sin convertirlo en tarea", () => {
    const habito = new Habito({
      id: "habito",
      titulo: "Práctica",
      descripcion: "Dos días",
      modoSeguimiento: "MANUAL",
      tiempoNecesarioMinutos: 20,
      frecuencia: "PERSONALIZADA",
      diasSemana: [1, 5],
      creadaEn: new Date(instante),
      politicaPredeterminada: politica,
    });
    const copia = rehidratarActividadDesdeV2(convertirActividadEnV2(habito));
    expect(copia).toBeInstanceOf(Habito);
    expect(copia.descripcion).toBe("Dos días");
    expect((copia as Habito).correspondeA(FechaLocal.crear("2026-10-12"))).toBe(
      true,
    );
    expect((copia as Habito).correspondeA(FechaLocal.crear("2026-10-13"))).toBe(
      false,
    );
    expect(
      copia
        .obtenerPoliticaPredeterminada()
        ?.ajustesPermitidos.includes("EXCUSAR"),
    ).toBe(true);
  });

  it.each(["sin-fecha", "2026-10-10T07:00:00-03:00"])(
    "rechaza una fecha de creación V2 no canónica: %s",
    (creadaEn) => {
      const tarea = new Tarea({
        id: "tarea",
        titulo: "Trabajo",
        tipo: "TAREA_SIMPLE",
        tiempoNecesarioMinutos: 30,
        creadaEn: new Date(instante),
      });
      expect(() =>
        rehidratarActividadDesdeV2({
          ...convertirActividadEnV2(tarea),
          creadaEn,
        }),
      ).toThrow(ErrorMapeoActividadV2);
    },
  );

  it("rechaza una versión futura antes de migrar una actividad legada", () => {
    const tarea = new Tarea({
      id: "tarea",
      titulo: "Trabajo",
      tipo: "TAREA_SIMPLE",
      tiempoNecesarioMinutos: 30,
      creadaEn: new Date(instante),
    });
    const registro = convertirActividadEnV1(tarea);
    expect(() =>
      migrarActividadV1AV2({
        ...registro,
        versionEsquema: 999,
      } as unknown as typeof registro),
    ).toThrow(ErrorMapeoActividadV2);
  });
});
