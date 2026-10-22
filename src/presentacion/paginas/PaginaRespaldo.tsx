import { PanelRespaldo } from "../respaldo/PanelRespaldo";
import type { ServiciosRespaldo } from "../respaldo/ServiciosRespaldo";
import ilustracionRespaldo from "../recursos/ilustraciones/paginas/ilustracion-pagina-respaldo.svg";
import { EncabezadoPagina } from "./EncabezadoPagina";
import { useNavigate } from "react-router-dom";
import "./PaginaRespaldo.css";

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
        descripcion="Guarda una copia de tus datos o recupera un respaldo. Puedes revisar un archivo antes de decidir si lo restauras."
        ilustracion={ilustracionRespaldo}
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
