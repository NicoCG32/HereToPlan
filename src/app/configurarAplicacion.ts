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
  CasoDeUsoEditarActividad,
  CasoDeUsoEditarContextoPlanificacion,
  CasoDeUsoEditarBloquePlanificacion,
  CasoDeUsoEliminarContextoPlanificacion,
  CasoDeUsoEliminarActividad,
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
  CasoDeUsoAcreditarRecuperacion,
  CasoDeUsoConsultarBancoRecuperacion,
  CasoDeUsoConsumirRecuperacion,
  CasoDeUsoAnalizarImportacionRespaldo,
  CasoDeUsoExportarRespaldo,
  CasoDeUsoPrepararRestauracionRespaldo,
  CasoDeUsoRestaurarRespaldo,
  CasoDeUsoActualizarPerfilUsuario,
  CasoDeUsoAdquirirRecompensa,
  CasoDeUsoConsultarCatalogoRecompensas,
  CasoDeUsoConsultarInventarioRecompensas,
  CasoDeUsoConsultarPerfilUsuario,
  CasoDeUsoCrearPerfilUsuario,
  CasoDeUsoPrepararAplicacionDiaLibre,
  CasoDeUsoAplicarDiaLibre,
} from "../aplicacion";
import {
  DefinicionRecompensa,
  FormulaPuntosBloque,
  RecompensaDefinida,
} from "../dominio";
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
import { UnidadTrabajoAdquisicionRecompensaIndexedDB } from "../infraestructura/persistencia/indexeddb/UnidadTrabajoAdquisicionRecompensaIndexedDB";
import { RepositorioSesionesCronometroIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioSesionesCronometroIndexedDB";
import { RepositorioRecuperacionIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioRecuperacionIndexedDB";
import { LectorEstadoPersistenteIndexedDB } from "../infraestructura/persistencia/indexeddb/LectorEstadoPersistenteIndexedDB";
import { RestauradorEstadoPersistenteIndexedDB } from "../infraestructura/persistencia/indexeddb/RestauradorEstadoPersistenteIndexedDB";
import { RepositorioPerfilUsuarioIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioPerfilUsuarioIndexedDB";
import {
  descargarArchivoRespaldo,
  leerArchivoRespaldo,
} from "../infraestructura/archivos/ArchivosRespaldoNavegador";
import { CalendarioLocalSistema } from "../infraestructura/sistema/CalendarioLocalSistema";
import { GeneradorIdentificadoresUUID } from "../infraestructura/sistema/GeneradorIdentificadoresUUID";
import { RelojSistema } from "../infraestructura/sistema/RelojSistema";
import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";
import type { ServiciosCalendario } from "../presentacion/calendario/ServiciosCalendario";
import type { ServiciosPuntos } from "../presentacion/puntos/ServiciosPuntos";
import type { ServiciosRecompensas } from "../presentacion/recompensas/ServiciosRecompensas";
import type { ServiciosInventarioRecompensas } from "../presentacion/recompensas/ServiciosInventarioRecompensas";
import type { ServiciosRecuperacion } from "../presentacion/recuperacion/ServiciosRecuperacion";
import type { ServiciosRespaldo } from "../presentacion/respaldo/ServiciosRespaldo";
import type { ServiciosPerfil } from "../presentacion/perfil/ServiciosPerfil";

let servicios: ServiciosAgendaBorrador | undefined;
let serviciosCalendario: ServiciosCalendario | undefined;
let serviciosResolucionBloques: ServiciosResolucionBloques | undefined;
let serviciosPuntos: ServiciosPuntos | undefined;
let serviciosRecompensas: ServiciosRecompensas | undefined;
let serviciosInventarioRecompensas: ServiciosInventarioRecompensas | undefined;
let serviciosRecuperacion: ServiciosRecuperacion | undefined;
let serviciosRespaldo: ServiciosRespaldo | undefined;
let serviciosPerfil: ServiciosPerfil | undefined;
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
let unidadTrabajoAdquisicion:
  UnidadTrabajoAdquisicionRecompensaIndexedDB | undefined;
let repositorioSesionesCronometro:
  RepositorioSesionesCronometroIndexedDB | undefined;
let repositorioRecuperacion: RepositorioRecuperacionIndexedDB | undefined;
let repositorioPerfil: RepositorioPerfilUsuarioIndexedDB | undefined;

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

export function obtenerServiciosInventarioRecompensas(): ServiciosInventarioRecompensas {
  if (serviciosInventarioRecompensas) return serviciosInventarioRecompensas;
  const definiciones = crearCatalogoRecompensas();
  const inventario = obtenerUnidadTrabajoAdquisicion();
  const transacciones = obtenerRepositorioTransaccionesPuntos();
  const generador = new GeneradorIdentificadoresUUID();
  serviciosInventarioRecompensas = Object.freeze({
    consultarCatalogo: new CasoDeUsoConsultarCatalogoRecompensas(
      definiciones,
      transacciones,
    ),
    consultarInventario: new CasoDeUsoConsultarInventarioRecompensas(
      definiciones,
      inventario,
    ),
    adquirir: new CasoDeUsoAdquirirRecompensa({
      definiciones,
      repositorioInventario: inventario,
      repositorioTransacciones: transacciones,
      unidadTrabajo: inventario,
      reloj: new RelojSistema(),
      generadorIdentificadores: generador,
    }),
    generarOperacionId: () => generador.generar(),
  });
  return serviciosInventarioRecompensas;
}

export function obtenerServiciosRecuperacion(): ServiciosRecuperacion {
  if (serviciosRecuperacion) return serviciosRecuperacion;
  const generador = new GeneradorIdentificadoresUUID();
  const dependencias = {
    repositorioRecuperacion: obtenerRepositorioRecuperacion(),
    repositorioCortes: obtenerRepositorioCortes(),
    repositorioResoluciones: obtenerRepositorioResoluciones(),
    repositorioSesiones: obtenerRepositorioSesionesCronometro(),
    repositorioAjustes: obtenerUnidadTrabajoCanjeDiaLibre(),
    calendarioLocal: new CalendarioLocalSistema(),
    reloj: new RelojSistema(),
    generadorIdentificadores: generador,
  };
  serviciosRecuperacion = Object.freeze({
    consultarBanco: new CasoDeUsoConsultarBancoRecuperacion(dependencias),
    acreditar: new CasoDeUsoAcreditarRecuperacion(dependencias),
    consumir: new CasoDeUsoConsumirRecuperacion(dependencias),
    generarOperacionId: () => generador.generar(),
  });
  return serviciosRecuperacion;
}

export function obtenerServiciosRespaldo(): ServiciosRespaldo {
  serviciosRespaldo ??= Object.freeze({
    exportar: new CasoDeUsoExportarRespaldo(
      new LectorEstadoPersistenteIndexedDB(),
      new RelojSistema(),
    ),
    analizarImportacion: new CasoDeUsoAnalizarImportacionRespaldo(),
    prepararRestauracion: new CasoDeUsoPrepararRestauracionRespaldo(),
    restaurar: new CasoDeUsoRestaurarRespaldo(
      new RestauradorEstadoPersistenteIndexedDB(),
    ),
    descargar: descargarArchivoRespaldo,
    leerArchivo: leerArchivoRespaldo,
    recargarAplicacion: () => globalThis.location.reload(),
  });
  return serviciosRespaldo;
}

export function obtenerServiciosPerfil(): ServiciosPerfil {
  if (serviciosPerfil) return serviciosPerfil;
  const repositorio = obtenerRepositorioPerfil();
  const reloj = new RelojSistema();
  serviciosPerfil = Object.freeze({
    consultar: new CasoDeUsoConsultarPerfilUsuario(repositorio),
    crear: new CasoDeUsoCrearPerfilUsuario(
      repositorio,
      reloj,
      new GeneradorIdentificadoresUUID(),
    ),
    actualizar: new CasoDeUsoActualizarPerfilUsuario(repositorio, reloj),
  });
  return serviciosPerfil;
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
  const inventario = obtenerUnidadTrabajoAdquisicion();
  const definicionesRecompensas = crearCatalogoRecompensas();
  const dependenciasAplicacionDiaLibre = {
    definiciones: definicionesRecompensas,
    repositorioInventario: inventario,
    repositorioCortes: cortes,
    repositorioResoluciones: resoluciones,
    repositorioAjustes: ajustes,
    repositorioContextos: contextos,
    calendarioLocal: new CalendarioLocalSistema(),
  };
  return Object.freeze({
    crearContexto: new CasoDeUsoCrearContextoNombrado(
      contextos,
      reloj,
      generador,
    ),
    editarContexto: new CasoDeUsoEditarContextoPlanificacion(contextos),
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
      obtenerRepositorioRecuperacion(),
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
    editarActividad: new CasoDeUsoEditarActividad(actividades, bloques),
    eliminarActividad: new CasoDeUsoEliminarActividad(
      actividades,
      agendas,
      bloques,
      cortes,
    ),
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
    consultarInventarioRecompensas: new CasoDeUsoConsultarInventarioRecompensas(
      definicionesRecompensas,
      inventario,
    ),
    prepararAplicacionDiaLibre: new CasoDeUsoPrepararAplicacionDiaLibre(
      dependenciasAplicacionDiaLibre,
    ),
    aplicarDiaLibre: new CasoDeUsoAplicarDiaLibre({
      ...dependenciasAplicacionDiaLibre,
      unidadTrabajo: inventario,
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

function obtenerUnidadTrabajoAdquisicion(): UnidadTrabajoAdquisicionRecompensaIndexedDB {
  unidadTrabajoAdquisicion ??=
    new UnidadTrabajoAdquisicionRecompensaIndexedDB();
  return unidadTrabajoAdquisicion;
}

function obtenerRepositorioSesionesCronometro(): RepositorioSesionesCronometroIndexedDB {
  repositorioSesionesCronometro ??=
    new RepositorioSesionesCronometroIndexedDB();
  return repositorioSesionesCronometro;
}

function obtenerRepositorioRecuperacion(): RepositorioRecuperacionIndexedDB {
  repositorioRecuperacion ??= new RepositorioRecuperacionIndexedDB();
  return repositorioRecuperacion;
}

function obtenerRepositorioPerfil(): RepositorioPerfilUsuarioIndexedDB {
  repositorioPerfil ??= new RepositorioPerfilUsuarioIndexedDB();
  return repositorioPerfil;
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

function crearCatalogoRecompensas(): readonly RecompensaDefinida[] {
  return Object.freeze([
    new RecompensaDefinida({
      id: "dia-libre",
      nombre: "Día libre",
      descripcion:
        "Permite excusar compromisos flexibles personales elegibles de una fecha futura cuando se aplica desde Calendario.",
      costoPuntos: 1500,
      tipoEfecto: "DIA_LIBRE",
    }),
  ]);
}
