import {
  CasoDeUsoAsignarCortePlanificacion,
  CasoDeUsoAsignarActividad,
  CasoDeUsoConsultarCalendario,
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
  CasoDeUsoRevisarCortePlanificacion,
  CasoDeUsoSincronizarCortesPlanificacion,
} from "../aplicacion";
import { RepositorioActividadesIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioActividadesIndexedDB";
import { RepositorioAgendasIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioAgendasIndexedDB";
import { RepositorioBloquesPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioBloquesPlanificacionIndexedDB";
import { RepositorioContextosPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioContextosPlanificacionIndexedDB";
import { RepositorioCortesPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioCortesPlanificacionIndexedDB";
import { MigradorContextosDesdeAgendasIndexedDB } from "../infraestructura/persistencia/indexeddb/MigradorContextosDesdeAgendasIndexedDB";
import { TransaccionEliminacionContextoPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/TransaccionEliminacionContextoPlanificacionIndexedDB";
import { CalendarioLocalSistema } from "../infraestructura/sistema/CalendarioLocalSistema";
import { GeneradorIdentificadoresUUID } from "../infraestructura/sistema/GeneradorIdentificadoresUUID";
import { RelojSistema } from "../infraestructura/sistema/RelojSistema";
import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";
import type { ServiciosCalendario } from "../presentacion/calendario/ServiciosCalendario";

let servicios: ServiciosAgendaBorrador | undefined;
let serviciosCalendario: ServiciosCalendario | undefined;
let inicializacionPendiente: Promise<void> | undefined;
let repositorioContextos:
  RepositorioContextosPlanificacionIndexedDB | undefined;
let repositorioActividades: RepositorioActividadesIndexedDB | undefined;
let repositorioAgendas: RepositorioAgendasIndexedDB | undefined;
let repositorioBloques: RepositorioBloquesPlanificacionIndexedDB | undefined;
let repositorioCortes: RepositorioCortesPlanificacionIndexedDB | undefined;
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

function obtenerTransaccionEliminacion(): TransaccionEliminacionContextoPlanificacionIndexedDB {
  transaccionEliminacion ??=
    new TransaccionEliminacionContextoPlanificacionIndexedDB();
  return transaccionEliminacion;
}
