import {
  COLECCIONES_RESPALDO,
  IDENTIFICADOR_FORMATO_RESPALDO,
  VERSION_FORMATO_RESPALDO,
  type NombreColeccionRespaldo,
} from "./ContratoRespaldo";

export type EstadoAnalisisRespaldo = "VALIDO" | "INVALIDO" | "INCOMPATIBLE";

export interface ConteoColeccionRespaldo {
  readonly coleccion: NombreColeccionRespaldo;
  readonly cantidad: number;
}

export interface ResultadoAnalisisRespaldo {
  readonly estado: EstadoAnalisisRespaldo;
  readonly versionFormato?: number;
  readonly versionBaseDatos?: number;
  readonly creadoEn?: string;
  readonly contenidoReconocido: readonly ConteoColeccionRespaldo[];
  readonly advertencias: readonly string[];
  readonly errores: readonly string[];
}

type TipoCampo = "cadena" | "numero" | "arreglo" | "objeto";

const CAMPOS_OBLIGATORIOS: Readonly<
  Record<NombreColeccionRespaldo, Readonly<Record<string, TipoCampo>>>
> = {
  agendas: {
    id: "cadena",
    nombre: "cadena",
    fechaInicio: "cadena",
    fechaFin: "cadena",
    creadaEn: "cadena",
    estado: "cadena",
    bloques: "arreglo",
    ajustes: "arreglo",
  },
  actividades: {
    id: "cadena",
    titulo: "cadena",
    creadaEn: "cadena",
    tiempoNecesarioMinutos: "numero",
    tipo: "cadena",
  },
  "contextos-planificacion": {
    id: "cadena",
    nombre: "cadena",
    tipo: "cadena",
    creadaEn: "cadena",
  },
  "bloques-planificacion": {
    id: "cadena",
    contextoId: "cadena",
    actividadId: "cadena",
    titulo: "cadena",
    fecha: "cadena",
    minutosPlanificados: "numero",
    politica: "objeto",
    creadoEn: "cadena",
  },
  "cortes-planificacion": {
    id: "cadena",
    estado: "cadena",
    creadoEn: "cadena",
    bloques: "arreglo",
  },
  "resoluciones-bloques-planificacion": {
    bloqueId: "cadena",
    operacionId: "cadena",
    resultado: "cadena",
    resueltoEn: "cadena",
  },
  "transacciones-puntos": {
    id: "cadena",
    tipo: "cadena",
    cantidad: "numero",
    fuenteTipo: "cadena",
    fuenteId: "cadena",
    descripcion: "cadena",
    ocurridaEn: "cadena",
  },
  "canjes-recompensas": {
    id: "cadena",
    recompensaId: "cadena",
    puntosGastados: "numero",
    canjeadoEn: "cadena",
    fechaObjetivo: "cadena",
    bloquesAfectados: "arreglo",
  },
  "ajustes-compromisos": {
    id: "cadena",
    bloqueId: "cadena",
    canjeRecompensaId: "cadena",
    tipo: "cadena",
    aplicadoEn: "cadena",
  },
  "sesiones-cronometro": {
    id: "cadena",
    bloqueId: "cadena",
    estado: "cadena",
    revision: "numero",
    operaciones: "arreglo",
    operacionesIds: "arreglo",
  },
  "movimientos-recuperacion": {
    id: "cadena",
    operacionId: "cadena",
    tipo: "cadena",
    minutos: "numero",
    bloqueFuenteId: "cadena",
    fechaFuente: "cadena",
    descripcion: "cadena",
    ocurridoEn: "cadena",
  },
  "reducciones-carga": {
    id: "cadena",
    operacionId: "cadena",
    movimientoId: "cadena",
    bloqueId: "cadena",
    minutosReducidos: "numero",
    aplicadaEn: "cadena",
  },
};

