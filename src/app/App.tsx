import { PanelCapas } from "../presentacion/componentes/PanelCapas";
import { obtenerCapasDemostracion } from "./configurarAplicacion";

export function App() {
  return (
    <main className="contenedor-principal">
      <header className="encabezado">
        <p className="etiqueta">Planificación personal consciente</p>
        <h1>HereToPlan</h1>
        <p>
          HereToPlan combina compromisos, flexibilidad y trazabilidad para
          construir planes realistas sin convertirlos en un sistema punitivo.
        </p>
      </header>

      <PanelCapas capas={obtenerCapasDemostracion()} />
    </main>
  );
}
