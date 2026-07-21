import { useRef } from "react";
import type { ActividadDto } from "../../aplicacion";
import { useDialogoModal } from "../hooks/useDialogoModal";

interface DialogoEliminarActividadProps {
  readonly actividad: ActividadDto;
  readonly procesando: boolean;
  readonly error?: string;
  readonly onCancelar: () => void;
  readonly onConfirmar: () => void;
}

export function DialogoEliminarActividad({
  actividad,
  procesando,
  error,
  onCancelar,
  onConfirmar,
}: DialogoEliminarActividadProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const { dialogoRef, gestionarTeclado } = useDialogoModal({
    focoInicialRef: cancelarRef,
    bloqueado: procesando,
    onCerrar: onCancelar,
  });
  return (
    <div className="fondo-dialogo" role="presentation">
      <div
        ref={dialogoRef}
        className="dialogo-confirmacion"
        role="dialog"
        aria-modal="true"
        aria-busy={procesando}
        aria-labelledby="titulo-eliminar-actividad"
        aria-describedby="consecuencia-eliminar-actividad"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">Catálogo de actividades</p>
        <h2 id="titulo-eliminar-actividad">Eliminar {actividad.titulo}</h2>
        <p id="consecuencia-eliminar-actividad">
          Solo puede eliminarse una actividad sin bloques ni historia. Si está
          referenciada, HereToPlan rechazará la operación y conservará todos sus
          datos.
        </p>
        {error && (
          <p className="mensaje-error" role="alert" tabIndex={-1}>
            {error}
          </p>
        )}
        <div className="acciones-formulario">
          <button
            ref={cancelarRef}
            className="boton-secundario"
            type="button"
            onClick={onCancelar}
            disabled={procesando}
          >
            Cancelar
          </button>
          <button
            className="boton-primario boton-destructivo"
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
          >
            {procesando ? "Eliminando…" : "Eliminar actividad"}
          </button>
        </div>
      </div>
    </div>
  );
}
