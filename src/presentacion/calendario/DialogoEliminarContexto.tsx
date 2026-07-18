import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ImpactoEliminacionContextoDto } from "../../aplicacion";

interface DialogoEliminarContextoProps {
  readonly impacto: ImpactoEliminacionContextoDto;
  readonly procesando: boolean;
  readonly error?: string;
  readonly onCancelar: () => void;
  readonly onTrasladarALibre: () => void;
  readonly onEliminarBorradores: (confirmacion: string) => void;
}

export function DialogoEliminarContexto({
  impacto,
  procesando,
  error,
  onCancelar,
  onTrasladarALibre,
  onEliminarBorradores,
}: DialogoEliminarContextoProps) {
  const dialogoRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const confirmacionRef = useRef<HTMLInputElement>(null);
  const [confirmacionReforzada, setConfirmacionReforzada] = useState(false);
  const [textoConfirmacion, setTextoConfirmacion] = useState("");

  useEffect(() => {
    if (confirmacionReforzada) confirmacionRef.current?.focus();
    else cancelarRef.current?.focus();
  }, [confirmacionReforzada]);

  const gestionarTeclado = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === "Escape" && !procesando) {
      evento.preventDefault();
      onCancelar();
      return;
    }
    if (evento.key !== "Tab") return;
    const controles = dialogoRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
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
        className="dialogo-confirmacion"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-eliminar-contexto"
        aria-describedby="consecuencias-eliminar-contexto"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">Acción destructiva controlada</p>
        <h2 id="titulo-eliminar-contexto">Eliminar agenda {impacto.nombre}</h2>
        <p id="consecuencias-eliminar-contexto">
          El contexto organizativo desaparecerá, pero ningún compromiso ni
          registro confirmado será eliminado.
        </p>

        <dl className="resumen-impacto-eliminacion">
          <div>
            <dt>Rango</dt>
            <dd>{formatearRango(impacto)}</dd>
          </div>
          <div>
            <dt>Actividades relacionadas</dt>
            <dd>{impacto.cantidadActividades}</dd>
          </div>
          <div>
            <dt>Bloques editables</dt>
            <dd>{impacto.cantidadBloquesEditables}</dd>
          </div>
          <div>
            <dt>Registros confirmados protegidos</dt>
            <dd>{impacto.cantidadRegistrosConfirmados}</dd>
          </div>
        </dl>

        {error && (
          <p className="mensaje-error mensaje-formulario" role="alert">
            {error}
          </p>
        )}

        {confirmacionReforzada ? (
          <div className="confirmacion-reforzada">
            <p>
              Esta alternativa elimina solamente los bloques todavía editables.
              El historial confirmado permanece intacto.
            </p>
            <div className="campo">
              <label htmlFor="confirmacion-eliminar-contexto">
                Escribe <strong>{impacto.nombre}</strong> para confirmar
              </label>
              <input
                ref={confirmacionRef}
                id="confirmacion-eliminar-contexto"
                value={textoConfirmacion}
                onChange={(evento) => setTextoConfirmacion(evento.target.value)}
                autoComplete="off"
                aria-describedby="ayuda-confirmacion-eliminar-contexto"
              />
              <small id="ayuda-confirmacion-eliminar-contexto">
                La acción se habilita solo cuando el nombre coincide
                exactamente.
              </small>
            </div>
            <div className="acciones-formulario">
              <button
                ref={cancelarRef}
                className="boton-secundario"
                type="button"
                onClick={() => {
                  setConfirmacionReforzada(false);
                  setTextoConfirmacion("");
                }}
                disabled={procesando}
              >
                Volver
              </button>
              <button
                className="boton-primario boton-destructivo"
                type="button"
                onClick={() => onEliminarBorradores(textoConfirmacion)}
                disabled={procesando || textoConfirmacion !== impacto.nombre}
                aria-describedby="ayuda-confirmacion-eliminar-contexto"
              >
                {procesando
                  ? "Eliminando…"
                  : "Eliminar agenda y sus borradores"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="alternativa-recomendada">
              Recomendado: trasladar los bloques editables a Libre para
              conservar la planificación.
            </p>
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
                onClick={onTrasladarALibre}
                disabled={procesando}
              >
                {procesando
                  ? "Trasladando…"
                  : "Trasladar a Libre y eliminar agenda"}
              </button>
              <button
                className="boton-texto boton-peligro"
                type="button"
                onClick={() => setConfirmacionReforzada(true)}
                disabled={procesando}
              >
                Eliminar también los borradores
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatearRango(impacto: ImpactoEliminacionContextoDto): string {
  if (!impacto.fechaInicio || !impacto.fechaFin) return "Sin rango cerrado";
  return `${impacto.fechaInicio} — ${impacto.fechaFin}`;
}
