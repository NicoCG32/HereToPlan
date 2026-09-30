import { useLayoutEffect, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useDialogoModal } from "../hooks/useDialogoModal";

interface DialogoPlanificacionProps {
  readonly tituloId: string;
  readonly focoInicialRef: RefObject<HTMLElement | null>;
  readonly bloqueado: boolean;
  readonly onCerrar: () => void;
  readonly children: ReactNode;
}

export function DialogoPlanificacion({
  tituloId,
  focoInicialRef,
  bloqueado,
  onCerrar,
  children,
}: DialogoPlanificacionProps) {
  const { dialogoRef, gestionarTeclado } = useDialogoModal({
    focoInicialRef,
    bloqueado,
    onCerrar,
    evitarDesplazamientoInicial: true,
  });

  useLayoutEffect(() => {
    const raiz = document.getElementById("root");
    const inerteAnterior = raiz?.inert ?? false;
    const overflowAnterior = document.body.style.overflow;
    const paddingAnterior = document.body.style.paddingRight;
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`;
    if (raiz) raiz.inert = true;
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.body.style.paddingRight = paddingAnterior;
      if (raiz) raiz.inert = inerteAnterior;
    };
  }, []);

  return createPortal(
    <div className="fondo-dialogo fondo-planificacion" role="presentation">
      <div
        ref={dialogoRef}
        className="dialogo-confirmacion dialogo-planificacion"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-busy={bloqueado}
        onKeyDown={gestionarTeclado}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
