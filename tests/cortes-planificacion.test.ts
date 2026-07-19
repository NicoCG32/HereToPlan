import { describe, expect, it } from "vitest";
import {
  BloquePlanificacion,
  CortePlanificacion,
  DURACION_GRACIA_MINUTOS,
  FechaLocal,
  PoliticaCompromiso,
  type DatosBloqueCortePlanificacion,
} from "../src/dominio";
import { esperarErrorDominio } from "./esperarErrorDominio";

const CREADO_EN = new Date("2026-07-20T09:00:00.000Z");
const ASIGNADA_EN = new Date("2026-07-20T10:00:00.000Z");
const CONFIRMAR_EN = new Date("2026-07-20T10:10:00.000Z");

function politicaFlexible(): PoliticaCompromiso {
  return new PoliticaCompromiso({
    rigidez: "FLEXIBLE",
    autoridadPlazo: "PERSONAL",
    ajustesPermitidos: ["EXCUSAR"],
  });
}

function crearBloque(id = "bloque-1"): BloquePlanificacion {
  return new BloquePlanificacion({
    id,
    contextoId: "contexto-1",
    actividadId: `actividad-${id}`,
    titulo: `Trabajo ${id}`,
    fecha: FechaLocal.crear("2026-07-20"),
    minutosPlanificados: 45,
    politica: politicaFlexible(),
    creadoEn: CREADO_EN,
  });
}

function crearCorte(cantidadBloques = 1): CortePlanificacion {
  return CortePlanificacion.crear({
    id: "corte-1",
    bloques: Array.from({ length: cantidadBloques }, (_, indice) =>
      crearBloque(`bloque-${indice + 1}`),
    ),
    creadoEn: CREADO_EN,
  });
}

function datosBloque(): DatosBloqueCortePlanificacion {
  const bloque = crearBloque();
  return {
    id: bloque.id,
    contextoId: bloque.contextoId,
    actividadId: bloque.actividadId,
    titulo: bloque.titulo,
    fecha: bloque.fecha,
    minutosPlanificados: bloque.minutosPlanificados,
    politica: bloque.politica,
    creadoEn: bloque.creadoEn,
  };
}

