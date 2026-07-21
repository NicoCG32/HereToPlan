import { useEffect, type RefObject } from "react";

export function useEnfoqueError(
  contenedorRef: RefObject<HTMLElement | null>,
  claveError: string,
): void {
  useEffect(() => {
    if (!claveError) return;
    requestAnimationFrame(() => {
      const contenedor = contenedorRef.current;
      const selector = '[aria-invalid="true"], [role="alert"]';
      const destino = contenedor?.matches(selector)
        ? contenedor
        : contenedor?.querySelector<HTMLElement>(selector);
      destino?.focus();
    });
  }, [claveError, contenedorRef]);
}
