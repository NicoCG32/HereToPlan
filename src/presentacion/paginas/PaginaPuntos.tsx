import { PanelBilletera } from "../puntos/PanelBilletera";
import type { ServiciosPuntos } from "../puntos/ServiciosPuntos";
import { PanelDiaLibre } from "../recompensas/PanelDiaLibre";
import type { ServiciosRecompensas } from "../recompensas/ServiciosRecompensas";
import { PanelRecuperacion } from "../recuperacion/PanelRecuperacion";
import type { ServiciosRecuperacion } from "../recuperacion/ServiciosRecuperacion";
import { EncabezadoPagina } from "./EncabezadoPagina";

interface PaginaPuntosProps {
  readonly serviciosPuntos?: ServiciosPuntos;
  readonly serviciosRecompensas?: ServiciosRecompensas;
  readonly serviciosRecuperacion?: ServiciosRecuperacion;
  readonly revisionDatos: number;
  readonly onDatosCambiados: () => void;
}

export function PaginaPuntos({
  serviciosPuntos,
  serviciosRecompensas,
  serviciosRecuperacion,
  revisionDatos,
  onDatosCambiados,
}: PaginaPuntosProps) {
  return (
    <div className="pagina-aplicacion pagina-puntos">
      <EncabezadoPagina
        sobrelinea="Economía y flexibilidad"
        titulo="Puntos"
        descripcion="Consulta movimientos trazables, prepara recompensas y administra recuperación sin confundir flexibilidad con eliminación de compromisos."
      />
      {serviciosPuntos && (
        <PanelBilletera servicios={serviciosPuntos} revision={revisionDatos} />
      )}
      {serviciosRecompensas && (
        <PanelDiaLibre
          servicios={serviciosRecompensas}
          onCanjeConfirmado={onDatosCambiados}
        />
      )}
      {serviciosRecuperacion && (
        <PanelRecuperacion
          servicios={serviciosRecuperacion}
          revision={revisionDatos}
          onRecuperacionCambiada={onDatosCambiados}
        />
      )}
      {!serviciosPuntos && !serviciosRecompensas && !serviciosRecuperacion && (
        <p className="estado-vacio-lineal">La economía no está disponible.</p>
      )}
    </div>
  );
}
