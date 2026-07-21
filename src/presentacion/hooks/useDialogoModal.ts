import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";

const SELECTOR_CONTROLES = [
  "a[href]",
  "button:not(:disabled)",
  'input:not(:disabled):not([type="hidden"])',
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

interface ConfiguracionDialogoModal {
  readonly focoInicialRef: RefObject<HTMLElement | null>;
  readonly bloqueado: boolean;
  readonly onCerrar: () => void;
}

export function useDialogoModal({
  focoInicialRef,
  bloqueado,
  onCerrar,
}: ConfiguracionDialogoModal) {
  const dialogoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focoInicialRef.current?.focus();
  }, [focoInicialRef]);

  const gestionarTeclado = useCallback(
    (evento: KeyboardEvent<HTMLDivElement>) => {
      if (evento.key === "Escape" && !bloqueado) {
        evento.preventDefault();
        onCerrar();
        return;
      }
      if (evento.key !== "Tab") return;

      const controles = Array.from(
        dialogoRef.current?.querySelectorAll<HTMLElement>(SELECTOR_CONTROLES) ??
          [],
      ).filter((control) => control.getAttribute("aria-hidden") !== "true");
      if (controles.length === 0) {
        evento.preventDefault();
        dialogoRef.current?.focus();
        return;
      }

      const primero = controles[0];
      const ultimo = controles[controles.length - 1];
      const activo = document.activeElement;
      const focoFueraDelRecorrido = !controles.includes(activo as HTMLElement);
      if (evento.shiftKey && (activo === primero || focoFueraDelRecorrido)) {
        evento.preventDefault();
        ultimo?.focus();
      } else if (
        !evento.shiftKey &&
        (activo === ultimo || focoFueraDelRecorrido)
      ) {
        evento.preventDefault();
        primero?.focus();
      }
    },
    [bloqueado, onCerrar],
  );

  return { dialogoRef, gestionarTeclado } as const;
}
