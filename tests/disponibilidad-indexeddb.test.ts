import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LectorEstadoPersistenteIndexedDB } from "../src/infraestructura/persistencia/indexeddb/LectorEstadoPersistenteIndexedDB";
import { RepositorioActividadesIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioActividadesIndexedDB";
import { RepositorioAgendasIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioAgendasIndexedDB";
import { RepositorioBloquesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioBloquesPlanificacionIndexedDB";
import { RepositorioContextosPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioContextosPlanificacionIndexedDB";
import { RepositorioCortesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioCortesPlanificacionIndexedDB";
import { RepositorioPerfilUsuarioIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioPerfilUsuarioIndexedDB";
import { RepositorioRecuperacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioRecuperacionIndexedDB";
import { RepositorioResolucionesBloquesPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioResolucionesBloquesPlanificacionIndexedDB";
import { RepositorioSesionesCronometroIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioSesionesCronometroIndexedDB";
import { RepositorioTransaccionesPuntosIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RepositorioTransaccionesPuntosIndexedDB";
import { RestauradorEstadoPersistenteIndexedDB } from "../src/infraestructura/persistencia/indexeddb/RestauradorEstadoPersistenteIndexedDB";
import { MigradorContextosDesdeAgendasIndexedDB } from "../src/infraestructura/persistencia/indexeddb/MigradorContextosDesdeAgendasIndexedDB";
import { TransaccionCompletarBloqueConPuntosIndexedDB } from "../src/infraestructura/persistencia/indexeddb/TransaccionCompletarBloqueConPuntosIndexedDB";
import { TransaccionEliminacionContextoPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/TransaccionEliminacionContextoPlanificacionIndexedDB";
import { UnidadTrabajoAdquisicionRecompensaIndexedDB } from "../src/infraestructura/persistencia/indexeddb/UnidadTrabajoAdquisicionRecompensaIndexedDB";
import { UnidadTrabajoCanjeDiaLibreIndexedDB } from "../src/infraestructura/persistencia/indexeddb/UnidadTrabajoCanjeDiaLibreIndexedDB";
import { UnidadTrabajoReinicioPlanificacionIndexedDB } from "../src/infraestructura/persistencia/indexeddb/UnidadTrabajoReinicioPlanificacionIndexedDB";
import { VERSION_BASE_DATOS } from "../src/infraestructura/persistencia/indexeddb/esquemaBaseDatos";
import {
  ContextoPlanificacion,
  ResolucionBloquePlanificacion,
  TransaccionPuntos,
} from "../src/dominio";

interface Configuracion {
  readonly fabricaIndexedDB?: IDBFactory;
  readonly nombreBaseDatos?: string;
}

interface Consulta {
  readonly ejecutar: () => Promise<unknown>;
  readonly cerrar: () => Promise<void>;
}

interface Escenario {
  readonly nombre: string;
  readonly crear: (configuracion?: Configuracion) => Consulta;
  readonly esperado: unknown;
  readonly informaBloqueo: boolean;
}

function consulta<T extends { cerrar(): Promise<void> }>(
  adaptador: T,
  ejecutar: (adaptador: T) => Promise<unknown>,
): Consulta {
  return {
    ejecutar: () => ejecutar(adaptador),
    cerrar: () => adaptador.cerrar(),
  };
}

const escenarios: readonly Escenario[] = [
  {
    nombre: "actividades",
    crear: (c) =>
      consulta(new RepositorioActividadesIndexedDB(c), (r) => r.listar()),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "agendas",
    crear: (c) =>
      consulta(new RepositorioAgendasIndexedDB(c), (r) => r.listar()),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "bloques",
    crear: (c) =>
      consulta(new RepositorioBloquesPlanificacionIndexedDB(c), (r) =>
        r.listar(),
      ),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "contextos",
    crear: (c) =>
      consulta(new RepositorioContextosPlanificacionIndexedDB(c), (r) =>
        r.listar(),
      ),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "cortes",
    crear: (c) =>
      consulta(new RepositorioCortesPlanificacionIndexedDB(c), (r) =>
        r.listar(),
      ),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "perfil",
    crear: (c) =>
      consulta(new RepositorioPerfilUsuarioIndexedDB(c), (r) => r.obtener()),
    esperado: undefined,
    informaBloqueo: true,
  },
  {
    nombre: "recuperación",
    crear: (c) =>
      consulta(new RepositorioRecuperacionIndexedDB(c), (r) =>
        r.listarMovimientos(),
      ),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "resoluciones",
    crear: (c) =>
      consulta(
        new RepositorioResolucionesBloquesPlanificacionIndexedDB(c),
        (r) => r.listar(),
      ),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "sesiones",
    crear: (c) =>
      consulta(new RepositorioSesionesCronometroIndexedDB(c), (r) =>
        r.obtenerAbierta(),
      ),
    esperado: undefined,
    informaBloqueo: true,
  },
  {
    nombre: "puntos",
    crear: (c) =>
      consulta(new RepositorioTransaccionesPuntosIndexedDB(c), (r) =>
        r.listar(),
      ),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "inventario",
    crear: (c) =>
      consulta(new UnidadTrabajoAdquisicionRecompensaIndexedDB(c), (r) =>
        r.listarAdquiridas(),
      ),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "canjes históricos",
    crear: (c) =>
      consulta(new UnidadTrabajoCanjeDiaLibreIndexedDB(c), (r) =>
        r.listarCanjes(),
      ),
    esperado: [],
    informaBloqueo: true,
  },
  {
    nombre: "respaldo",
    crear: (c) =>
      consulta(new LectorEstadoPersistenteIndexedDB(c), (r) =>
        r.leerEstadoCompleto(),
      ),
    esperado: expect.objectContaining({ versionBaseDatos: VERSION_BASE_DATOS }),
    informaBloqueo: false,
  },
  {
    nombre: "impacto de reinicio",
    crear: (c) =>
      consulta(new UnidadTrabajoReinicioPlanificacionIndexedDB(c), (r) =>
        r.consultarImpacto(),
      ),
    esperado: expect.objectContaining({
      totalEliminaciones: 0,
      totalConservados: 0,
    }),
    informaBloqueo: false,
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("disponibilidad del almacenamiento del navegador", () => {
  it("restaura el perfil mediante la API del navegador sin configuración técnica", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const lector = new LectorEstadoPersistenteIndexedDB();
    const restaurador = new RestauradorEstadoPersistenteIndexedDB();
    try {
      const estado = await lector.leerEstadoCompleto();
      const perfil = {
        versionEsquema: 1,
        id: "perfil-restaurado",
        nombreVisible: "Perfil local",
        creadoEn: "2026-10-10T10:00:00.000Z",
        actualizadoEn: "2026-10-10T10:00:00.000Z",
      };
      await restaurador.reemplazarEstadoCompleto({
        ...estado,
        colecciones: { ...estado.colecciones, "perfil-usuario": [perfil] },
      });
      const recargado = await lector.leerEstadoCompleto();
      expect(recargado.colecciones["perfil-usuario"]).toEqual([perfil]);
      expect(recargado.colecciones["transacciones-puntos"]).toEqual([]);
    } finally {
      await Promise.all([lector.cerrar(), restaurador.cerrar()]);
    }
  });

  it("inicializa Libre mediante la fábrica global y conserva su creación al reintentar", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const migrador = new MigradorContextosDesdeAgendasIndexedDB();
    await migrador.ejecutar(new Date("2026-10-10T10:00:00.000Z"));
    await migrador.ejecutar(new Date("2026-10-11T10:00:00.000Z"));
    const contextos = new RepositorioContextosPlanificacionIndexedDB();
    try {
      const guardados = await contextos.listar();
      expect(guardados).toHaveLength(1);
      expect(guardados[0]).toMatchObject({ tipo: "LIBRE", nombre: "Libre" });
      expect(guardados[0]?.creadaEn.toISOString()).toBe(
        "2026-10-10T10:00:00.000Z",
      );
    } finally {
      await contextos.cerrar();
    }
  });

  it("publica resolución e ingreso juntos con la configuración del navegador", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const transaccion = new TransaccionCompletarBloqueConPuntosIndexedDB();
    const lector = new LectorEstadoPersistenteIndexedDB();
    const instante = new Date("2026-10-10T10:00:00.000Z");
    try {
      await transaccion.confirmar(
        new ResolucionBloquePlanificacion({
          bloqueId: "bloque",
          operacionId: "completar",
          resultado: "COMPLETADO",
          resueltoEn: instante,
        }),
        new TransaccionPuntos({
          id: "ingreso",
          tipo: "INGRESO",
          cantidad: 1,
          fuenteTipo: "COMPROMISO_COMPLETADO",
          fuenteId: "bloque",
          descripcion: "Cumplimiento",
          ocurridaEn: instante,
        }),
      );
      const estado = await lector.leerEstadoCompleto();
      expect(
        estado.colecciones["resoluciones-bloques-planificacion"],
      ).toMatchObject([
        {
          bloqueId: "bloque",
          operacionId: "completar",
          resultado: "COMPLETADO",
        },
      ]);
      expect(estado.colecciones["transacciones-puntos"]).toMatchObject([
        { id: "ingreso", cantidad: 1, fuenteId: "bloque" },
      ]);
    } finally {
      await Promise.all([lector.cerrar(), transaccion.cerrar()]);
    }
  });

  it("calcula la eliminación sin escribir usando la base del navegador", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const contextos = new RepositorioContextosPlanificacionIndexedDB();
    const transaccion =
      new TransaccionEliminacionContextoPlanificacionIndexedDB();
    const contexto = ContextoPlanificacion.crearNombrado({
      id: "proyecto",
      nombre: "Proyecto",
      creadaEn: new Date("2026-10-10T10:00:00.000Z"),
    });
    try {
      await contextos.guardar(contexto);
      await expect(
        transaccion.consultarImpacto(contexto.id),
      ).resolves.toBeDefined();
      await expect(contextos.obtenerPorId(contexto.id)).resolves.toMatchObject({
        nombre: "Proyecto",
      });
    } finally {
      await Promise.all([contextos.cerrar(), transaccion.cerrar()]);
    }
  });

  it.each(escenarios)(
    "$nombre falla explícitamente sin IndexedDB",
    ({ crear }) => {
      vi.stubGlobal("indexedDB", undefined);
      expect(() => crear()).toThrow(/IndexedDB no está disponible/);
    },
  );

  it.each([
    {
      nombre: "restauración",
      crear: () => new RestauradorEstadoPersistenteIndexedDB(),
    },
    {
      nombre: "migración",
      crear: () => new MigradorContextosDesdeAgendasIndexedDB(),
    },
    {
      nombre: "cumplimiento atómico",
      crear: () => new TransaccionCompletarBloqueConPuntosIndexedDB(),
    },
    {
      nombre: "eliminación atómica",
      crear: () => new TransaccionEliminacionContextoPlanificacionIndexedDB(),
    },
  ])("$nombre no dispone de escritura sin IndexedDB", ({ crear }) => {
    vi.stubGlobal("indexedDB", undefined);
    expect(crear).toThrow(/IndexedDB no está disponible/);
  });

  it.each(escenarios)(
    "$nombre utiliza la API del navegador y su base predeterminada",
    async ({ crear, esperado }) => {
      const fabrica = new IDBFactory();
      vi.stubGlobal("indexedDB", fabrica);
      const adaptador = crear();
      try {
        await expect(adaptador.ejecutar()).resolves.toEqual(esperado);
        await expect(fabrica.databases()).resolves.toEqual([
          { name: "here-to-plan", version: VERSION_BASE_DATOS },
        ]);
      } finally {
        await adaptador.cerrar();
      }
    },
  );

  it.each(escenarios)(
    "$nombre rechaza una base de versión futura sin alterarla",
    async ({ crear }) => {
      const fabrica = new IDBFactory();
      const nombreBaseDatos = "datos-de-una-version-futura";
      const anterior = await abrir(
        fabrica,
        nombreBaseDatos,
        VERSION_BASE_DATOS + 1,
        true,
      );
      anterior.close();
      const adaptador = crear({ fabricaIndexedDB: fabrica, nombreBaseDatos });
      await expect(adaptador.ejecutar()).rejects.toBeInstanceOf(Error);
      const conservada = await abrir(
        fabrica,
        nombreBaseDatos,
        VERSION_BASE_DATOS + 1,
      );
      try {
        expect(conservada.version).toBe(VERSION_BASE_DATOS + 1);
        expect(Array.from(conservada.objectStoreNames)).toEqual(["evidencia"]);
        await expect(leerEvidencia(conservada)).resolves.toEqual({
          id: "original",
          valor: "conservar",
        });
      } finally {
        conservada.close();
      }
    },
  );

  it.each(escenarios.filter((e) => e.informaBloqueo))(
    "$nombre informa una actualización bloqueada por otra pestaña",
    async ({ crear }) => {
      const fabrica = new IDBFactory();
      const nombreBaseDatos = "conexion-abierta-en-otra-pestana";
      const anterior = await abrir(
        fabrica,
        nombreBaseDatos,
        VERSION_BASE_DATOS - 1,
      );
      const abrirObservado = vi.spyOn(fabrica, "open");
      const adaptador = crear({ fabricaIndexedDB: fabrica, nombreBaseDatos });
      try {
        await expect(adaptador.ejecutar()).rejects.toThrow(
          /bloquead|conexi|pestañ/i,
        );
      } finally {
        const resultado = abrirObservado.mock.results[0];
        if (resultado?.type === "return") {
          const solicitud = resultado.value;
          const terminada = new Promise<void>((resolve, reject) => {
            solicitud.addEventListener(
              "success",
              () => {
                solicitud.result.close();
                resolve();
              },
              { once: true },
            );
            solicitud.addEventListener(
              "error",
              () =>
                reject(
                  solicitud.error ??
                    new Error("Falló la solicitud IndexedDB de la prueba."),
                ),
              {
                once: true,
              },
            );
          });
          anterior.close();
          await terminada;
        } else {
          anterior.close();
        }
      }
    },
  );
});

function abrir(
  fabrica: IDBFactory,
  nombre: string,
  version: number,
  evidencia = false,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = fabrica.open(nombre, version);
    solicitud.onupgradeneeded = () => {
      if (evidencia)
        solicitud.result
          .createObjectStore("evidencia", { keyPath: "id" })
          .add({ id: "original", valor: "conservar" });
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(
        solicitud.error ??
          new Error("Falló la solicitud IndexedDB de la prueba."),
      );
  });
}

function leerEvidencia(base: IDBDatabase): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const solicitud = base
      .transaction("evidencia")
      .objectStore("evidencia")
      .get("original");
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(
        solicitud.error ??
          new Error("Falló la solicitud IndexedDB de la prueba."),
      );
  });
}
