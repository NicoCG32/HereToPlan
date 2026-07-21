import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import { NavegacionPrincipal } from "./NavegacionPrincipal";
import "./ArmazonAplicacion.css";

interface ArmazonAplicacionProps {
  readonly children: ReactNode;
}

export function ArmazonAplicacion({ children }: ArmazonAplicacionProps) {
  const [navegacionAbierta, setNavegacionAbierta] = useState(false);
  const botonAbrirRef = useRef<HTMLButtonElement>(null);
  const botonCerrarRef = useRef<HTMLButtonElement>(null);
  const contenidoRef = useRef<HTMLElement>(null);

  const cerrarNavegacion = useCallback(() => {
    setNavegacionAbierta(false);
    requestAnimationFrame(() => botonAbrirRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!navegacionAbierta) return;
    const desbordamientoAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botonCerrarRef.current?.focus();

    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrarNavegacion();
    };
    globalThis.addEventListener("keydown", cerrarConEscape);
    return () => {
      globalThis.removeEventListener("keydown", cerrarConEscape);
      document.body.style.overflow = desbordamientoAnterior;
    };
  }, [cerrarNavegacion, navegacionAbierta]);

  const saltarAlContenido = (evento: MouseEvent<HTMLAnchorElement>) => {
    evento.preventDefault();
    contenidoRef.current?.focus();
  };

  return (
    <div className="armazon-aplicacion">
      <a
        className="enlace-saltar"
        href="#contenido-principal"
        onClick={saltarAlContenido}
      >
        Saltar al contenido principal
      </a>

      <button
        ref={botonAbrirRef}
        className="boton-abrir-navegacion"
        type="button"
        aria-expanded={navegacionAbierta}
        aria-controls="navegacion-lateral"
        onClick={() => setNavegacionAbierta(true)}
      >
        Abrir navegación
      </button>

      {navegacionAbierta && (
        <button
          className="cobertura-navegacion"
          type="button"
          aria-label="Cerrar navegación"
          onClick={cerrarNavegacion}
        />
      )}

      <aside
        id="navegacion-lateral"
        className="navegacion-lateral"
        data-abierta={navegacionAbierta ? "true" : "false"}
      >
        <button
          ref={botonCerrarRef}
          className="boton-cerrar-navegacion"
          type="button"
          onClick={cerrarNavegacion}
        >
          Cerrar navegación
        </button>
        <NavegacionPrincipal onNavegar={cerrarNavegacion} />
      </aside>

      <div className="region-aplicacion">
        <header
          className="hud-superior-estructural"
          aria-label="Resumen personal"
        >
          <div>
            <p className="sobrelinea">HereToPlan</p>
            <strong>Planifica, cultiva y florece</strong>
          </div>
          <p>Tu identidad local y el resumen de puntos aparecerán aquí.</p>
        </header>
        <main
          ref={contenidoRef}
          id="contenido-principal"
          className="contenido-aplicacion"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