describe("cortes de planificación", () => {
  it("crea un borrador como instantánea independiente de sus bloques", () => {
    const corte = crearCorte();
    const bloques = corte.listarBloques();

    expect(corte.estado).toBe("BORRADOR");
    expect(bloques).toHaveLength(1);
    expect(bloques[0]).toMatchObject({
      id: "bloque-1",
      contextoId: "contexto-1",
      minutosPlanificados: 45,
    });
    expect(Object.isFrozen(bloques)).toBe(true);
    expect(Object.isFrozen(bloques[0])).toBe(true);
    expect(Object.isFrozen(bloques[0]!.politica)).toBe(true);
    expect(corte.creadoEn).not.toBe(CREADO_EN);
  });

  it("exige bloques antes de iniciar la revisión", () => {
    const corte = crearCorte(0);

    esperarErrorDominio("CORTE_SIN_BLOQUES", () => corte.iniciarRevision());
    expect(corte.estado).toBe("BORRADOR");
  });

  it("permite revisar y volver a editar sin iniciar la gracia", () => {
    const corte = crearCorte();

    corte.iniciarRevision();
    expect(corte.estado).toBe("EN_REVISION");
    corte.volverABorrador();
    expect(corte.estado).toBe("BORRADOR");
    expect(corte.asignadaEn).toBeUndefined();
  });

  it("declara explícitamente las transiciones inválidas", () => {
    const corte = crearCorte();

    esperarErrorDominio("TRANSICION_CORTE_INVALIDA", () =>
      corte.asignar(ASIGNADA_EN),
    );
    corte.iniciarRevision();
    esperarErrorDominio("CORTE_NO_EDITABLE", () =>
      corte.reemplazarBloques([crearBloque("nuevo")]),
    );
    corte.asignar(ASIGNADA_EN);
    esperarErrorDominio("TRANSICION_CORTE_INVALIDA", () =>
      corte.iniciarRevision(),
    );
  });

  it("deriva el vencimiento desde el instante de asignación", () => {
    const corte = crearCorte();

    corte.iniciarRevision();
    corte.asignar(ASIGNADA_EN);

    expect(DURACION_GRACIA_MINUTOS).toBe(10);
    expect(corte.estado).toBe("EN_GRACIA");
    expect(corte.asignadaEn?.toISOString()).toBe(ASIGNADA_EN.toISOString());
    expect(corte.confirmarAutomaticamenteEn?.toISOString()).toBe(
      CONFIRMAR_EN.toISOString(),
    );
    expect(corte.confirmadaEn).toBeUndefined();
  });

  it("confirma en el límite exacto y conserva como autoridad el instante previsto", () => {
    const corte = crearCorte();
    corte.iniciarRevision();
    corte.asignar(ASIGNADA_EN);

    expect(
      corte.actualizarSegunReloj(new Date("2026-07-20T10:09:59.999Z")),
    ).toBe(false);
    expect(corte.estado).toBe("EN_GRACIA");
    expect(corte.actualizarSegunReloj(CONFIRMAR_EN)).toBe(true);
    expect(corte.estado).toBe("CONFIRMADA");
    expect(corte.confirmadaEn?.toISOString()).toBe(CONFIRMAR_EN.toISOString());
    expect(
      corte.actualizarSegunReloj(new Date("2026-07-20T11:00:00.000Z")),
    ).toBe(false);
  });

  it("permite corregir durante la gracia y obliga a revisar nuevamente", () => {
    const corte = crearCorte();
    corte.iniciarRevision();
    corte.asignar(ASIGNADA_EN);

    corte.corregir(new Date("2026-07-20T10:09:59.999Z"));

    expect(corte.estado).toBe("BORRADOR");
    expect(corte.asignadaEn).toBeUndefined();
    expect(corte.confirmarAutomaticamenteEn).toBeUndefined();
    corte.reemplazarBloques([crearBloque("bloque-corregido")]);
    expect(corte.listarBloques()[0]?.id).toBe("bloque-corregido");
  });

  it("materializa la confirmación antes de rechazar una corrección vencida", () => {
    const corte = crearCorte();
    corte.iniciarRevision();
    corte.asignar(ASIGNADA_EN);

    esperarErrorDominio("CORTE_NO_CORREGIBLE", () =>
      corte.corregir(CONFIRMAR_EN),
    );

    expect(corte.estado).toBe("CONFIRMADA");
    esperarErrorDominio("CORTE_NO_EDITABLE", () =>
      corte.reemplazarBloques([crearBloque("otro")]),
    );
  });

  it("reanuda una gracia rehidratada sin reiniciar ni extender su plazo", () => {
    const corte = CortePlanificacion.rehidratar({
      id: "corte-rehidratado",
      bloques: [datosBloque()],
      estado: "EN_GRACIA",
      creadoEn: CREADO_EN,
      asignadaEn: ASIGNADA_EN,
      confirmarAutomaticamenteEn: CONFIRMAR_EN,
    });

    const vencimientoRecuperado = corte.confirmarAutomaticamenteEn;
    expect(
      corte.actualizarSegunReloj(new Date("2026-07-20T10:25:00.000Z")),
    ).toBe(true);
    expect(vencimientoRecuperado?.toISOString()).toBe(
      CONFIRMAR_EN.toISOString(),
    );
    expect(corte.confirmadaEn?.toISOString()).toBe(CONFIRMAR_EN.toISOString());
  });

  it("rechaza cortes rehidratados temporalmente incoherentes", () => {
    esperarErrorDominio("CORTE_REHIDRATADO_INVALIDO", () =>
      CortePlanificacion.rehidratar({
        id: "corte-invalido",
        bloques: [datosBloque()],
        estado: "EN_GRACIA",
        creadoEn: CREADO_EN,
        asignadaEn: ASIGNADA_EN,
        confirmarAutomaticamenteEn: new Date("2026-07-20T10:11:00.000Z"),
      }),
    );
    esperarErrorDominio("CORTE_REHIDRATADO_INVALIDO", () =>
      CortePlanificacion.rehidratar({
        id: "corte-invalido",
        bloques: [datosBloque()],
        estado: "CONFIRMADA",
        creadoEn: CREADO_EN,
        asignadaEn: ASIGNADA_EN,
        confirmarAutomaticamenteEn: CONFIRMAR_EN,
        confirmadaEn: new Date("2026-07-20T10:12:00.000Z"),
      }),
    );
  });

  it("rechaza selecciones duplicadas y retrocesos del reloj", () => {
    esperarErrorDominio("BLOQUE_CORTE_DUPLICADO", () =>
      CortePlanificacion.crear({
        id: "corte-duplicado",
        bloques: [crearBloque(), crearBloque()],
        creadoEn: CREADO_EN,
      }),
    );

    const corte = crearCorte();
    corte.iniciarRevision();
    esperarErrorDominio("ASIGNACION_ANTERIOR_A_CREACION", () =>
      corte.asignar(new Date("2026-07-20T08:59:59.999Z")),
    );
    corte.asignar(ASIGNADA_EN);
    esperarErrorDominio("RELOJ_ANTERIOR_A_ASIGNACION", () =>
      corte.actualizarSegunReloj(new Date("2026-07-20T09:59:59.999Z")),
    );
  });
});
