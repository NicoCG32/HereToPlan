import { useRef } from "react";
import type { RecompensaCatalogoDto } from "../../aplicacion";
import { useDialogoModal } from "../hooks/useDialogoModal";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface DialogoAdquirirRecompensaProps {
  readonly recompensa: RecompensaCatalogoDto;
  readonly procesando: boolean;
  readonly error?: string;
  readonly onCancelar: () => void;
  readonly onConfirmar: () => void;
}

export function DialogoAdquirirRecompensa({
  recompensa,
  procesando,
  error,
  onCancelar,
  onConfirmar,
}: DialogoAdquirirRecompensaProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const { dialogoRef, gestionarTeclado } = useDialogoModal({
    focoInicialRef: cancelarRef,
    bloqueado: procesando,
    onCerrar: onCancelar,
  });
  useEnfoqueError(dialogoRef, error ?? "");
  const saldoPosterior = recompensa.saldoActual - recompensa.costoPuntos;

  return (
    <div className="fondo-dialogo" role="presentation">
      <div
        ref={dialogoRef}
        className="dialogo-confirmacion dialogo-adquisicion-recompensa"
        role="dialog"
        aria-modal="true"
        aria-busy={procesando}
        aria-labelledby="titulo-confirmar-adquisicion"
        aria-describedby="consecuencias-adquisicion"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">Confirmación de compra</p>
        <h2 id="titulo-confirmar-adquisicion">Adquirir {recompensa.nombre}</h2>
        <p id="consecuencias-adquisicion">
          Se gastarán {recompensa.costoPuntos} puntos. La unidad quedará
          disponible en el inventario y no modificará todavía tu calendario.
        </p>
        <dl className="resumen-resolucion-bloque">
          <div>
            <dt>Saldo actual</dt>
            <dd>{recompensa.saldoActual}</dd>
          </div>
          <div>
            <dt>Saldo posterior</dt>
            <dd>{saldoPosterior}</dd>
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
            disabled={procesando}
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            className="boton-primario"
            type="button"
            disabled={procesando}
            onClick={onConfirmar}
          >
            {procesando ? "Adquiriendo…" : "Confirmar adquisición"}
          </button>
        </div>
      </div>
    </div>
  );
}
