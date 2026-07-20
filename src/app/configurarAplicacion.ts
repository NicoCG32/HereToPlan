import {
  CasoDeUsoAsignarCortePlanificacion,
  CasoDeUsoAsignarActividad,
  CasoDeUsoCanjearDiaLibre,
  CasoDeUsoConsultarCalendario,
  CasoDeUsoConsultarBilletera,
  CasoDeUsoCorregirCortePlanificacion,
  CasoDeUsoConsultarImpactoEliminacionContexto,
  CasoDeUsoCrearActividad,
  CasoDeUsoCrearAgendaBorrador,
  CasoDeUsoCrearContextoNombrado,
  CasoDeUsoEditarBloquePlanificacion,
  CasoDeUsoEliminarContextoPlanificacion,
  CasoDeUsoEliminarBloquePlanificacion,
  CasoDeUsoGuardarBloquesAgendaBorrador,
  CasoDeUsoInicializarContextosPlanificacion,
  CasoDeUsoListarAgendasBorrador,
  CasoDeUsoListarContextosPlanificacion,
  CasoDeUsoListarCanjesDiaLibre,
  CasoDeUsoCompletarBloquePlanificacion,
  CasoDeUsoCompletarBloqueConPuntos,
  CasoDeUsoMarcarBloqueIncumplido,
  CasoDeUsoPrepararCanjeDiaLibre,
  CasoDeUsoRevisarCortePlanificacion,
  CasoDeUsoSincronizarCortesPlanificacion,
  CasoDeUsoConsultarCronometroBloque,
  CasoDeUsoGestionarSesionCronometro,
} from "../aplicacion";
import { DefinicionRecompensa, FormulaPuntosBloque } from "../dominio";
import { RepositorioActividadesIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioActividadesIndexedDB";
import { RepositorioAgendasIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioAgendasIndexedDB";
import { RepositorioBloquesPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioBloquesPlanificacionIndexedDB";
import { RepositorioContextosPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioContextosPlanificacionIndexedDB";
import { RepositorioCortesPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioCortesPlanificacionIndexedDB";
import { RepositorioResolucionesBloquesPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioResolucionesBloquesPlanificacionIndexedDB";
import { RepositorioTransaccionesPuntosIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioTransaccionesPuntosIndexedDB";
import { MigradorContextosDesdeAgendasIndexedDB } from "../infraestructura/persistencia/indexeddb/MigradorContextosDesdeAgendasIndexedDB";
import { TransaccionEliminacionContextoPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/TransaccionEliminacionContextoPlanificacionIndexedDB";
import { TransaccionCompletarBloqueConPuntosIndexedDB } from "../infraestructura/persistencia/indexeddb/TransaccionCompletarBloqueConPuntosIndexedDB";
import { UnidadTrabajoCanjeDiaLibreIndexedDB } from "../infraestructura/persistencia/indexeddb/UnidadTrabajoCanjeDiaLibreIndexedDB";
import { RepositorioSesionesCronometroIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioSesionesCronometroIndexedDB";
import { CalendarioLocalSistema } from "../infraestructura/sistema/CalendarioLocalSistema";
import { GeneradorIdentificadoresUUID } from "../infraestructura/sistema/GeneradorIdentificadoresUUID";
import { RelojSistema } from "../infraestructura/sistema/RelojSistema";
import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";
import type { ServiciosCalendario } from "../presentacion/calendario/ServiciosCalendario";
import type { ServiciosPuntos } from "../presentacion/puntos/ServiciosPuntos";
import type { ServiciosRecompensas } from "../presentacion/recompensas/ServiciosRecompensas";

let servicios: ServiciosAgendaBorrador | undefined;
let serviciosCalendario: ServiciosCalendario | undefined;
let serviciosResolucionBloques: ServiciosResolucionBloques | undefined;
let serviciosPuntos: ServiciosPuntos | undefined;
let serviciosRecompensas: ServiciosRecompensas | undefined;
let inicializacionPendiente: Promise<void> | undefined;
let repositorioContextos:
  RepositorioContextosPlanificacionIndexedDB | undefined;
let repositorioActividades: RepositorioActividadesIndexedDB | undefined;
let repositorioAgendas: RepositorioAgendasIndexedDB | undefined;
let repositorioBloques: RepositorioBloquesPlanificacionIndexedDB | undefined;
let repositorioCortes: RepositorioCortesPlanificacionIndexedDB | undefined;
let repositorioResoluciones:
  RepositorioResolucionesBloquesPlanificacionIndexedDB | undefined;
let repositorioTransaccionesPuntos:
  RepositorioTransaccionesPuntosIndexedDB | undefined;
let transaccionEliminacion:
  TransaccionEliminacionContextoPlanificacionIndexedDB | undefined;
let unidadTrabajoCanjeDiaLibre: UnidadTrabajoCanjeDiaLibreIndexedDB | undefined;
let repositorioSesionesCronometro:
  RepositorioSesionesCronometroIndexedDB | undefined;

export function inicializarAplicacion(): Promise<void> {
  if (!inicializacionPendiente) {
    const reloj = new RelojSistema();
    const repositorio = obtenerRepositorioContextos();
    inicializacionPendiente = new MigradorContextosDesdeAgendasIndexedDB()
      .ejecutar(reloj.ahora())
      .then(() =>
        new CasoDeUsoInicializarContextosPlanificacion(
          repositorio,
          reloj,
        ).ejecutar(),
      )
      .then(() =>
        new CasoDeUsoSincronizarCortesPlanificacion(
          obtenerRepositorioCortes(),
          reloj,
        ).ejecutar(),
      )
      .then(() => undefined);
  }
  return inicializacionPendiente;
}

export function obtenerServiciosCalendario(): ServiciosCalendario {
  serviciosCalendario ??= crearServiciosCalendario();
  return serviciosCalendario;
}

export function obtenerServiciosPuntos(): ServiciosPuntos {
  serviciosPuntos ??= Object.freeze({
    consultarBilletera: new CasoDeUsoConsultarBilletera(
      obtenerRepositorioTransaccionesPuntos(),
    ),
  });
  return serviciosPuntos;
}

export function obtenerServiciosRecompensas(): ServiciosRecompensas {
  if (serviciosRecompensas) return serviciosRecompensas;
  const unidad = obtenerUnidadTrabajoCanjeDiaLibre();
  const recompensa = crearDefinicionDiaLibre();
  const dependenciasLectura = {
    repositorioCortes: obtenerRepositorioCortes(),
    repositorioResoluciones: obtenerRepositorioResoluciones(),
    repositorioTransacciones: obtenerRepositorioTransaccionesPuntos(),
    repositorioAjustes: unidad,
    repositorioContextos: obtenerRepositorioContextos(),
    calendarioLocal: new CalendarioLocalSistema(),
    recompensa,
  };
  const generador = new GeneradorIdentificadoresUUID();
  serviciosRecompensas = Object.freeze({
    prepararDiaLibre: new CasoDeUsoPrepararCanjeDiaLibre(dependenciasLectura),
    canjearDiaLibre: new CasoDeUsoCanjearDiaLibre({
      ...dependenciasLectura,
      repositorioCanjes: unidad,
      unidadTrabajo: unidad,
      reloj: new RelojSistema(),
      generadorIdentificadores: generador,
    }),
    listarCanjes: new CasoDeUsoListarCanjesDiaLibre({
      ...dependenciasLectura,
      repositorioCanjes: unidad,
    }),
    generarOperacionId: () => generador.generar(),
  });
  return serviciosRecompensas;
}

export interface ServiciosResolucionBloques {
  readonly completarBloque: CasoDeUsoCompletarBloquePlanificacion;
  readonly marcarBloqueIncumplido: CasoDeUsoMarcarBloqueIncumplido;
}

export function obtenerServiciosResolucionBloques(): ServiciosResolucionBloques {
  serviciosResolucionBloques ??= crearServiciosResolucionBloques();
  return serviciosResolucionBloques;
}

export function obtenerServiciosAplicacion(): ServiciosAgendaBorrador {
  servicios ??= crearServiciosAplicacion();
  return servicios;
}

function crearServiciosAplicacion(): ServiciosAgendaBorrador {
  const repositorio = obtenerRepositorioAgendas();
  const generadorIdentificadores = new GeneradorIdentificadoresUUID();

  return Object.freeze({
    crearAgenda: new CasoDeUsoCrearAgendaBorrador(
      repositorio,
      new RelojSistema(),
      generadorIdentificadores,
    ),
    guardarBloques: new CasoDeUsoGuardarBloquesAgendaBorrador(
      repositorio,
      generadorIdentificadores,
    ),
    listarAgendas: new CasoDeUsoListarAgendasBorrador(repositorio),
  });
}

function crearServiciosCalendario(): ServiciosCalendario {
  const contextos = obtenerRepositorioContextos();
  const actividades = obtenerRepositorioActividades();
  const agendas = obtenerRepositorioAgendas();
  const bloques = obtenerRepositorioBloques();
  const cortes = obtenerRepositorioCortes();
  const resoluciones = obtenerRepositorioResoluciones();
  const reloj = new RelojSistema();
  const generador = new GeneradorIdentificadoresUUID();
  const eliminacion = obtenerTransaccionEliminacion();
  const sesionesCronometro = obtenerRepositorioSesionesCronometro();
  const ajustes = obtenerUnidadTrabajoCanjeDiaLibre();
  return Object.freeze({
    crearContexto: new CasoDeUsoCrearContextoNombrado(
      contextos,
      reloj,
      generador,
    ),
    listarContextos: new CasoDeUsoListarContextosPlanificacion(contextos),
    consultarCalendario: new CasoDeUsoConsultarCalendario(
      contextos,
      actividades,
      agendas,
      bloques,
      cortes,
      resoluciones,
      new CalendarioLocalSistema(),
      ajustes,
    ),
    revisarCorte: new CasoDeUsoRevisarCortePlanificacion(bloques, cortes),
    asignarCorte: new CasoDeUsoAsignarCortePlanificacion(
      bloques,
      cortes,
      reloj,
      generador,
    ),
    corregirCorte: new CasoDeUsoCorregirCortePlanificacion(cortes, reloj),
    sincronizarCortes: new CasoDeUsoSincronizarCortesPlanificacion(
      cortes,
      reloj,
    ),
    crearActividad: new CasoDeUsoCrearActividad(actividades, reloj, generador),
    asignarActividad: new CasoDeUsoAsignarActividad(
      bloques,
      actividades,
      contextos,
      reloj,
      generador,
    ),
    editarBloque: new CasoDeUsoEditarBloquePlanificacion(
      bloques,
      contextos,
      cortes,
    ),
    eliminarBloque: new CasoDeUsoEliminarBloquePlanificacion(bloques, cortes),
    consultarImpactoEliminacion:
      new CasoDeUsoConsultarImpactoEliminacionContexto(contextos, eliminacion),
    eliminarContexto: new CasoDeUsoEliminarContextoPlanificacion(
      contextos,
      eliminacion,
    ),
    completarBloque: new CasoDeUsoCompletarBloqueConPuntos(
      cortes,
      resoluciones,
      new TransaccionCompletarBloqueConPuntosIndexedDB(),
      reloj,
      generador,
      new FormulaPuntosBloque(),
    ),
    marcarBloqueIncumplido: new CasoDeUsoMarcarBloqueIncumplido(
      cortes,
      resoluciones,
      reloj,
    ),
    consultarCronometro: new CasoDeUsoConsultarCronometroBloque(
      sesionesCronometro,
      reloj,
    ),
    gestionarCronometro: new CasoDeUsoGestionarSesionCronometro({
      repositorioSesiones: sesionesCronometro,
      repositorioCortes: cortes,
      repositorioResoluciones: resoluciones,
      repositorioAjustes: ajustes,
      reloj,
      generadorIdentificadores: generador,
    }),
    generarOperacionId: () => generador.generar(),
  });
}

function crearServiciosResolucionBloques(): ServiciosResolucionBloques {
  const cortes = obtenerRepositorioCortes();
  const resoluciones = obtenerRepositorioResoluciones();
  const reloj = new RelojSistema();
  return Object.freeze({
    completarBloque: new CasoDeUsoCompletarBloquePlanificacion(
      cortes,
      resoluciones,
      reloj,
    ),
    marcarBloqueIncumplido: new CasoDeUsoMarcarBloqueIncumplido(
      cortes,
      resoluciones,
      reloj,
    ),
  });
}

function obtenerRepositorioContextos(): RepositorioContextosPlanificacionIndexedDB {
  repositorioContextos ??= new RepositorioContextosPlanificacionIndexedDB();
  return repositorioContextos;
}

function obtenerRepositorioActividades(): RepositorioActividadesIndexedDB {
  repositorioActividades ??= new RepositorioActividadesIndexedDB();
  return repositorioActividades;
}

function obtenerRepositorioAgendas(): RepositorioAgendasIndexedDB {
  repositorioAgendas ??= new RepositorioAgendasIndexedDB();
  return repositorioAgendas;
}

function obtenerRepositorioBloques(): RepositorioBloquesPlanificacionIndexedDB {
  repositorioBloques ??= new RepositorioBloquesPlanificacionIndexedDB();
  return repositorioBloques;
}

function obtenerRepositorioCortes(): RepositorioCortesPlanificacionIndexedDB {
  repositorioCortes ??= new RepositorioCortesPlanificacionIndexedDB();
  return repositorioCortes;
}

function obtenerRepositorioResoluciones(): RepositorioResolucionesBloquesPlanificacionIndexedDB {
  repositorioResoluciones ??=
    new RepositorioResolucionesBloquesPlanificacionIndexedDB();
  return repositorioResoluciones;
}

function obtenerRepositorioTransaccionesPuntos(): RepositorioTransaccionesPuntosIndexedDB {
  repositorioTransaccionesPuntos ??=
    new RepositorioTransaccionesPuntosIndexedDB();
  return repositorioTransaccionesPuntos;
}

function obtenerTransaccionEliminacion(): TransaccionEliminacionContextoPlanificacionIndexedDB {
  transaccionEliminacion ??=
    new TransaccionEliminacionContextoPlanificacionIndexedDB();
  return transaccionEliminacion;
}

function obtenerUnidadTrabajoCanjeDiaLibre(): UnidadTrabajoCanjeDiaLibreIndexedDB {
  unidadTrabajoCanjeDiaLibre ??= new UnidadTrabajoCanjeDiaLibreIndexedDB();
  return unidadTrabajoCanjeDiaLibre;
}

function obtenerRepositorioSesionesCronometro(): RepositorioSesionesCronometroIndexedDB {
  repositorioSesionesCronometro ??=
    new RepositorioSesionesCronometroIndexedDB();
  return repositorioSesionesCronometro;
}

function crearDefinicionDiaLibre(): DefinicionRecompensa {
  return new DefinicionRecompensa({
    id: "dia-libre",
    nombre: "Día libre",
    descripcion:
      "Excusa todos los compromisos flexibles personales elegibles de una fecha futura.",
    costoPuntos: 1500,
    tipoEfecto: "DIA_LIBRE",
  });
}
