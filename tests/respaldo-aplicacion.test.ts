import { describe, expect, it } from "vitest";
import {
  CasoDeUsoAnalizarImportacionRespaldo,
  CasoDeUsoExportarRespaldo,
  COLECCIONES_RESPALDO,
  ErrorExportacionRespaldo,
  IDENTIFICADOR_FORMATO_RESPALDO,
  type ContenidoRespaldo,
  type EstadoPersistenteRespaldable,
  type LectorEstadoPersistente,
  type Reloj,
} from "../src/aplicacion";

describe("contrato y exportación de respaldo", () => {
  it("exporta todo el estado con identificación y versión inequívocas", async () => {
    const base = estadoVacio();
    const estado = {
      ...base,
      colecciones: {
        ...base.colecciones,
        "contextos-planificacion": Object.freeze([contextoValido]),
      },
    };
    const exportar = new CasoDeUsoExportarRespaldo(
      lectorQueDevuelve(estado),
      relojFijo,
    );

    const archivo = await exportar.ejecutar();
    const documento = JSON.parse(archivo.contenido) as Record<string, unknown>;

    expect(archivo.nombre).toBe(
      "heretoplan-respaldo-2026-07-20T15-30-00.000Z.json",
    );
    expect(documento).toMatchObject({
      formato: IDENTIFICADOR_FORMATO_RESPALDO,
      versionFormato: 1,
      creadoEn: "2026-07-20T15:30:00.000Z",
      origen: { aplicacion: "HereToPlan", versionBaseDatos: 10 },
    });
    expect(Object.keys(documento.contenido as object)).toEqual(
      COLECCIONES_RESPALDO,
    );
    expect(archivo.respaldo.contenido["contextos-planificacion"]).toEqual([
      contextoValido,
    ]);
  });

  it("distingue un error de lectura y conserva su causa", async () => {
    const causa = new Error("fallo IndexedDB");
    const exportar = new CasoDeUsoExportarRespaldo(
      {
        leerEstadoCompleto: () => Promise.reject(causa),
      },
      relojFijo,
    );

    await expect(exportar.ejecutar()).rejects.toMatchObject({
      codigo: "LECTURA_ESTADO_FALLIDA",
      causa,
    } satisfies Partial<ErrorExportacionRespaldo>);
  });

  it("informa una serialización fallida sin alterar el estado leído", async () => {
    const base = estadoVacio();
    const estado = {
      ...base,
      colecciones: {
        ...base.colecciones,
        agendas: Object.freeze([
          { id: "cíclico", versionEsquema: 1, valor: 1n },
        ]),
      },
    };
    const exportar = new CasoDeUsoExportarRespaldo(
      lectorQueDevuelve(estado),
      relojFijo,
    );

    await expect(exportar.ejecutar()).rejects.toMatchObject({
      codigo: "SERIALIZACION_FALLIDA",
    } satisfies Partial<ErrorExportacionRespaldo>);
    expect(estado.colecciones.agendas[0]?.id).toBe("cíclico");
  });
});

