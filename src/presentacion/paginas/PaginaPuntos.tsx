import { PanelBilletera } from "../puntos/PanelBilletera";
import type { ServiciosPuntos } from "../puntos/ServiciosPuntos";
import { PanelDiaLibre } from "../recompensas/PanelDiaLibre";
import type { ServiciosRecompensas } from "../recompensas/ServiciosRecompensas";
import { PanelInventarioRecompensas } from "../recompensas/PanelInventarioRecompensas";
import type { ServiciosInventarioRecompensas } from "../recompensas/ServiciosInventarioRecompensas";
import { PanelRecuperacion } from "../recuperacion/PanelRecuperacion";
import type { ServiciosRecuperacion } from "../recuperacion/ServiciosRecuperacion";
import { EncabezadoPagina } from "./EncabezadoPagina";
import "./PaginaPuntos.css";

interface PaginaPuntosProps {
  readonly serviciosPuntos?: ServiciosPuntos;
  readonly serviciosRecompensas?: ServiciosRecompensas;
  readonly serviciosInventarioRecompensas?: ServiciosInventarioRecompensas;
  readonly serviciosRecuperacion?: ServiciosRecuperacion;
  readonly revisionDatos: number;
  readonly onDatosCambiados: () => void;
}

export function PaginaPuntos({
  serviciosPuntos,
  serviciosRecompensas,
  serviciosInventarioRecompensas,
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
      {serviciosInventarioRecompensas && (
        <PanelInventarioRecompensas
          servicios={serviciosInventarioRecompensas}
          revision={revisionDatos}
          onInventarioCambiado={onDatosCambiados}
        />
      )}
      {serviciosRecompensas && !serviciosInventarioRecompensas && (
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
      {!serviciosPuntos &&
        !serviciosRecompensas &&
        !serviciosInventarioRecompensas &&
        !serviciosRecuperacion && (
          <p className="estado-vacio-lineal">La economía no está disponible.</p>
        )}
    </div>
  );
}
