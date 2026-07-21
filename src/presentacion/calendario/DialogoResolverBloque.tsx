import { useEffect, useRef, type KeyboardEvent } from "react";
import type { BloqueCalendarioDto } from "../../aplicacion";

export type AccionResolucionBloque = "COMPLETAR" | "INCUMPLIR";

interface DialogoResolverBloqueProps {
  readonly bloque: BloqueCalendarioDto;
  readonly accion: AccionResolucionBloque;
  readonly procesando: boolean;
  readonly error?: string;
  readonly onCancelar: () => void;
  readonly onConfirmar: () => void;
}

export function DialogoResolverBloque({
  bloque,
  accion,
  procesando,
  error,
  onCancelar,
  onConfirmar,
}: DialogoResolverBloqueProps) {
  const dialogoRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const completar = accion === "COMPLETAR";
  const tituloId = completar
    ? "titulo-completar-bloque"
    : "titulo-incumplir-bloque";
  const descripcionId = completar
    ? "consecuencias-completar-bloque"
    : "consecuencias-incumplir-bloque";

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
        className={`dialogo-confirmacion dialogo-resolucion-bloque${completar ? "" : " dialogo-resolucion-incumplida"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcionId}
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">
          {completar
            ? "Confirmación de cumplimiento"
            : "Registro consciente del resultado"}
        </p>
        <h2 id={tituloId}>
          {completar ? "Completar" : "Marcar incumplido"} {bloque.titulo}
        </h2>
        <p id={descripcionId}>
          {completar
            ? "Se registrará el cumplimiento con su instante y origen. La resolución no podrá cambiarse después."
            : "Se conservará el incumplimiento como información histórica. No genera deuda ni resta puntos, pero la resolución no podrá cambiarse después."}
        </p>
        <dl className="resumen-resolucion-bloque">
          <div>
            <dt>Fecha planificada</dt>
            <dd>{bloque.fecha}</dd>
          </div>
          <div>
            <dt>Tiempo planificado</dt>
            <dd>
              {bloque.reduccionCarga?.minutosEfectivos ??
                bloque.minutosPlanificados}{" "}
              min
              {bloque.reduccionCarga
                ? ` (${bloque.minutosPlanificados} min originales)`
                : ""}
            </dd>
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
            className={completar ? "boton-primario" : "boton-destructivo"}
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
          >
            {procesando
              ? "Registrando…"
              : completar
                ? "Confirmar cumplimiento"
                : "Confirmar incumplimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
