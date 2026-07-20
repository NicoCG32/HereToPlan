import { useEffect, useRef, type KeyboardEvent } from "react";
import type { VistaPreviaDiaLibreDto } from "../../aplicacion";

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
  const dialogoRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelarRef.current?.focus(), []);

  const gestionarTeclado = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === "Escape" && !procesando) {
      evento.preventDefault();
      onCancelar();
      return;
    }
    if (evento.key !== "Tab") return;
    const controles = dialogoRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (!controles?.length) return;
    const primero = controles[0];
    const ultimo = controles[controles.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo?.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero?.focus();
    }
  };

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
          <p className="mensaje-error mensaje-formulario" role="alert">
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