describe("análisis no destructivo de importación", () => {
  const analizar = new CasoDeUsoAnalizarImportacionRespaldo();

  it("reconoce un respaldo válido y cuenta todas las colecciones", () => {
    const documento = respaldoVacio();
    documento.contenido["contextos-planificacion"] = [contextoValido];

    const resultado = analizar.ejecutar(JSON.stringify(documento));

    expect(resultado).toMatchObject({
      estado: "VALIDO",
      versionFormato: 1,
      versionBaseDatos: 10,
      creadoEn: "2026-07-20T15:30:00.000Z",
      errores: [],
      advertencias: [],
    });
    expect(resultado.contenidoReconocido).toHaveLength(
      COLECCIONES_RESPALDO.length,
    );
    expect(resultado.contenidoReconocido).toContainEqual({
      coleccion: "contextos-planificacion",
      cantidad: 1,
    });
  });

  it.each([
    ["JSON truncado", "{", "INVALIDO", "documento JSON válido"],
    ["raíz escalar", "[]", "INVALIDO", "raíz del respaldo"],
    [
      "identificador ajeno",
      JSON.stringify({ formato: "Otro", versionFormato: 1 }),
      "INVALIDO",
      "identificador de formato",
    ],
    [
      "versión ausente",
      JSON.stringify({ formato: IDENTIFICADOR_FORMATO_RESPALDO }),
      "INVALIDO",
      "versión del formato",
    ],
    [
      "versión futura",
      JSON.stringify({
        formato: IDENTIFICADOR_FORMATO_RESPALDO,
        versionFormato: 2,
      }),
      "INCOMPATIBLE",
      "versión 2 no es compatible",
    ],
  ])("rechaza %s con causa explícita", (_caso, texto, estado, causa) => {
    const resultado = analizar.ejecutar(texto);

    expect(resultado.estado).toBe(estado);
    expect(resultado.errores.join(" ")).toContain(causa);
  });

  it("rechaza metadatos obligatorios y colecciones ausentes o mal formadas", () => {
    const documento = respaldoVacio();
    documento.creadoEn = "ayer";
    documento.origen = { aplicacion: "Otra", versionBaseDatos: 0 };
    delete documento.contenido.agendas;
    documento.contenido.actividades = {};

    const resultado = analizar.ejecutar(JSON.stringify(documento));

    expect(resultado.estado).toBe("INVALIDO");
    expect(resultado.errores).toEqual(
      expect.arrayContaining([
        "creadoEn debe ser un instante ISO válido.",
        'origen.aplicacion debe ser "HereToPlan".',
        "origen.versionBaseDatos debe ser un entero positivo.",
        "contenido.agendas debe ser un arreglo.",
        "contenido.actividades debe ser un arreglo.",
      ]),
    );
  });

  it("rechaza registros incompatibles, incompletos y claves duplicadas", () => {
    const documento = respaldoVacio();
    documento.contenido["contextos-planificacion"] = [
      contextoValido,
      { ...contextoValido },
      { versionEsquema: 2, id: "futuro" },
      null,
    ];

    const resultado = analizar.ejecutar(JSON.stringify(documento));

    expect(resultado.estado).toBe("INCOMPATIBLE");
    expect(resultado.errores.join(" ")).toContain("está duplicado");
    expect(resultado.errores.join(" ")).toContain("versionEsquema debe ser 1");
    expect(resultado.errores.join(" ")).toContain(".nombre es obligatorio");
    expect(resultado.errores.join(" ")).toContain("[3] debe ser un objeto");
  });

  it("distingue un registro inválido sin versión de otro con versión incompatible", () => {
    const documento = respaldoVacio();
    documento.contenido["contextos-planificacion"] = [
      { ...contextoValido, versionEsquema: undefined },
    ];

    const resultado = analizar.ejecutar(JSON.stringify(documento));

    expect(resultado.estado).toBe("INVALIDO");
    expect(resultado.errores).toContain(
      "contenido.contextos-planificacion[0].versionEsquema es obligatorio.",
    );
  });

  it("valida la forma de los metadatos opcionales", () => {
    const documento = respaldoVacio();
    documento.metadatos = { nota: 12 };
    const notaInvalida = analizar.ejecutar(JSON.stringify(documento));
    documento.metadatos = "texto";
    const objetoInvalido = analizar.ejecutar(JSON.stringify(documento));

    expect(notaInvalida.estado).toBe("INVALIDO");
    expect(notaInvalida.errores).toContain(
      "metadatos.nota debe ser una cadena cuando está presente.",
    );
    expect(objetoInvalido.errores).toContain(
      "metadatos debe ser un objeto cuando está presente.",
    );
  });

  it("advierte sobre campos y colecciones desconocidos sin invalidar lo reconocido", () => {
    const documento = respaldoVacio();
    documento.campoFuturo = true;
    documento.contenido["coleccion-futura"] = [];

    const resultado = analizar.ejecutar(JSON.stringify(documento));

    expect(resultado.estado).toBe("VALIDO");
    expect(resultado.advertencias).toEqual([
      'La colección "coleccion-futura" no es reconocida y no sería procesada.',
      'El campo raíz "campoFuturo" no es reconocido.',
    ]);
  });
});

const contextoValido = Object.freeze({
  versionEsquema: 1,
  id: "contexto-1",
  nombre: "Semestre",
  tipo: "NOMBRADO",
  creadaEn: "2026-07-01T10:00:00.000Z",
});

const relojFijo: Reloj = {
  ahora: () => new Date("2026-07-20T15:30:00.000Z"),
};

function lectorQueDevuelve(
  estado: EstadoPersistenteRespaldable,
): LectorEstadoPersistente {
  return { leerEstadoCompleto: () => Promise.resolve(estado) };
}

function estadoVacio(): {
  versionBaseDatos: number;
  colecciones: ContenidoRespaldo;
} {
  return {
    versionBaseDatos: 10,
    colecciones: Object.fromEntries(
      COLECCIONES_RESPALDO.map((nombre) => [nombre, Object.freeze([])]),
    ) as unknown as ContenidoRespaldo,
  };
}

interface DocumentoRespaldoPrueba {
  formato: string;
  versionFormato: number;
  creadoEn: string;
  origen: { aplicacion: string; versionBaseDatos: number };
  contenido: Record<string, unknown>;
  metadatos?: unknown;
  campoFuturo?: unknown;
}

function respaldoVacio(): DocumentoRespaldoPrueba {
  return {
    formato: IDENTIFICADOR_FORMATO_RESPALDO,
    versionFormato: 1,
    creadoEn: "2026-07-20T15:30:00.000Z",
    origen: { aplicacion: "HereToPlan", versionBaseDatos: 10 },
    contenido: Object.fromEntries(
      COLECCIONES_RESPALDO.map((nombre) => [nombre, []]),
    ),
  };
}
