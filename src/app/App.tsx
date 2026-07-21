import { useRef, useState } from "react";

import { PantallaAgendaBorrador } from "../presentacion/agendas/PantallaAgendaBorrador";
import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";
import { PantallaCalendario } from "../presentacion/calendario/PantallaCalendario";
import type { ServiciosCalendario } from "../presentacion/calendario/ServiciosCalendario";
import { useGradienteGlobal } from "../presentacion/hooks/useGradienteGlobal";
import { PanelBilletera } from "../presentacion/puntos/PanelBilletera";
import type { ServiciosPuntos } from "../presentacion/puntos/ServiciosPuntos";
import { PanelDiaLibre } from "../presentacion/recompensas/PanelDiaLibre";
import type { ServiciosRecompensas } from "../presentacion/recompensas/ServiciosRecompensas";
import { PanelRecuperacion } from "../presentacion/recuperacion/PanelRecuperacion";
import type { ServiciosRecuperacion } from "../presentacion/recuperacion/ServiciosRecuperacion";
import { PanelRespaldo } from "../presentacion/respaldo/PanelRespaldo";
import type { ServiciosRespaldo } from "../presentacion/respaldo/ServiciosRespaldo";
import logoHereToPlan from "../presentacion/recursos/logos/HereToPlanLogo.svg";
import {
  obtenerServiciosCalendario,
  obtenerServiciosPuntos,
  obtenerServiciosRecompensas,
  obtenerServiciosRecuperacion,
  obtenerServiciosRespaldo,
} from "./configurarAplicacion";

interface AppProps {
  readonly servicios?: ServiciosAgendaBorrador;
  readonly serviciosCalendario?: ServiciosCalendario;
  readonly serviciosPuntos?: ServiciosPuntos;
  readonly serviciosRecompensas?: ServiciosRecompensas;
  readonly serviciosRecuperacion?: ServiciosRecuperacion;
  readonly serviciosRespaldo?: ServiciosRespaldo;
}

export function App({
  servicios,
  serviciosCalendario,
  serviciosPuntos,
  serviciosRecompensas,
  serviciosRecuperacion,
  serviciosRespaldo,
}: AppProps) {
  useGradienteGlobal();
  const contenidoRef = useRef<HTMLElement>(null);
  const [revisionDatos, setRevisionDatos] = useState(0);
  const serviciosPuntosEfectivos =
    serviciosPuntos ??
    (!servicios && !serviciosCalendario ? obtenerServiciosPuntos() : undefined);
  const serviciosRecompensasEfectivos =
    serviciosRecompensas ??
    (!servicios && !serviciosCalendario
      ? obtenerServiciosRecompensas()
      : undefined);
  const serviciosRecuperacionEfectivos =
    serviciosRecuperacion ??
    (!servicios && !serviciosCalendario
      ? obtenerServiciosRecuperacion()
      : undefined);
  const serviciosRespaldoEfectivos =
    serviciosRespaldo ??
    (!servicios && !serviciosCalendario
      ? obtenerServiciosRespaldo()
      : undefined);

  return (
    <main
      ref={contenidoRef}
      id="contenido-principal"
      className="contenedor-principal"
      tabIndex={-1}
    >
      <a
        className="enlace-saltar"
        href="#contenido-principal"
        onClick={() => contenidoRef.current?.focus()}
      >
        Saltar al contenido principal
      </a>
      <header className="encabezado">
        <p className="etiqueta">Planificación personal consciente</p>
        <h1>
          <img
            src={logoHereToPlan}
            width="1536"
            height="384"
            alt="HereToPlan"
          />
        </h1>
        <p>
          HereToPlan combina compromisos, flexibilidad y trazabilidad para
          construir planes realistas sin convertirlos en un sistema punitivo.
        </p>
      </header>

      {servicios ? (
        <PantallaAgendaBorrador servicios={servicios} />
      ) : (
        <>
          <PantallaCalendario
            servicios={serviciosCalendario ?? obtenerServiciosCalendario()}
            revisionExterna={revisionDatos}
            onPuntosCambiados={() =>
              setRevisionDatos((revision) => revision + 1)
            }
          />
          {serviciosPuntosEfectivos && (
            <PanelBilletera
              servicios={serviciosPuntosEfectivos}
              revision={revisionDatos}
            />
          )}
          {serviciosRecuperacionEfectivos && (
            <PanelRecuperacion
              servicios={serviciosRecuperacionEfectivos}
              revision={revisionDatos}
              onRecuperacionCambiada={() =>
                setRevisionDatos((revision) => revision + 1)
              }
            />
          )}
          {serviciosRecompensasEfectivos && (
            <PanelDiaLibre
              servicios={serviciosRecompensasEfectivos}
              onCanjeConfirmado={() =>
                setRevisionDatos((revision) => revision + 1)
              }
            />
          )}
          {serviciosRespaldoEfectivos && (
            <PanelRespaldo servicios={serviciosRespaldoEfectivos} />
          )}
        </>
      )}
    </main>
  );
}
