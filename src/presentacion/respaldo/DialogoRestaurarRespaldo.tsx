import { useRef, useState } from "react";
import {
  CONFIRMACION_RESTAURACION,
  type PlanRestauracionRespaldo,
} from "../../aplicacion";
import { useDialogoModal } from "../hooks/useDialogoModal";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface DialogoRestaurarRespaldoProps {
  readonly plan: PlanRestauracionRespaldo;
  readonly procesando: boolean;
  readonly error?: string | undefined;
  readonly onCancelar: () => void;
  readonly onConfirmar: (confirmacion: string) => void;
}

export function DialogoRestaurarRespaldo({
  plan,
  procesando,
  error,
  onCancelar,
  onConfirmar,
}: DialogoRestaurarRespaldoProps) {
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
        aria-labelledby="titulo-restaurar-respaldo"
        aria-describedby="consecuencias-restaurar-respaldo"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">Reemplazo total controlado</p>
        <h2 id="titulo-restaurar-respaldo">Restaurar respaldo</h2>
        <p id="consecuencias-restaurar-respaldo">
          Esta operación reemplazará las trece colecciones locales. Si cualquier
          registro falla, IndexedDB revertirá la operación completa.
        </p>

        <dl className="resumen-impacto-eliminacion">
          <div>
            <dt>Formato</dt>
            <dd>V{plan.versionFormatoOrigen}</dd>
          </div>
          <div>
            <dt>Base de origen</dt>
            <dd>V{plan.versionBaseDatosOrigen}</dd>
          </div>
          <div>
            <dt>Registros</dt>
            <dd>{plan.totalRegistros}</dd>
          </div>
          <div>
            <dt>Ruta de migración</dt>
            <dd>V{plan.versionFormatoOrigen} → actual</dd>
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
            <label htmlFor="confirmacion-restaurar-respaldo">
              Escribe <strong>{CONFIRMACION_RESTAURACION}</strong> para
              reemplazar los datos
            </label>
            <input
              ref={confirmacionRef}
              id="confirmacion-restaurar-respaldo"
              value={confirmacion}
              onChange={(evento) => setConfirmacion(evento.target.value)}
              autoComplete="off"
              aria-describedby="ayuda-confirmacion-restauracion"
            />
            <small id="ayuda-confirmacion-restauracion">
              La acción se habilita sólo cuando el texto coincide exactamente.
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
                procesando || confirmacion !== CONFIRMACION_RESTAURACION
              }
              aria-describedby="ayuda-confirmacion-restauracion"
              onClick={() => onConfirmar(confirmacion)}
            >
              {procesando ? "Restaurando…" : "Reemplazar estado local"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
