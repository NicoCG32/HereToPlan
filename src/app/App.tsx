import { useState } from "react";

import { PantallaAgendaBorrador } from "../presentacion/agendas/PantallaAgendaBorrador";
import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";
import { PantallaCalendario } from "../presentacion/calendario/PantallaCalendario";
import type { ServiciosCalendario } from "../presentacion/calendario/ServiciosCalendario";
import { useGradienteGlobal } from "../presentacion/hooks/useGradienteGlobal";
import { PanelBilletera } from "../presentacion/puntos/PanelBilletera";
import type { ServiciosPuntos } from "../presentacion/puntos/ServiciosPuntos";
import { PanelDiaLibre } from "../presentacion/recompensas/PanelDiaLibre";
import type { ServiciosRecompensas } from "../presentacion/recompensas/ServiciosRecompensas";
import logoHereToPlan from "../presentacion/recursos/logos/HereToPlanLogo.svg";
import {
  obtenerServiciosCalendario,
  obtenerServiciosPuntos,
  obtenerServiciosRecompensas,
} from "./configurarAplicacion";

interface AppProps {
  readonly servicios?: ServiciosAgendaBorrador;
  readonly serviciosCalendario?: ServiciosCalendario;
  readonly serviciosPuntos?: ServiciosPuntos;
  readonly serviciosRecompensas?: ServiciosRecompensas;
}

export function App({
  servicios,
  serviciosCalendario,
  serviciosPuntos,
  serviciosRecompensas,
}: AppProps) {
  useGradienteGlobal();
  const [revisionDatos, setRevisionDatos] = useState(0);
  const serviciosPuntosEfectivos =
    serviciosPuntos ??
    (!servicios && !serviciosCalendario ? obtenerServiciosPuntos() : undefined);
  const serviciosRecompensasEfectivos =
    serviciosRecompensas ??
    (!servicios && !serviciosCalendario
      ? obtenerServiciosRecompensas()
      : undefined);

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
          {serviciosRecompensasEfectivos && (
            <PanelDiaLibre
              servicios={serviciosRecompensasEfectivos}
              onCanjeConfirmado={() =>
                setRevisionDatos((revision) => revision + 1)
              }
            />
          )}
        </>
      )}
    </main>
  );
}
