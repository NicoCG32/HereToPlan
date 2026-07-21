import { useRef } from "react";
import type { RevisionCortePlanificacionDto } from "../../aplicacion";
import { useDialogoModal } from "../hooks/useDialogoModal";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface DialogoRevisarCorteProps {
  readonly revision: RevisionCortePlanificacionDto;
  readonly procesando: boolean;
  readonly error?: string;
  readonly onCancelar: () => void;
  readonly onAsignar: () => void;
}

export function DialogoRevisarCorte({
  revision,
  procesando,
  error,
  onCancelar,
  onAsignar,
}: DialogoRevisarCorteProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const { dialogoRef, gestionarTeclado } = useDialogoModal({
    focoInicialRef: cancelarRef,
    bloqueado: procesando,
    onCerrar: onCancelar,
  });
  useEnfoqueError(dialogoRef, error ?? "");

  return (
    <div className="fondo-dialogo" role="presentation">
      <div
        ref={dialogoRef}
        className="dialogo-confirmacion dialogo-revision-corte"
        role="dialog"
        aria-modal="true"
        aria-busy={procesando}
        aria-labelledby="titulo-revisar-corte"
        aria-describedby="consecuencias-revisar-corte"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">Decisión de planificación</p>
        <h2 id="titulo-revisar-corte">Revisar planificación</h2>
        <p id="consecuencias-revisar-corte">
          Al asignarla comenzará una gracia de diez minutos. Después del
          vencimiento, esta selección quedará confirmada y protegida.
        </p>

        <dl className="resumen-revision-corte">
          <div>
            <dt>Bloques</dt>
            <dd>{revision.cantidadBloques}</dd>
          </div>
          <div>
            <dt>Tiempo total</dt>
            <dd>{revision.minutosPlanificados} min</dd>
          </div>
          <div>
            <dt>Estrictos</dt>
            <dd>{revision.cantidadEstrictos}</dd>
          </div>
          <div>
            <dt>Flexibles</dt>
            <dd>{revision.cantidadFlexibles}</dd>
          </div>
        </dl>

        <p className="rango-revision-corte">
          Período seleccionado: <strong>{revision.fechaInicio}</strong> —{" "}
          <strong>{revision.fechaFin}</strong>
        </p>
        <ul className="lista-revision-corte">
          {revision.bloques.map((bloque) => (
            <li key={bloque.id}>
              <div>
                <strong>{bloque.titulo}</strong>
                <span>{bloque.fecha}</span>
              </div>
              <span>
                {bloque.minutosPlanificados} min ·{" "}
                {bloque.rigidez === "ESTRICTO" ? "Estricta" : "Flexible"}
              </span>
            </li>
          ))}
        </ul>

        {error && (
          <p
            className="mensaje-error mensaje-formulario"
            role="alert"
            tabIndex={-1}
          >
            {error}
          </p>
        )}

        <div className="acciones-dialogo-eliminacion">
          <button
            ref={cancelarRef}
            className="boton-secundario"
            type="button"
            onClick={onCancelar}
            disabled={procesando}
          >
            Volver al calendario
          </button>
          <button
            className="boton-primario"
            type="button"
            onClick={onAsignar}
            disabled={procesando}
          >
            {procesando ? "Asignando…" : "Asignar planificación"}
          </button>
        </div>
      </div>
    </div>
  );
}
