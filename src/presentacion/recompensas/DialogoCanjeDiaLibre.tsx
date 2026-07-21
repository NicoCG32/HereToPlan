import { useRef } from "react";
import type { VistaPreviaDiaLibreDto } from "../../aplicacion";
import { useDialogoModal } from "../hooks/useDialogoModal";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface DialogoCanjeDiaLibreProps {
  readonly vistaPrevia: VistaPreviaDiaLibreDto;
  readonly procesando: boolean;
  readonly error?: string;
  readonly onCancelar: () => void;
  readonly onConfirmar: () => void;
}

export function DialogoCanjeDiaLibre({
  vistaPrevia,
  procesando,
  error,
  onCancelar,
  onConfirmar,
}: DialogoCanjeDiaLibreProps) {
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
        className="dialogo-confirmacion dialogo-canje-dia-libre"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-confirmar-dia-libre"
        aria-describedby="consecuencias-dia-libre"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">Confirmación de recompensa</p>
        <h2 id="titulo-confirmar-dia-libre">Canjear Día libre</h2>
        <p id="consecuencias-dia-libre">
          Se gastarán {vistaPrevia.costoPuntos} puntos y se excusarán{" "}
          {vistaPrevia.afectados.length} bloques del {vistaPrevia.fechaObjetivo}
          . El canje quedará en el historial y no podrá deshacerse.
        </p>
        <dl className="resumen-resolucion-bloque">
          <div>
            <dt>Saldo actual</dt>
            <dd>{vistaPrevia.saldoActual}</dd>
          </div>
          <div>
            <dt>Saldo posterior</dt>
            <dd>{vistaPrevia.saldoPosterior}</dd>
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
        <div className="acciones-dialogo-eliminacion">
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
            className="boton-primario"
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
          >
            {procesando ? "Confirmando…" : "Confirmar canje"}
          </button>
        </div>
      </div>
    </div>
  );
}
