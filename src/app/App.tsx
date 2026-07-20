import { useState } from "react";

import { PantallaAgendaBorrador } from "../presentacion/agendas/PantallaAgendaBorrador";
import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";
import { PantallaCalendario } from "../presentacion/calendario/PantallaCalendario";
import type { ServiciosCalendario } from "../presentacion/calendario/ServiciosCalendario";
import { useGradienteGlobal } from "../presentacion/hooks/useGradienteGlobal";
import { PanelBilletera } from "../presentacion/puntos/PanelBilletera";
import type { ServiciosPuntos } from "../presentacion/puntos/ServiciosPuntos";
import logoHereToPlan from "../presentacion/recursos/logos/HereToPlanLogo.svg";
import {
  obtenerServiciosCalendario,
  obtenerServiciosPuntos,
} from "./configurarAplicacion";

interface AppProps {
  readonly servicios?: ServiciosAgendaBorrador;
  readonly serviciosCalendario?: ServiciosCalendario;
  readonly serviciosPuntos?: ServiciosPuntos;
}

export function App({
  servicios,
  serviciosCalendario,
  serviciosPuntos,
}: AppProps) {
  useGradienteGlobal();
  const [revisionPuntos, setRevisionPuntos] = useState(0);
  const serviciosPuntosEfectivos =
    serviciosPuntos ??
    (!servicios && !serviciosCalendario ? obtenerServiciosPuntos() : undefined);

  return (
    <main className="contenedor-principal">
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
            onPuntosCambiados={() =>
              setRevisionPuntos((revision) => revision + 1)
            }
          />
          {serviciosPuntosEfectivos && (
            <PanelBilletera
              servicios={serviciosPuntosEfectivos}
              revision={revisionPuntos}
            />
          )}
        </>
      )}
    </main>
  );
}
