import {
  CasoDeUsoAsignarCortePlanificacion,
  CasoDeUsoAsignarActividad,
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
  CasoDeUsoCompletarBloquePlanificacion,
  CasoDeUsoCompletarBloqueConPuntos,
  CasoDeUsoMarcarBloqueIncumplido,
  CasoDeUsoRevisarCortePlanificacion,
  CasoDeUsoSincronizarCortesPlanificacion,
} from "../aplicacion";
import { FormulaPuntosBloque } from "../dominio";
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
import { CalendarioLocalSistema } from "../infraestructura/sistema/CalendarioLocalSistema";
import { GeneradorIdentificadoresUUID } from "../infraestructura/sistema/GeneradorIdentificadoresUUID";
import { RelojSistema } from "../infraestructura/sistema/RelojSistema";
import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";
import type { ServiciosCalendario } from "../presentacion/calendario/ServiciosCalendario";
import type { ServiciosPuntos } from "../presentacion/puntos/ServiciosPuntos";

let servicios: ServiciosAgendaBorrador | undefined;
let serviciosCalendario: ServiciosCalendario | undefined;
let serviciosResolucionBloques: ServiciosResolucionBloques | undefined;
let serviciosPuntos: ServiciosPuntos | undefined;
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
