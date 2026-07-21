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
import type { ServiciosPerfil } from "../presentacion/perfil/ServiciosPerfil";
import type { ServiciosRecompensas } from "../presentacion/recompensas/ServiciosRecompensas";
import type { ServiciosRecuperacion } from "../presentacion/recuperacion/ServiciosRecuperacion";
import type { ServiciosRespaldo } from "../presentacion/respaldo/ServiciosRespaldo";
import { ProveedorSesionAplicacion } from "../presentacion/sesion/SesionAplicacion";
import { useSesionAplicacion } from "../presentacion/sesion/ContextoSesionAplicacion";
import type { SelectorFraseMotivacional } from "../presentacion/sesion/frasesMotivacionales";
import { RutasAplicacion } from "./rutas/RutasAplicacion";
import {
  obtenerServiciosCalendario,
  obtenerServiciosPerfil,
  obtenerServiciosPuntos,
  obtenerServiciosRecompensas,
  obtenerServiciosRecuperacion,
  obtenerServiciosRespaldo,
} from "./configurarAplicacion";

export interface AppProps {
  readonly servicios?: ServiciosAgendaBorrador;
  readonly serviciosCalendario?: ServiciosCalendario;
  readonly serviciosPuntos?: ServiciosPuntos;
  readonly serviciosPerfil?: ServiciosPerfil;
  readonly serviciosRecompensas?: ServiciosRecompensas;
  readonly serviciosRecuperacion?: ServiciosRecuperacion;
  readonly serviciosRespaldo?: ServiciosRespaldo;
  readonly selectorFrase?: SelectorFraseMotivacional;
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
  serviciosPerfil,
  serviciosRecompensas,
  serviciosRecuperacion,
  serviciosRespaldo,
  selectorFrase,
}: AppProps) {
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
  const perfil =
    serviciosPerfil ??
    (usaComposicionReal ? obtenerServiciosPerfil() : undefined);

  return (
    <ProveedorSesionAplicacion
      {...(perfil ? { serviciosPerfil: perfil } : {})}
      {...(puntos ? { serviciosPuntos: puntos } : {})}
      {...(selectorFrase ? { selectorFrase } : {})}
    >
      <ContenidoAplicacion
        {...(servicios ? { servicios } : {})}
        {...(calendario ? { calendario } : {})}
        {...(puntos ? { puntos } : {})}
        {...(recompensas ? { recompensas } : {})}
        {...(recuperacion ? { recuperacion } : {})}
        {...(respaldo ? { respaldo } : {})}
      />
    </ProveedorSesionAplicacion>
  );
}

interface ContenidoAplicacionProps {
  readonly servicios?: ServiciosAgendaBorrador;
  readonly calendario?: ServiciosCalendario;
  readonly puntos?: ServiciosPuntos;
  readonly recompensas?: ServiciosRecompensas;
  readonly recuperacion?: ServiciosRecuperacion;
  readonly respaldo?: ServiciosRespaldo;
}

function ContenidoAplicacion({
  servicios,
  calendario,
  puntos,
  recompensas,
  recuperacion,
  respaldo,
}: ContenidoAplicacionProps) {
  const sesion = useSesionAplicacion();
  const revisionDatos = sesion?.revisionDatos ?? 0;
  const actualizarDatos = () => sesion?.notificarDatosCambiados();
  const restaurarDatos = () => void sesion?.refrescarProyecciones();

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
            onDatosRestaurados={restaurarDatos}
          />
        }
      />
    </ArmazonAplicacion>
  );
}
