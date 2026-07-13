import type { PointerEvent as EventoPuntero } from "react";
import { useGradienteGlobal } from "../hooks/useGradienteGlobal";

export interface CapaDemostracion {
  nombre: string;
  mensaje: string;
}

interface PropiedadesPanelCapas {
  capas: readonly CapaDemostracion[];
}

export function PanelCapas({ capas }: PropiedadesPanelCapas) {
  const movimientoReducido = useGradienteGlobal();

  const actualizarGradienteTarjeta = (evento: EventoPuntero<HTMLElement>) => {
    if (movimientoReducido) {
      return;
    }

    const tarjeta = evento.currentTarget;
    const limites = tarjeta.getBoundingClientRect();
    const posicionX = evento.clientX - limites.left;
    const posicionY = evento.clientY - limites.top;
    const porcentajeX = (posicionX / limites.width) * 100;
    const porcentajeY = (posicionY / limites.height) * 100;
    const angulo =
      Math.atan2(
        posicionY - limites.height / 2,
        posicionX - limites.width / 2,
      ) *
        (180 / Math.PI) +
      90;

    tarjeta.style.setProperty("--cursor-x", `${porcentajeX}%`);
    tarjeta.style.setProperty("--cursor-y", `${porcentajeY}%`);
    tarjeta.style.setProperty("--angulo-gradiente", `${angulo}deg`);
  };

  const restablecerGradienteTarjeta = (evento: EventoPuntero<HTMLElement>) => {
    const tarjeta = evento.currentTarget;

    tarjeta.style.removeProperty("--cursor-x");
    tarjeta.style.removeProperty("--cursor-y");
    tarjeta.style.removeProperty("--angulo-gradiente");
  };

  return (
    <section className="rejilla-capas" aria-label="Capas de la aplicación">
      {capas.map((capa) => (
        <article
          className="tarjeta-capa"
          key={capa.nombre}
          onPointerMove={actualizarGradienteTarjeta}
          onPointerLeave={restablecerGradienteTarjeta}
          onPointerCancel={restablecerGradienteTarjeta}
        >
          <h2>{capa.nombre}</h2>
          <p>{capa.mensaje}</p>
        </article>
      ))}
    </section>
  );
}
