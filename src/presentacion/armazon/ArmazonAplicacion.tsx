import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import { NavegacionPrincipal } from "./NavegacionPrincipal";
import { HudAplicacion } from "../sesion/HudAplicacion";
import { GuiaTutorial } from "../tutorial/GuiaTutorial";
import { atributosDestinoTutorial } from "../tutorial/DestinosTutorial";
import "./ArmazonAplicacion.css";

interface ArmazonAplicacionProps {
  readonly children: ReactNode;
}

export function ArmazonAplicacion({ children }: ArmazonAplicacionProps) {
  const [navegacionAbierta, setNavegacionAbierta] = useState(false);
  const botonAbrirRef = useRef<HTMLButtonElement>(null);
  const botonCerrarRef = useRef<HTMLButtonElement>(null);
  const navegacionRef = useRef<HTMLElement>(null);
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
      if (evento.key !== "Tab") return;
      const controles = navegacionRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href]",
      );
      if (!controles?.length) return;
      const primero = controles[0]!;
      const ultimo = controles[controles.length - 1]!;
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    const consultaMovil = globalThis.matchMedia?.("(max-width: 64rem)");
    const cerrarAlAmpliar = () => {
      if (consultaMovil?.matches !== false) return;
      setNavegacionAbierta(false);
      requestAnimationFrame(() =>
        navegacionRef.current
          ?.querySelector<HTMLElement>('a[aria-current="page"]')
          ?.focus({ preventScroll: true }),
      );
    };
    consultaMovil?.addEventListener("change", cerrarAlAmpliar);
    globalThis.addEventListener("keydown", cerrarConEscape);
    return () => {
      consultaMovil?.removeEventListener("change", cerrarAlAmpliar);
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
        {...atributosDestinoTutorial("ABRIR_NAVEGACION")}
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
        ref={navegacionRef}
        id="navegacion-lateral"
        {...atributosDestinoTutorial("NAVEGACION")}
        className="navegacion-lateral"
        data-abierta={navegacionAbierta ? "true" : "false"}
        role={navegacionAbierta ? "dialog" : undefined}
        aria-modal={navegacionAbierta ? true : undefined}
        aria-label={navegacionAbierta ? "Navegación principal" : undefined}
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

      <div className="region-aplicacion" inert={navegacionAbierta}>
        <HudAplicacion />
        <main
          ref={contenidoRef}
          id="contenido-principal"
          className="contenido-aplicacion"
          tabIndex={-1}
        >
          <GuiaTutorial />
          {children}
        </main>
      </div>
    </div>
  );
}
