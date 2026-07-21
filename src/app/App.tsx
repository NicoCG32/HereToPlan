import { useState } from "react";
import { HashRouter } from "react-router-dom";

import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";
import { ArmazonAplicacion } from "../presentacion/armazon/ArmazonAplicacion";
import type { ServiciosCalendario } from "../presentacion/calendario/ServiciosCalendario";
import { useGradienteGlobal } from "../presentacion/hooks/useGradienteGlobal";
import { PaginaCalendario } from "../presentacion/paginas/PaginaCalendario";
import { PaginaCrear } from "../presentacion/paginas/PaginaCrear";
import { PaginaPuntos } from "../presentacion/paginas/PaginaPuntos";
import { PaginaRespaldo } from "../presentacion/paginas/PaginaRespaldo";
import type { ServiciosPuntos } from "../presentacion/puntos/ServiciosPuntos";
import type { ServiciosRecompensas } from "../presentacion/recompensas/ServiciosRecompensas";
import type { ServiciosRecuperacion } from "../presentacion/recuperacion/ServiciosRecuperacion";
import type { ServiciosRespaldo } from "../presentacion/respaldo/ServiciosRespaldo";
import { RutasAplicacion } from "./rutas/RutasAplicacion";
import {
  obtenerServiciosCalendario,
  obtenerServiciosPuntos,
  obtenerServiciosRecompensas,
  obtenerServiciosRecuperacion,
  obtenerServiciosRespaldo,
} from "./configurarAplicacion";

export interface AppProps {
  readonly servicios?: ServiciosAgendaBorrador;
  readonly serviciosCalendario?: ServiciosCalendario;
  readonly serviciosPuntos?: ServiciosPuntos;
  readonly serviciosRecompensas?: ServiciosRecompensas;
  readonly serviciosRecuperacion?: ServiciosRecuperacion;
  readonly serviciosRespaldo?: ServiciosRespaldo;
}

export function App(props: AppProps) {
  useGradienteGlobal();

  return (
    <HashRouter>
      <AplicacionEnrutada {...props} />
    </HashRouter>
  );
}

function AplicacionEnrutada({
  servicios,
  serviciosCalendario,
  serviciosPuntos,
  serviciosRecompensas,
  serviciosRecuperacion,
  serviciosRespaldo,
}: AppProps) {
  const [revisionDatos, setRevisionDatos] = useState(0);
  const usaComposicionReal = !servicios && !serviciosCalendario;
  const calendario =
    serviciosCalendario ??
    (servicios ? undefined : obtenerServiciosCalendario());
  const puntos =
    serviciosPuntos ??
    (usaComposicionReal ? obtenerServiciosPuntos() : undefined);
  const recompensas =
    serviciosRecompensas ??
    (usaComposicionReal ? obtenerServiciosRecompensas() : undefined);
  const recuperacion =
    serviciosRecuperacion ??
    (usaComposicionReal ? obtenerServiciosRecuperacion() : undefined);
  const respaldo =
    serviciosRespaldo ??
    (usaComposicionReal ? obtenerServiciosRespaldo() : undefined);

  const actualizarDatos = () =>
    setRevisionDatos((revisionActual) => revisionActual + 1);

  return (
    <ArmazonAplicacion>
      <RutasAplicacion
        calendario={
          <PaginaCalendario
            {...(servicios ? { serviciosAgenda: servicios } : {})}
            {...(calendario ? { serviciosCalendario: calendario } : {})}
            revisionDatos={revisionDatos}
            onDatosCambiados={actualizarDatos}
          />
        }
        crear={
          <PaginaCrear
            {...(calendario ? { serviciosCalendario: calendario } : {})}
            {...(servicios ? { serviciosAgenda: servicios } : {})}
          />
        }
        puntos={
          <PaginaPuntos
            {...(puntos ? { serviciosPuntos: puntos } : {})}
            {...(recompensas ? { serviciosRecompensas: recompensas } : {})}
            {...(recuperacion ? { serviciosRecuperacion: recuperacion } : {})}
            revisionDatos={revisionDatos}
            onDatosCambiados={actualizarDatos}
          />
        }
        respaldo={
          <PaginaRespaldo
            {...(respaldo ? { serviciosRespaldo: respaldo } : {})}
          />
        }
      />
    </ArmazonAplicacion>
  );
}
