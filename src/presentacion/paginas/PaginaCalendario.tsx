import { PantallaAgendaBorrador } from "../agendas/PantallaAgendaBorrador";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ServiciosAgendaBorrador } from "../agendas/ServiciosAgendaBorrador";
import { PantallaCalendario } from "../calendario/PantallaCalendario";
import type { ServiciosCalendario } from "../calendario/ServiciosCalendario";
import { EncabezadoPagina } from "./EncabezadoPagina";
import "./PaginaCalendario.css";

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
  const [parametros, setParametros] = useSearchParams();
  const [{ actividadInicialId, fechaInicial }] = useState(() => ({
    actividadInicialId: parametros.get("actividad") ?? undefined,
    fechaInicial: parametros.get("fecha") ?? undefined,
  }));

  useEffect(() => {
    if (!parametros.has("actividad") && !parametros.has("fecha")) return;
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales);
        siguientes.delete("actividad");
        siguientes.delete("fecha");
        return siguientes;
      },
      { replace: true },
    );
  }, [parametros, setParametros]);
  return (
    <div className="pagina-aplicacion pagina-calendario">
      <EncabezadoPagina
        sobrelinea="Trabajo diario"
        titulo="Calendario"
        descripcion="Planifica tus actividades, revisa tus compromisos y consulta lo que viene."
      />
      {serviciosAgenda ? (
        <PantallaAgendaBorrador servicios={serviciosAgenda} />
      ) : serviciosCalendario ? (
        <PantallaCalendario
          servicios={serviciosCalendario}
          revisionExterna={revisionDatos}
          onPuntosCambiados={onDatosCambiados}
          {...(actividadInicialId ? { actividadInicialId } : {})}
          {...(fechaInicial ? { fechaInicial } : {})}
        />
      ) : (
        <p className="estado-vacio-lineal">El calendario no está disponible.</p>
      )}
    </div>
  );
}
