import { useRef, useState } from "react";
import {
  CONFIRMACION_REINICIO_PLANIFICACION,
  type ImpactoReinicioPlanificacion,
} from "../../aplicacion";
import { useDialogoModal } from "../hooks/useDialogoModal";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface DialogoReiniciarPlanificacionProps {
  readonly impacto: ImpactoReinicioPlanificacion;
  readonly procesando: boolean;
  readonly error?: string;
  readonly onCancelar: () => void;
  readonly onConfirmar: (confirmacion: string) => void;
}

export function DialogoReiniciarPlanificacion({
  impacto,
  procesando,
  error,
  onCancelar,
  onConfirmar,
}: DialogoReiniciarPlanificacionProps) {
  const confirmacionRef = useRef<HTMLInputElement>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const { dialogoRef, gestionarTeclado } = useDialogoModal({
    focoInicialRef: confirmacionRef,
    bloqueado: procesando,
    onCerrar: onCancelar,
  });
  useEnfoqueError(dialogoRef, error ?? "");

  return (
    <div className="fondo-dialogo" role="presentation">
      <div
        ref={dialogoRef}
        className="dialogo-confirmacion dialogo-restauracion"
        role="dialog"
        aria-modal="true"
        aria-busy={procesando}
        aria-labelledby="titulo-reiniciar-planificacion"
        aria-describedby="consecuencias-reiniciar-planificacion"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">Retiro atómico de planificación activa</p>
        <h2 id="titulo-reiniciar-planificacion">Reiniciar planificación</h2>
        <p id="consecuencias-reiniciar-planificacion">
          Se retirarán los compromisos todavía activos. El perfil, las
          actividades reutilizables, los puntos, el inventario y la historia
          confirmada permanecerán intactos.
        </p>

        <dl className="resumen-impacto-eliminacion">
          <div>
            <dt>Registros o bloques retirados</dt>
            <dd>{impacto.totalEliminaciones}</dd>
          </div>
          <div>
            <dt>Registros históricos conservados</dt>
            <dd>{impacto.totalConservados}</dd>
          </div>
          <div>
            <dt>Cortes activos</dt>
            <dd>{impacto.eliminar.cortesActivos}</dd>
          </div>
          <div>
            <dt>Sesiones abiertas</dt>
            <dd>{impacto.eliminar.sesionesAbiertas}</dd>
          </div>
        </dl>

        {error && (
          <p
            className="mensaje-error mensaje-formulario"
            role="alert"
            tabIndex={-1}
          >
            {error}
          </p>
        )}

        <div className="confirmacion-reforzada">
          <div className="campo">
            <label htmlFor="confirmacion-reiniciar-planificacion">
              Escribe <strong>{CONFIRMACION_REINICIO_PLANIFICACION}</strong>{" "}
              para retirar la planificación activa
            </label>
            <input
              ref={confirmacionRef}
              id="confirmacion-reiniciar-planificacion"
              value={confirmacion}
              onChange={(evento) => setConfirmacion(evento.target.value)}
              autoComplete="off"
              aria-describedby="ayuda-confirmacion-reinicio"
            />
            <small id="ayuda-confirmacion-reinicio">
              La operación se habilita sólo cuando el texto coincide
              exactamente.
            </small>
          </div>
          <div className="acciones-formulario">
            <button
              className="boton-secundario"
              type="button"
              disabled={procesando}
              onClick={onCancelar}
            >
              Cancelar
            </button>
            <button
              className="boton-primario boton-destructivo"
              type="button"
              disabled={
                procesando ||
                confirmacion !== CONFIRMACION_REINICIO_PLANIFICACION
              }
              aria-describedby="ayuda-confirmacion-reinicio"
              onClick={() => onConfirmar(confirmacion)}
            >
              {procesando ? "Reiniciando…" : "Reiniciar planificación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
