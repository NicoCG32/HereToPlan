import { useRef } from "react";
import type { VistaPreviaAplicacionDiaLibreDto } from "../../aplicacion";
import { useDialogoModal } from "../hooks/useDialogoModal";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface DialogoAplicarDiaLibreProps {
  readonly vistaPrevia: VistaPreviaAplicacionDiaLibreDto;
  readonly procesando: boolean;
  readonly error?: string;
  readonly onCancelar: () => void;
  readonly onConfirmar: () => void;
}

export function DialogoAplicarDiaLibre({
  vistaPrevia,
  procesando,
  error,
  onCancelar,
  onConfirmar,
}: DialogoAplicarDiaLibreProps) {
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
        className="dialogo-confirmacion dialogo-aplicacion-dia-libre"
        role="dialog"
        aria-modal="true"
        aria-busy={procesando}
        aria-labelledby="titulo-aplicar-dia-libre"
        aria-describedby="consecuencias-aplicar-dia-libre"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">Vista previa obligatoria</p>
        <h2 id="titulo-aplicar-dia-libre">
          Aplicar {vistaPrevia.unidad.nombre}
        </h2>
        <p id="consecuencias-aplicar-dia-libre">
          La unidad sólo se consumirá si todos los efectos se confirman juntos.
          Esta acción no crea ni modifica bloques del calendario.
        </p>
        <dl className="resumen-resolucion-bloque">
          <div>
            <dt>Fecha objetivo</dt>
            <dd>{vistaPrevia.fechaObjetivo}</dd>
          </div>
          <div>
            <dt>Bloques excusables</dt>
            <dd>{vistaPrevia.afectados.length}</dd>
          </div>
          <div>
            <dt>Bloques protegidos</dt>
            <dd>{vistaPrevia.protegidos.length}</dd>
          </div>
        </dl>
        {vistaPrevia.afectados.length > 0 && (
          <section aria-labelledby="bloques-excusables-dia-libre">
            <h3 id="bloques-excusables-dia-libre">Se excusarán</h3>
            <ul>
              {vistaPrevia.afectados.map((bloque) => (
                <li key={bloque.id}>
                  {bloque.titulo} · {bloque.contextoNombre}
                </li>
              ))}
            </ul>
          </section>
        )}
        {vistaPrevia.protegidos.length > 0 && (
          <section aria-labelledby="bloques-protegidos-dia-libre">
            <h3 id="bloques-protegidos-dia-libre">Permanecerán protegidos</h3>
            <ul>
              {vistaPrevia.protegidos.map((bloque) => (
                <li key={bloque.id}>
                  {bloque.titulo} · {etiquetaMotivo(bloque.motivo)}
                </li>
              ))}
            </ul>
          </section>
        )}
        {!vistaPrevia.puedeAplicar && (
          <p className="motivo-control-inhabilitado" id="motivo-aplicacion">
            La fecha no contiene compromisos flexibles elegibles.
          </p>
        )}
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
            disabled={procesando}
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            className="boton-primario"
            type="button"
            disabled={procesando || !vistaPrevia.puedeAplicar}
            aria-describedby={
              vistaPrevia.puedeAplicar ? undefined : "motivo-aplicacion"
            }
            onClick={onConfirmar}
          >
            {procesando ? "Aplicando…" : "Confirmar aplicación"}
          </button>
        </div>
      </div>
    </div>
  );
}

function etiquetaMotivo(
  motivo: VistaPreviaAplicacionDiaLibreDto["protegidos"][number]["motivo"],
): string {
  const etiquetas = {
    YA_RESUELTO: "ya resuelto",
    YA_EXCUSADO: "ya excusado",
    COMPROMISO_ESTRICTO: "compromiso estricto",
    AUTORIDAD_EXTERNA: "autoridad externa",
    EXCUSION_NO_PERMITIDA: "la política no permite excusarlo",
  } as const;
  return etiquetas[motivo];
}
