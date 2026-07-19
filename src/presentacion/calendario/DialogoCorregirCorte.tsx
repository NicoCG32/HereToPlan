import { useEffect, useRef, type KeyboardEvent } from "react";
import type { CortePlanificacionDto } from "../../aplicacion";

interface DialogoCorregirCorteProps {
  readonly corte: CortePlanificacionDto;
  readonly procesando: boolean;
  readonly error?: string;
  readonly onCancelar: () => void;
  readonly onConfirmar: () => void;
}

export function DialogoCorregirCorte({
  corte,
  procesando,
  error,
  onCancelar,
  onConfirmar,
}: DialogoCorregirCorteProps) {
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
    if (!controles || controles.length === 0) return;
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
        className="dialogo-confirmacion dialogo-corregir-corte"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-corregir-corte"
        aria-describedby="consecuencias-corregir-corte"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">Corrección durante la gracia</p>
        <h2 id="titulo-corregir-corte">Volver a editar la planificación</h2>
        <p id="consecuencias-corregir-corte">
          Se cancelará el vencimiento actual y los {corte.cantidadBloques}{" "}
          {corte.cantidadBloques === 1 ? "bloque" : "bloques"} volverán a ser
          editables. Antes de asignarlos nuevamente tendrás que revisar la
          planificación completa.
        </p>

        <ul className="lista-revision-corte">
          {corte.titulosBloques.map((titulo, indice) => (
            <li key={corte.bloqueIds[indice] ?? `${corte.id}-${indice}`}>
              <strong>{titulo}</strong>
            </li>
          ))}
        </ul>

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
            Mantener planificación
          </button>
          <button
            className="boton-primario"
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
          >
            {procesando ? "Volviendo a borrador…" : "Volver a editar"}
          </button>
        </div>
      </div>
    </div>
  );
}
