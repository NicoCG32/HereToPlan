import { useRef, useState, type FormEvent } from "react";
import type { ResultadoGuardarPerfilUsuario } from "../../aplicacion";
import { useDialogoModal } from "../hooks/useDialogoModal";

interface DialogoPerfilUsuarioProps {
  readonly modo: "BIENVENIDA" | "EDICION";
  readonly nombreInicial?: string;
  readonly onGuardar: (
    nombreVisible: string,
  ) => Promise<ResultadoGuardarPerfilUsuario>;
  readonly onCancelar?: () => void;
}

export function DialogoPerfilUsuario({
  modo,
  nombreInicial = "",
  onGuardar,
  onCancelar,
}: DialogoPerfilUsuarioProps) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const nombreRef = useRef<HTMLInputElement>(null);
  const { dialogoRef, gestionarTeclado } = useDialogoModal({
    focoInicialRef: nombreRef,
    bloqueado: guardando || modo === "BIENVENIDA",
    onCerrar: () => onCancelar?.(),
  });

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setGuardando(true);
    setError(undefined);
    try {
      const resultado = await onGuardar(nombre);
      if (!resultado.exito) {
        setError(resultado.error.mensaje);
        queueMicrotask(() => nombreRef.current?.focus());
      }
    } catch (causa: unknown) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No fue posible guardar el perfil local.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const bienvenida = modo === "BIENVENIDA";
  return (
    <div className="fondo-dialogo" role="presentation">
      <div
        ref={dialogoRef}
        className="dialogo-confirmacion dialogo-perfil"
        role="dialog"
        aria-modal="true"
        aria-busy={guardando}
        aria-labelledby="titulo-dialogo-perfil"
        aria-describedby="descripcion-dialogo-perfil"
        onKeyDown={gestionarTeclado}
      >
        <p className="sobrelinea">
          {bienvenida ? "Bienvenida" : "Identidad local"}
        </p>
        <h2 id="titulo-dialogo-perfil">
          {bienvenida ? "Antes de comenzar" : "Editar nombre visible"}
        </h2>
        <p id="descripcion-dialogo-perfil">
          {bienvenida
            ? "HereToPlan guarda tu planificación y este nombre únicamente en este dispositivo. No crea una cuenta ni solicita datos sensibles."
            : "Este cambio identifica tu espacio de planificación y no modifica puntos, agendas ni actividades."}
        </p>
        <form onSubmit={(evento) => void enviar(evento)} noValidate>
          <div className="campo">
            <label htmlFor="nombre-visible-perfil">Nombre visible</label>
            <input
              ref={nombreRef}
              id="nombre-visible-perfil"
              value={nombre}
              maxLength={60}
              autoComplete="name"
              onChange={(evento) => setNombre(evento.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? "error-nombre-perfil" : "ayuda-nombre-perfil"
              }
              disabled={guardando}
            />
            <small id="ayuda-nombre-perfil">Máximo 60 caracteres.</small>
            {error && (
              <p
                id="error-nombre-perfil"
                className="mensaje-error"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
          <div className="acciones-formulario">
            {!bienvenida && onCancelar && (
              <button
                className="boton-secundario"
                type="button"
                onClick={onCancelar}
                disabled={guardando}
              >
                Cancelar
              </button>
            )}
            <button
              className="boton-primario"
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? "Guardando…"
                : bienvenida
                  ? "Comenzar"
                  : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
