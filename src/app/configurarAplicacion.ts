import {
  CasoDeUsoCrearAgendaBorrador,
  CasoDeUsoGuardarBloquesAgendaBorrador,
  CasoDeUsoInicializarContextosPlanificacion,
  CasoDeUsoListarAgendasBorrador,
} from "../aplicacion";
import { RepositorioAgendasIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioAgendasIndexedDB";
import { RepositorioContextosPlanificacionIndexedDB } from "../infraestructura/persistencia/indexeddb/RepositorioContextosPlanificacionIndexedDB";
import { MigradorContextosDesdeAgendasIndexedDB } from "../infraestructura/persistencia/indexeddb/MigradorContextosDesdeAgendasIndexedDB";
import { GeneradorIdentificadoresUUID } from "../infraestructura/sistema/GeneradorIdentificadoresUUID";
import { RelojSistema } from "../infraestructura/sistema/RelojSistema";
import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";

let servicios: ServiciosAgendaBorrador | undefined;
let inicializacionPendiente: Promise<void> | undefined;

export function inicializarAplicacion(): Promise<void> {
  if (!inicializacionPendiente) {
    const reloj = new RelojSistema();
    const repositorioContextos =
      new RepositorioContextosPlanificacionIndexedDB();
    inicializacionPendiente = new MigradorContextosDesdeAgendasIndexedDB()
      .ejecutar(reloj.ahora())
      .then(() =>
        new CasoDeUsoInicializarContextosPlanificacion(
          repositorioContextos,
          reloj,
        ).ejecutar(),
      )
      .then(() => undefined);
  }
  return inicializacionPendiente;
}

export function obtenerServiciosAplicacion(): ServiciosAgendaBorrador {
  servicios ??= crearServiciosAplicacion();
  return servicios;
}

function crearServiciosAplicacion(): ServiciosAgendaBorrador {
  const repositorio = new RepositorioAgendasIndexedDB();
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