export class CasoDeUsoAnalizarImportacionRespaldo {
  public ejecutar(texto: string): ResultadoAnalisisRespaldo {
    let valor: unknown;
    try {
      valor = JSON.parse(texto) as unknown;
    } catch {
      return resultado(
        "INVALIDO",
        [],
        [],
        ["El archivo no contiene un documento JSON válido."],
      );
    }

    if (!esObjeto(valor)) {
      return resultado(
        "INVALIDO",
        [],
        [],
        ["La raíz del respaldo debe ser un objeto JSON."],
      );
    }

    const versionFormato = enteroPositivo(valor.versionFormato);
    if (valor.formato !== IDENTIFICADOR_FORMATO_RESPALDO) {
      return resultado(
        "INVALIDO",
        [],
        [],
        [
          `El identificador de formato debe ser "${IDENTIFICADOR_FORMATO_RESPALDO}".`,
        ],
      );
    }
    if (versionFormato === undefined) {
      return resultado(
        "INVALIDO",
        [],
        [],
        [
          "La versión del formato es obligatoria y debe ser un entero positivo.",
        ],
      );
    }
    if (versionFormato !== VERSION_FORMATO_RESPALDO) {
      return resultado(
        "INCOMPATIBLE",
        [],
        [],
        [
          `La versión ${versionFormato} no es compatible; esta aplicación admite la versión ${VERSION_FORMATO_RESPALDO}.`,
        ],
        versionFormato,
      );
    }

    const errores: string[] = [];
    const advertencias: string[] = [];
    const creadoEn = validarInstante(valor.creadoEn, "creadoEn", errores);
    const origen = esObjeto(valor.origen) ? valor.origen : undefined;
    if (!origen) errores.push("El objeto origen es obligatorio.");
    if (origen && origen.aplicacion !== "HereToPlan") {
      errores.push('origen.aplicacion debe ser "HereToPlan".');
    }
    const versionBaseDatos = origen
      ? enteroPositivo(origen.versionBaseDatos)
      : undefined;
    if (origen && versionBaseDatos === undefined) {
      errores.push("origen.versionBaseDatos debe ser un entero positivo.");
    }

    const contenido = esObjeto(valor.contenido) ? valor.contenido : undefined;
    if (!contenido) errores.push("El objeto contenido es obligatorio.");
    const conteos: ConteoColeccionRespaldo[] = [];
    let versionRegistroIncompatible = false;

    if (contenido) {
      for (const coleccion of COLECCIONES_RESPALDO) {
        const registros = contenido[coleccion];
        if (!Array.isArray(registros)) {
          errores.push(`contenido.${coleccion} debe ser un arreglo.`);
          continue;
        }
        conteos.push(Object.freeze({ coleccion, cantidad: registros.length }));
        const claves = new Set<string>();
        registros.forEach((registro, indice) => {
          const ruta = `contenido.${coleccion}[${indice}]`;
          if (!esObjeto(registro)) {
            errores.push(`${ruta} debe ser un objeto.`);
            return;
          }
          if (registro.versionEsquema === undefined) {
            errores.push(`${ruta}.versionEsquema es obligatorio.`);
          } else if (registro.versionEsquema !== 1) {
            versionRegistroIncompatible = true;
            errores.push(`${ruta}.versionEsquema debe ser 1.`);
          }
          validarCamposRegistro(coleccion, registro, ruta, errores);
          const campoClave =
            coleccion === "resoluciones-bloques-planificacion"
              ? "bloqueId"
              : "id";
          const clave = registro[campoClave];
          if (typeof clave === "string" && clave.length > 0) {
            if (claves.has(clave)) {
              errores.push(
                `${ruta}.${campoClave} está duplicado en la colección.`,
              );
            }
            claves.add(clave);
          }
        });
      }

      const conocidas = new Set<string>(COLECCIONES_RESPALDO);
      for (const nombre of Object.keys(contenido)) {
        if (!conocidas.has(nombre)) {
          advertencias.push(
            `La colección "${nombre}" no es reconocida y no sería procesada.`,
          );
        }
      }
    }

    for (const campo of Object.keys(valor)) {
      if (
        ![
          "formato",
          "versionFormato",
          "creadoEn",
          "origen",
          "contenido",
          "metadatos",
        ].includes(campo)
      ) {
        advertencias.push(`El campo raíz "${campo}" no es reconocido.`);
      }
    }

    if (valor.metadatos !== undefined) {
      if (!esObjeto(valor.metadatos)) {
        errores.push("metadatos debe ser un objeto cuando está presente.");
      } else if (
        valor.metadatos.nota !== undefined &&
        typeof valor.metadatos.nota !== "string"
      ) {
        errores.push(
          "metadatos.nota debe ser una cadena cuando está presente.",
        );
      }
    }

    return resultado(
      errores.length === 0
        ? "VALIDO"
        : versionRegistroIncompatible
          ? "INCOMPATIBLE"
          : "INVALIDO",
      conteos,
      advertencias,
      errores,
      versionFormato,
      versionBaseDatos,
      creadoEn,
    );
  }
}

function validarCamposRegistro(
  coleccion: NombreColeccionRespaldo,
  registro: Readonly<Record<string, unknown>>,
  ruta: string,
  errores: string[],
): void {
  for (const [campo, tipo] of Object.entries(CAMPOS_OBLIGATORIOS[coleccion])) {
    if (!cumpleTipo(registro[campo], tipo)) {
      errores.push(
        `${ruta}.${campo} es obligatorio y debe ser de tipo ${tipo}.`,
      );
    }
  }
}

function cumpleTipo(valor: unknown, tipo: TipoCampo): boolean {
  if (tipo === "cadena") return typeof valor === "string" && valor.length > 0;
  if (tipo === "numero")
    return typeof valor === "number" && Number.isFinite(valor);
  if (tipo === "arreglo") return Array.isArray(valor);
  return esObjeto(valor);
}

function validarInstante(
  valor: unknown,
  campo: string,
  errores: string[],
): string | undefined {
  if (
    typeof valor !== "string" ||
    valor.length === 0 ||
    Number.isNaN(Date.parse(valor))
  ) {
    errores.push(`${campo} debe ser un instante ISO válido.`);
    return undefined;
  }
  return valor;
}

function enteroPositivo(valor: unknown): number | undefined {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0
    ? valor
    : undefined;
}

function esObjeto(valor: unknown): valor is Readonly<Record<string, unknown>> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function resultado(
  estado: EstadoAnalisisRespaldo,
  contenidoReconocido: readonly ConteoColeccionRespaldo[],
  advertencias: readonly string[],
  errores: readonly string[],
  versionFormato?: number,
  versionBaseDatos?: number,
  creadoEn?: string,
): ResultadoAnalisisRespaldo {
  return Object.freeze({
    estado,
    ...(versionFormato === undefined ? {} : { versionFormato }),
    ...(versionBaseDatos === undefined ? {} : { versionBaseDatos }),
    ...(creadoEn === undefined ? {} : { creadoEn }),
    contenidoReconocido: Object.freeze([...contenidoReconocido]),
    advertencias: Object.freeze([...advertencias]),
    errores: Object.freeze([...errores]),
  });
}
