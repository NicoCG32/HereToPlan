import type { ModoSeguimientoDto } from "../../aplicacion";

interface SelectorModoSeguimientoProps {
  readonly valor: ModoSeguimientoDto;
  readonly deshabilitado?: boolean;
  readonly error?: string;
  readonly onCambiar: (modo: ModoSeguimientoDto) => void;
}

export function SelectorModoSeguimiento({
  valor,
  deshabilitado = false,
  error,
  onCambiar,
}: SelectorModoSeguimientoProps) {
  return (
    <fieldset
      className="campo campo-ancho selector-politica selector-modo-seguimiento"
      aria-invalid={Boolean(error)}
      aria-describedby={error ? "error-modo-seguimiento" : undefined}
    >
      <legend>Modo de seguimiento</legend>
      <label>
        <input
          type="radio"
          name="modo-seguimiento"
          value="MANUAL"
          checked={valor === "MANUAL"}
          onChange={() => onCambiar("MANUAL")}
          disabled={deshabilitado}
        />
        Manual
        <small>
          La actividad se completa o se marca incumplida sin medir tiempo.
        </small>
      </label>
      <small>
        El modo puede cambiarse mientras la actividad aún no tenga bloques
        programados; así se conserva una ejecución histórica inequívoca.
      </small>
      <label>
        <input
          type="radio"
          name="modo-seguimiento"
          value="CRONOMETRADO"
          checked={valor === "CRONOMETRADO"}
          onChange={() => onCambiar("CRONOMETRADO")}
          disabled={deshabilitado}
        />
        Cronometrado
        <small>
          Permite iniciar, pausar, reanudar y detener una sesión antes de
          resolver la actividad.
        </small>
      </label>
      {error && (
        <p id="error-modo-seguimiento" className="mensaje-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
