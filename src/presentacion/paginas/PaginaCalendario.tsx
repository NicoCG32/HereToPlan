import { PantallaAgendaBorrador } from "../agendas/PantallaAgendaBorrador";
import type { ServiciosAgendaBorrador } from "../agendas/ServiciosAgendaBorrador";
import { PantallaCalendario } from "../calendario/PantallaCalendario";
import type { ServiciosCalendario } from "../calendario/ServiciosCalendario";
import { EncabezadoPagina } from "./EncabezadoPagina";

interface PaginaCalendarioProps {
  readonly serviciosAgenda?: ServiciosAgendaBorrador;
  readonly serviciosCalendario?: ServiciosCalendario;
  readonly revisionDatos: number;
  readonly onDatosCambiados: () => void;
}

export function PaginaCalendario({
  serviciosAgenda,
  serviciosCalendario,
  revisionDatos,
  onDatosCambiados,
}: PaginaCalendarioProps) {
  return (
    <div className="pagina-aplicacion pagina-calendario">
      <EncabezadoPagina
        sobrelinea="Trabajo diario"
        titulo="Calendario"
        descripcion="Consulta todo lo planificado, organiza una fecha concreta y ejecuta compromisos sin perder su contexto ni su historial."
      />
      {serviciosAgenda ? (
        <PantallaAgendaBorrador servicios={serviciosAgenda} />
      ) : serviciosCalendario ? (
        <PantallaCalendario
          servicios={serviciosCalendario}
          revisionExterna={revisionDatos}
          onPuntosCambiados={onDatosCambiados}
        />
      ) : (
        <p className="estado-vacio-lineal">El calendario no está disponible.</p>
      )}
    </div>
  );
}
