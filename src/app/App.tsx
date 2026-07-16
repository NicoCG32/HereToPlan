import { PantallaAgendaBorrador } from "../presentacion/agendas/PantallaAgendaBorrador";
import type { ServiciosAgendaBorrador } from "../presentacion/agendas/ServiciosAgendaBorrador";
import { useGradienteGlobal } from "../presentacion/hooks/useGradienteGlobal";
import logoHereToPlan from "../presentacion/recursos/logos/HereToPlanLogo.svg";
import { obtenerServiciosAplicacion } from "./configurarAplicacion";

interface AppProps {
  readonly servicios?: ServiciosAgendaBorrador;
}

export function App({ servicios }: AppProps) {
  useGradienteGlobal();

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

      <PantallaAgendaBorrador
        servicios={servicios ?? obtenerServiciosAplicacion()}
      />
    </main>
  );
}
