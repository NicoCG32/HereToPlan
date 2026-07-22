import { PanelRespaldo } from "../respaldo/PanelRespaldo";
import type { ServiciosRespaldo } from "../respaldo/ServiciosRespaldo";
import { EncabezadoPagina } from "./EncabezadoPagina";
import { useNavigate } from "react-router-dom";

interface PaginaRespaldoProps {
  readonly serviciosRespaldo?: ServiciosRespaldo;
  readonly onDatosRestaurados?: () => void;
}

export function PaginaRespaldo({
  serviciosRespaldo,
  onDatosRestaurados,
}: PaginaRespaldoProps) {
  const navegar = useNavigate();
  return (
    <div className="pagina-aplicacion pagina-respaldo">
      <EncabezadoPagina
        sobrelinea="Portabilidad y seguridad"
        titulo="Respaldo"
        descripcion="Exporta, analiza y restaura el estado local fuera del flujo cotidiano. Analizar un archivo nunca modifica la información vigente."
      />
      {serviciosRespaldo ? (
        <PanelRespaldo
          servicios={serviciosRespaldo}
          {...(onDatosRestaurados ? { onDatosRestaurados } : {})}
          onPlanificacionReiniciada={() => {
            onDatosRestaurados?.();
            void navegar("/calendario");
          }}
        />
      ) : (
        <p className="estado-vacio-lineal">El respaldo no está disponible.</p>
      )}
    </div>
  );
}
