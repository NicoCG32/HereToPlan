import { useRef } from "react";
import { useSesionAplicacion } from "./ContextoSesionAplicacion";

export function HudAplicacion() {
  const sesion = useSesionAplicacion();
  const editarRef = useRef<HTMLButtonElement>(null);

  return (
    <header className="hud-superior-estructural" aria-label="Resumen personal">
      <div className="identidad-hud">
        <p className="sobrelinea">HereToPlan</p>
        <strong>
          {sesion?.perfil?.nombreVisible ?? "Tu espacio de planificación"}
        </strong>
        <p>{sesion?.frase ?? "Planifica, cultiva y florece"}</p>
      </div>
      <div className="acciones-hud">
        <output
          className="saldo-hud"
          aria-label={`${sesion?.saldoPuntos ?? 0} puntos disponibles`}
        >
          <strong>{sesion?.saldoPuntos ?? 0}</strong>
          <span>puntos</span>
        </output>
        {sesion?.perfil && (
          <button
            ref={editarRef}
            className="boton-texto"
            type="button"
            onClick={() => {
              if (editarRef.current)
                sesion.abrirEdicionPerfil(editarRef.current);
            }}
          >
            Editar perfil
          </button>
        )}
        {sesion?.carga === "ERROR" && (
          <button
            className="boton-texto"
            type="button"
            onClick={() => void sesion.refrescarProyecciones()}
          >
            Reintentar resumen
          </button>
        )}
      </div>
    </header>
  );
}
