import { useEffect, useRef, useState, type FormEvent } from "react";
import type { BancoRecuperacionDto } from "../../aplicacion";
import { useEnfoqueError } from "../hooks/useEnfoqueError";
import type { ServiciosRecuperacion } from "./ServiciosRecuperacion";

interface PanelRecuperacionProps {
  readonly servicios: ServiciosRecuperacion;
  readonly revision?: number;
  readonly onRecuperacionCambiada?: () => void;
}

type EstadoBanco =
  | Readonly<{ tipo: "cargando" }>
  | Readonly<{ tipo: "listo"; banco: BancoRecuperacionDto }>
  | Readonly<{ tipo: "error"; mensaje: string }>;

export function PanelRecuperacion({
  servicios,
  revision = 0,
  onRecuperacionCambiada,
}: PanelRecuperacionProps) {
  const [estado, setEstado] = useState<EstadoBanco>({ tipo: "cargando" });
  const [bloqueId, setBloqueId] = useState("");
  const [minutos, setMinutos] = useState("15");
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string>();
  const [error, setError] = useState<string>();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const claveError = estado.tipo === "error" ? estado.mensaje : (error ?? "");
  useEnfoqueError(errorRef, claveError);

  useEffect(() => {
    let activo = true;
    void servicios.consultarBanco
      .ejecutar()
      .then((banco) => {
        if (!activo) return;
        setEstado({ tipo: "listo", banco });
        setBloqueId((actual) =>
          banco.reducibles.some((bloque) => bloque.bloqueId === actual)
            ? actual
            : (banco.reducibles[0]?.bloqueId ?? ""),
        );
      })
      .catch((causa: unknown) => {
        if (activo) setEstado({ tipo: "error", mensaje: mensajeError(causa) });
      });
    return () => {
      activo = false;
    };
  }, [revision, servicios]);

  const actualizar = async (texto: string) => {
    const banco = await servicios.consultarBanco.ejecutar();
    setEstado({ tipo: "listo", banco });
    setMensaje(texto);
    onRecuperacionCambiada?.();
  };

  const acreditar = async (id: string) => {
    setProcesando(true);
    setError(undefined);
    setMensaje(undefined);
    try {
      const resultado = await servicios.acreditar.ejecutar({
        bloqueId: id,
        operacionId: servicios.generarOperacionId(),
      });
      await actualizar(
        `Se acreditaron ${resultado.movimiento.minutos} minutos de recuperación.`,
      );
    } catch (causa: unknown) {
      setError(mensajeError(causa));
    } finally {
      setProcesando(false);
    }
  };

  const consumir = async (evento: FormEvent) => {
    evento.preventDefault();
    setProcesando(true);
    setError(undefined);
    setMensaje(undefined);
    try {
      const resultado = await servicios.consumir.ejecutar({
        bloqueId,
        minutos: Number(minutos),
        operacionId: servicios.generarOperacionId(),
      });
      await actualizar(
        `Se redujo la carga futura en ${resultado.movimiento.minutos} minutos.`,
      );
    } catch (causa: unknown) {
      setError(mensajeError(causa));
    } finally {
      setProcesando(false);
    }
  };

  if (estado.tipo === "cargando") {
    return <p role="status">Cargando banco de recuperación…</p>;
  }
  if (estado.tipo === "error") {
    return (
      <p ref={errorRef} role="alert" tabIndex={-1}>
        {estado.mensaje}
      </p>
    );
  }

  const { banco } = estado;
  const bloqueSeleccionado = banco.reducibles.find(
    (bloque) => bloque.bloqueId === bloqueId,
  );
  return (
    <section
      className="panel-agenda panel-recuperacion"
      aria-labelledby="titulo-recuperacion"
    >
      <header className="cabecera-panel-agenda">
        <div>
          <p className="sobrelinea">Descanso compensatorio</p>
          <h2 id="titulo-recuperacion">Banco de recuperación</h2>
          <p className="descripcion-panel">
            Compensa sobretrabajo cronometrado reduciendo carga flexible futura;
            no premia estimaciones infladas ni modifica el historial original.
          </p>
        </div>
        <p
          className="saldo-recuperacion"
          aria-label={`${banco.saldoMinutos} minutos disponibles`}
        >
          <strong>{banco.saldoMinutos}</strong>
          <span>min disponibles</span>
        </p>
      </header>

      <p className="politica-recuperacion">
        Tasa {banco.configuracion.numeradorTasa}:
        {banco.configuracion.denominadorTasa}
        {" · "}máximo {banco.configuracion.maximoDiarioMinutos} min/día y{" "}
        {banco.configuracion.maximoSemanalMinutos} min/semana.
      </p>

      {mensaje && (
        <p className="mensaje-exito" role="status">
          {mensaje}
        </p>
      )}
      {error && (
        <p
          ref={errorRef}
          className="mensaje-error mensaje-formulario"
          role="alert"
          tabIndex={-1}
        >
          {error}
        </p>
      )}

      <div className="columnas-recuperacion">
        <section aria-labelledby="titulo-acreditar-recuperacion">
          <h3 id="titulo-acreditar-recuperacion">Sobretrabajo verificable</h3>
          {banco.acreditables.length === 0 ? (
            <p className="estado-vacio-lineal">
              No hay bloques completados con excedente cronometrado pendiente.
            </p>
          ) : (
            <ul className="lista-recuperacion">
              {banco.acreditables.map((bloque) => (
                <li key={bloque.bloqueId}>
                  <div>
                    <strong>{bloque.titulo}</strong>
                    <span>
                      {bloque.minutosCronometrados} min medidos ·{" "}
                      {bloque.minutosExcedentes} min excedentes
                    </span>
                  </div>
                  <button
                    className="boton-secundario"
                    type="button"
                    disabled={procesando || bloque.minutosAcreditables === 0}
                    onClick={() => void acreditar(bloque.bloqueId)}
                  >
                    Acreditar {bloque.minutosAcreditables} min
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="titulo-consumir-recuperacion">
          <h3 id="titulo-consumir-recuperacion">Reducir carga futura</h3>
          {banco.reducibles.length === 0 ? (
            <p className="estado-vacio-lineal">
              No hay bloques futuros pendientes cuya política permita reducir
              carga.
            </p>
          ) : (
            <form
              className="formulario-recuperacion"
              onSubmit={(evento) => void consumir(evento)}
            >
              <div className="campo">
                <label htmlFor="bloque-recuperacion">Bloque flexible</label>
                <select
                  id="bloque-recuperacion"
                  value={bloqueId}
                  onChange={(evento) => setBloqueId(evento.target.value)}
                >
                  {banco.reducibles.map((bloque) => (
                    <option key={bloque.bloqueId} value={bloque.bloqueId}>
                      {bloque.fecha} · {bloque.titulo} ·{" "}
                      {bloque.minutosPlanificados} min
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="minutos-recuperacion">Minutos a reducir</label>
                <input
                  id="minutos-recuperacion"
                  type="number"
                  min="1"
                  max={bloqueSeleccionado?.maximoReducible}
                  required
                  value={minutos}
                  onChange={(evento) => setMinutos(evento.target.value)}
                />
              </div>
              <button
                className="boton-primario"
                type="submit"
                disabled={procesando || banco.saldoMinutos === 0}
              >
                {procesando ? "Procesando…" : "Usar recuperación"}
              </button>
            </form>
          )}
        </section>
      </div>

      <section
        className="historial-recuperacion"
        aria-labelledby="titulo-historial-recuperacion"
      >
        <h3 id="titulo-historial-recuperacion">Historial</h3>
        {banco.movimientos.length === 0 ? (
          <p className="estado-vacio-lineal">
            El banco aún no tiene movimientos.
          </p>
        ) : (
          <ol>
            {banco.movimientos.map((movimiento) => (
              <li key={movimiento.id}>
                <div>
                  <strong>{movimiento.descripcion}</strong>
                  <span>{movimiento.fechaFuente}</span>
                </div>
                <span
                  className={
                    movimiento.tipo === "ACREDITACION"
                      ? "movimiento-positivo"
                      : "movimiento-negativo"
                  }
                >
                  {movimiento.tipo === "ACREDITACION" ? "+" : "−"}
                  {movimiento.minutos} min
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

function mensajeError(causa: unknown): string {
  return causa instanceof Error
    ? causa.message
    : "No fue posible procesar la recuperación.";
}
