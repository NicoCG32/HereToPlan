import { PanelRespaldo } from "../respaldo/PanelRespaldo";
import type { ServiciosRespaldo } from "../respaldo/ServiciosRespaldo";
import { EncabezadoPagina } from "./EncabezadoPagina";

interface PaginaRespaldoProps {
  readonly serviciosRespaldo?: ServiciosRespaldo;
}

export function PaginaRespaldo({ serviciosRespaldo }: PaginaRespaldoProps) {
  return (
    <div className="pagina-aplicacion pagina-respaldo">
      <EncabezadoPagina
        sobrelinea="Portabilidad y seguridad"
        titulo="Respaldo"
        descripcion="Exporta, analiza y restaura el estado local fuera del flujo cotidiano. Analizar un archivo nunca modifica la información vigente."
      />
      {serviciosRespaldo ? (
        <PanelRespaldo servicios={serviciosRespaldo} />
      ) : (
        <p className="estado-vacio-lineal">El respaldo no está disponible.</p>
      )}
    </div>
  );
}
