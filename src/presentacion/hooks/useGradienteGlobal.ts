import { useEffect, useState } from "react";

const CONSULTA_MOVIMIENTO_REDUCIDO = "(prefers-reduced-motion: reduce)";

export function useGradienteGlobal(): boolean {
  const [movimientoReducido, setMovimientoReducido] = useState(
    () => obtenerPreferenciaMovimiento()?.matches ?? false,
  );

  useEffect(() => {
    const raiz = document.documentElement;
    const preferenciaMovimiento = obtenerPreferenciaMovimiento();
    if (!preferenciaMovimiento) return;
    let cuadroPendiente: number | undefined;
    let posicionX = 78;
    let posicionY = 16;

    const limpiarPosicion = () => {
      raiz.style.removeProperty("--mouse-x");
      raiz.style.removeProperty("--mouse-y");
    };

    const actualizarPreferencia = () => {
      setMovimientoReducido(preferenciaMovimiento.matches);

      if (preferenciaMovimiento.matches) {
        if (cuadroPendiente !== undefined) {
          window.cancelAnimationFrame(cuadroPendiente);
          cuadroPendiente = undefined;
        }

        limpiarPosicion();
      }
    };

    const actualizarGradiente = (evento: PointerEvent) => {
      if (preferenciaMovimiento.matches) {
        return;
      }

      posicionX = (evento.clientX / window.innerWidth) * 100;
      posicionY = (evento.clientY / window.innerHeight) * 100;

      if (cuadroPendiente !== undefined) {
        return;
      }

      cuadroPendiente = window.requestAnimationFrame(() => {
        raiz.style.setProperty("--mouse-x", `${posicionX}%`);
        raiz.style.setProperty("--mouse-y", `${posicionY}%`);
        cuadroPendiente = undefined;
      });
    };

    actualizarPreferencia();
    window.addEventListener("pointermove", actualizarGradiente, {
      passive: true,
    });
    preferenciaMovimiento.addEventListener("change", actualizarPreferencia);

    return () => {
      window.removeEventListener("pointermove", actualizarGradiente);
      preferenciaMovimiento.removeEventListener(
        "change",
        actualizarPreferencia,
      );

      if (cuadroPendiente !== undefined) {
        window.cancelAnimationFrame(cuadroPendiente);
      }

      limpiarPosicion();
    };
  }, []);

  return movimientoReducido;
}

function obtenerPreferenciaMovimiento(): MediaQueryList | undefined {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return undefined;
  }

  return window.matchMedia(CONSULTA_MOVIMIENTO_REDUCIDO);
}
