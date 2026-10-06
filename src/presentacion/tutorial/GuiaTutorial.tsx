import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSesionAplicacion } from "../sesion/ContextoSesionAplicacion";
import { useTutorial } from "./ContextoTutorial";
import { crearObservadorDestinoTutorial } from "./DestinosTutorial";
import { INDICACIONES_TUTORIAL } from "./IndicacionesTutorial";
import { RECORRIDO_TUTORIAL } from "./RecorridoTutorial";
import "./GuiaTutorial.css";

export function GuiaTutorial() {
  const tutorial = useTutorial();
  const sesion = useSesionAplicacion();
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const ayudaRef = useRef<HTMLButtonElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const pasoId = tutorial?.estado.pasoActual ?? null;
  const fuente = useMemo(
    () => crearObservadorDestinoTutorial(pasoId),
    [pasoId],
  );
  const destino = useSyncExternalStore(fuente.suscribir, fuente.leer);
  const paso = RECORRIDO_TUTORIAL.find((candidato) => candidato.id === pasoId);
  const enRuta = !paso || ubicacion.pathname === paso.destino;
  const disponible =
    !sesion ||
    (sesion.carga === "LISTA" &&
      (!sesion.identidadDisponible || Boolean(sesion.perfil)));

  useEffect(() => {
    if (
      !tutorial?.visible ||
      tutorial.estado.situacion !== "EN_CURSO" ||
      !enRuta ||
      destino.hayDialogo ||
      !destino.elemento
    )
      return;
    const elemento = destino.elemento;
    elemento.setAttribute("data-tutorial-resaltado", "true");
    return () => elemento.removeAttribute("data-tutorial-resaltado");
  }, [
    tutorial?.visible,
    tutorial?.estado.situacion,
    enRuta,
    destino.elemento,
    destino.hayDialogo,
  ]);

  if (!tutorial || !disponible) return null;
  const presentar = (contenido: ReactNode) => (
    <div
      inert={destino.hayDialogo}
      aria-hidden={destino.hayDialogo || undefined}
    >
      {contenido}
    </div>
  );
  const { estado, visible } = tutorial;
  const cerrar = () => {
    tutorial.cerrar();
    requestAnimationFrame(() =>
      ayudaRef.current?.focus({ preventScroll: true }),
    );
  };
  const teclado = (evento: KeyboardEvent<HTMLElement>) => {
    if (evento.key === "Escape") {
      evento.preventDefault();
      cerrar();
    }
  };
  const enfocarTitulo = () =>
    requestAnimationFrame(() => {
      const titulo = tituloRef.current;
      const rect = titulo?.getBoundingClientRect();
      titulo?.focus({
        preventScroll: Boolean(
          rect && rect.top >= 0 && rect.bottom <= window.innerHeight,
        ),
      });
    });
  const abrir = () => {
    if (estado.situacion === "EN_CURSO" || estado.situacion === "POSPUESTO")
      tutorial.continuar();
    else tutorial.iniciar();
    enfocarTitulo();
  };
  const cabecera = (
    <div className="acceso-guia-tutorial">
      <button
        ref={ayudaRef}
        type="button"
        className="boton-texto"
        aria-expanded={visible}
        aria-controls="guia-tutorial"
        onClick={abrir}
      >
        {estado.situacion === "EN_CURSO" || estado.situacion === "POSPUESTO"
          ? "Continuar guía"
          : "Guía de primeros pasos"}
      </button>
    </div>
  );
  if (!visible) return presentar(cabecera);
  if (estado.situacion === "NO_INICIADO")
    return presentar(
      <>
        {cabecera}
        <section
          id="guia-tutorial"
          className="guia-tutorial"
          aria-labelledby="titulo-guia"
          onKeyDown={teclado}
        >
          <h2 id="titulo-guia" ref={tituloRef} tabIndex={-1}>
            Conoce HereToPlan a tu ritmo
          </h2>
          <p>
            Una guía opcional te muestra dónde crear, planificar y resolver tus
            actividades. Puedes posponerla y usar la aplicación desde ahora.
          </p>
          <div className="acciones-guia-tutorial">
            <button type="button" className="boton-primario" onClick={abrir}>
              Iniciar guía
            </button>
            <button
              type="button"
              className="boton-secundario"
              onClick={() => {
                tutorial.posponer();
                requestAnimationFrame(() =>
                  ayudaRef.current?.focus({ preventScroll: true }),
                );
              }}
            >
              Más tarde
            </button>
            <button
              type="button"
              className="boton-texto"
              onClick={() => {
                tutorial.omitir();
                requestAnimationFrame(() =>
                  ayudaRef.current?.focus({ preventScroll: true }),
                );
              }}
            >
              Omitir guía
            </button>
          </div>
        </section>
      </>,
    );
  if (estado.situacion === "COMPLETADO")
    return presentar(
      <>
        {cabecera}
        <section
          id="guia-tutorial"
          className="guia-tutorial"
          aria-labelledby="titulo-guia"
          onKeyDown={teclado}
        >
          <h2 id="titulo-guia" ref={tituloRef} tabIndex={-1}>
            Recorrido completado
          </h2>
          <p>
            Ya conoces el recorrido de planificación. Puedes seguir trabajando a
            tu ritmo.
          </p>
          <button type="button" className="boton-texto" onClick={cerrar}>
            Cerrar guía
          </button>
        </section>
      </>,
    );
  if (!paso || estado.situacion !== "EN_CURSO") return presentar(cabecera);
  const indicacion = INDICACIONES_TUTORIAL[paso.id];
  const listo =
    enRuta &&
    Boolean(destino.elemento) &&
    (!indicacion.hito ||
      tutorial.hitos.has(indicacion.hito) ||
      destino.completado);
  const numero = RECORRIDO_TUTORIAL.indexOf(paso) + 1;
  return presentar(
    <>
      {cabecera}
      <section
        id="guia-tutorial"
        className="guia-tutorial"
        aria-labelledby="titulo-guia"
        onKeyDown={teclado}
      >
        <p className="estado-guia-tutorial" role="status">
          Paso {numero} de {RECORRIDO_TUTORIAL.length}: {indicacion.titulo}
        </p>
        <h2 id="titulo-guia" ref={tituloRef} tabIndex={-1}>
          {indicacion.titulo}
        </h2>
        <p>{indicacion.texto}</p>
        {paso.id === "LIBRE" && destino.contexto && (
          <p className="ayuda-campo">
            Ahora estás consultando: {destino.contexto}. Libre sigue disponible
            en Contexto visible.
          </p>
        )}
        {!enRuta ? (
          <p className="ayuda-campo">
            Este paso se realiza en{" "}
            {paso.destino === "/crear" ? "Crear" : "Calendario"}. Puedes seguir
            usando otras páginas y retomarlo cuando quieras.
          </p>
        ) : (
          !listo && (
            <p id="requisito-guia" className="ayuda-campo" role="status">
              {destino.elemento
                ? indicacion.requisito
                : "El control todavía no está disponible. Espera la carga de la página o pospón la guía."}
            </p>
          )
        )}
        <div className="acciones-guia-tutorial">
          {!enRuta ? (
            <button
              type="button"
              className="boton-secundario"
              onClick={() => {
                void navegar(paso.destino);
                enfocarTitulo();
              }}
            >
              Ir a {paso.destino === "/crear" ? "Crear" : "Calendario"}
            </button>
          ) : (
            <button
              type="button"
              className="boton-secundario"
              disabled={!destino.elemento}
              onClick={() => {
                const elemento = destino.elemento;
                if (!elemento) return;
                if (elemento.tabIndex < 0)
                  elemento.setAttribute("tabindex", "-1");
                elemento.focus({ preventScroll: true });
                elemento.scrollIntoView({
                  block: "center",
                  behavior: "instant",
                });
              }}
            >
              Ver control
            </button>
          )}
          <button
            type="button"
            className="boton-primario"
            disabled={!listo}
            aria-describedby={!listo && enRuta ? "requisito-guia" : undefined}
            onClick={() => {
              if (listo) {
                tutorial.completar(paso.id);
                enfocarTitulo();
              }
            }}
          >
            {paso.id === "EJECUCION" ? "Terminar guía" : "Siguiente paso"}
          </button>
          <button
            type="button"
            className="boton-texto"
            onClick={() => {
              tutorial.posponer();
              requestAnimationFrame(() =>
                ayudaRef.current?.focus({ preventScroll: true }),
              );
            }}
          >
            Posponer guía
          </button>
          <button type="button" className="boton-texto" onClick={cerrar}>
            Cerrar guía
          </button>
          <button
            type="button"
            className="boton-texto"
            onClick={() => {
              tutorial.omitir();
              requestAnimationFrame(() =>
                ayudaRef.current?.focus({ preventScroll: true }),
              );
            }}
          >
            Omitir guía
          </button>
        </div>
      </section>
    </>,
  );
}
