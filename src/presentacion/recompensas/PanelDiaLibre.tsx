import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  CanjeDiaLibreDto,
  MotivoProteccionDiaLibreDto,
  VistaPreviaDiaLibreDto,
} from "../../aplicacion";
import { DialogoCanjeDiaLibre } from "./DialogoCanjeDiaLibre";
import type { ServiciosRecompensas } from "./ServiciosRecompensas";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface PanelDiaLibreProps {
  readonly servicios: ServiciosRecompensas;
  readonly onCanjeConfirmado?: () => void;
}

export function PanelDiaLibre({
  servicios,
  onCanjeConfirmado,
}: PanelDiaLibreProps) {
  const botonCanjearRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const vistaPreviaRef = useRef<HTMLHeadingElement>(null);
  const resultadoRef = useRef<HTMLHeadingElement>(null);
  const [fecha, setFecha] = useState("");
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaDiaLibreDto>();
  const [historial, setHistorial] = useState<readonly CanjeDiaLibreDto[]>([]);
  const [errorHistorial, setErrorHistorial] = useState<string>();
  const [revisionHistorial, setRevisionHistorial] = useState(0);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string>();
  const [operacionId, setOperacionId] = useState<string>();
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<CanjeDiaLibreDto>();
  useEnfoqueError(panelRef, operacionId ? "" : (error ?? errorHistorial ?? ""));

  useEffect(() => {
    let activo = true;
    servicios.listarCanjes.ejecutar().then(
      (canjes) => {
        if (!activo) return;
        setHistorial(canjes);
        setErrorHistorial(undefined);
      },
      (causa: unknown) => {
        if (activo) setErrorHistorial(mensajeErrorHistorial(causa));
      },
    );
    return () => {
      activo = false;
    };
  }, [revisionHistorial, servicios]);

  const preparar = async (evento: FormEvent) => {
    evento.preventDefault();
    setConsultando(true);
    setError(undefined);
    setResultado(undefined);
    try {
      setVistaPrevia(await servicios.prepararDiaLibre.ejecutar(fecha));
      requestAnimationFrame(() => vistaPreviaRef.current?.focus());
    } catch (causa: unknown) {
      setVistaPrevia(undefined);
      setError(mensajeError(causa));
    } finally {
      setConsultando(false);
    }
  };

  const abrirConfirmacion = () => {
    setError(undefined);
    setOperacionId(servicios.generarOperacionId());
  };

  const confirmar = async () => {
    if (!operacionId || !vistaPrevia) return;
    setProcesando(true);
    setError(undefined);
    try {
      const canje = await servicios.canjearDiaLibre.ejecutar({
        operacionId,
        fechaObjetivo: vistaPrevia.fechaObjetivo,
      });
      setResultado(canje);
      setVistaPrevia(undefined);
      setOperacionId(undefined);
      onCanjeConfirmado?.();
      try {
        setHistorial(await servicios.listarCanjes.ejecutar());
        setErrorHistorial(undefined);
      } catch (causa: unknown) {
        setErrorHistorial(mensajeErrorHistorial(causa));
      }
      requestAnimationFrame(() => resultadoRef.current?.focus());
    } catch (causa: unknown) {
      setError(mensajeError(causa));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <section
      ref={panelRef}
      className="panel-agenda panel-dia-libre"
      aria-labelledby="titulo-dia-libre"
      aria-busy={consultando || procesando}
    >
      <header className="cabecera-panel-agenda">
        <div>
          <p className="sobrelinea">Rewards</p>
          <h2 id="titulo-dia-libre">Día libre</h2>
          <p className="descripcion-panel">
            Convierte puntos en flexibilidad planificada sin alterar compromisos
            estrictos ni plazos externos.
          </p>
        </div>
      </header>

      <form
        className="formulario-dia-libre"
        onSubmit={(evento) => void preparar(evento)}
      >
        <div className="campo">
          <label htmlFor="fecha-dia-libre">Fecha futura</label>
          <input
            id="fecha-dia-libre"
            type="date"
            required
            value={fecha}
            onChange={(evento) => {
              setFecha(evento.target.value);
              setVistaPrevia(undefined);
            }}
          />
        </div>
        <button
          className="boton-secundario"
          type="submit"
          disabled={consultando}
        >
          {consultando ? "Evaluando…" : "Ver efecto completo"}
        </button>
      </form>

      {error && !operacionId && (
        <p
          className="mensaje-error mensaje-formulario"
          role="alert"
          tabIndex={-1}
        >
          {error}
        </p>
      )}

      {vistaPrevia && (
        <section
          className="vista-previa-dia-libre"
          aria-labelledby="titulo-vista-dia-libre"
        >
          <h3 ref={vistaPreviaRef} id="titulo-vista-dia-libre" tabIndex={-1}>
            Vista previa del canje
          </h3>
          <dl className="resumen-dia-libre">
            <div>
              <dt>Costo</dt>
              <dd>{vistaPrevia.costoPuntos} puntos</dd>
            </div>
            <div>
              <dt>Saldo actual</dt>
              <dd>{vistaPrevia.saldoActual}</dd>
            </div>
            <div>
              <dt>Saldo posterior</dt>
              <dd>{vistaPrevia.saldoPosterior}</dd>
            </div>
          </dl>
          <div className="columnas-dia-libre">
            <div>
              <h4>Afectados ({vistaPrevia.afectados.length})</h4>
              {vistaPrevia.afectados.length === 0 ? (
                <p>No existen bloques elegibles.</p>
              ) : (
                <ul>
                  {vistaPrevia.afectados.map((bloque) => (
                    <li key={bloque.id}>
                      <strong>{bloque.titulo}</strong>
                      <span>{bloque.contextoNombre}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4>Protegidos ({vistaPrevia.protegidos.length})</h4>
              {vistaPrevia.protegidos.length === 0 ? (
                <p>No hay bloques protegidos.</p>
              ) : (
                <ul>
                  {vistaPrevia.protegidos.map((bloque) => (
                    <li key={bloque.id}>
                      <strong>{bloque.titulo}</strong>
                      <span>{etiquetaMotivo(bloque.motivo)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {!vistaPrevia.puedeCanjear && (
            <p
              id="motivo-canje-dia-libre"
              className="aviso-dia-libre motivo-control-inhabilitado"
            >
              {!vistaPrevia.saldoSuficiente
                ? "No disponible: el saldo actual no cubre el costo del canje."
                : "No disponible: la fecha no contiene bloques elegibles para excusar."}
            </p>
          )}
          <button
            ref={botonCanjearRef}
            className="boton-primario"
            type="button"
            disabled={!vistaPrevia.puedeCanjear}
            aria-describedby={
              vistaPrevia.puedeCanjear ? undefined : "motivo-canje-dia-libre"
            }
            onClick={abrirConfirmacion}
          >
            Canjear Día libre
          </button>
        </section>
      )}

      {resultado && (
        <section
          className="resultado-canje-dia-libre"
          aria-labelledby="titulo-resultado-canje"
        >
          <h3 ref={resultadoRef} id="titulo-resultado-canje" tabIndex={-1}>
            Canje confirmado
          </h3>
          <p>
            Se excusaron {resultado.bloquesAfectados.length} bloques del{" "}
            {resultado.fechaObjetivo}.
          </p>
          <p className="enlaces-resultado-canje">
            <a href={`#canje-${resultado.id}`}>Ver canje</a>
            {resultado.contextosAfectados.map((contexto) => (
              <a key={contexto.id} href="#titulo-calendario">
                Agenda {contexto.nombre}
              </a>
            ))}
            <a href={`#movimiento-${resultado.movimientoId}`}>Ver movimiento</a>
          </p>
        </section>
      )}

      <section
        className="historial-canjes"
        aria-labelledby="titulo-historial-canjes"
      >
        <h3 id="titulo-historial-canjes">Historial de canjes</h3>
        {errorHistorial ? (
          <div
            className="mensaje-error mensaje-formulario"
            role="alert"
            tabIndex={-1}
          >
            <p>No fue posible cargar el historial. {errorHistorial}</p>
            <button
              className="boton-secundario"
              type="button"
              onClick={() => {
                setErrorHistorial(undefined);
                setRevisionHistorial((actual) => actual + 1);
              }}
            >
              Reintentar historial de canjes
            </button>
          </div>
        ) : historial.length === 0 ? (
          <p className="estado-vacio-lineal">
            Aún no existen canjes confirmados. Selecciona una fecha futura y
            revisa su efecto para preparar el primero.
          </p>
        ) : (
          <ol>
            {historial.map((canje) => (
              <li id={`canje-${canje.id}`} key={canje.id}>
                <div>
                  <strong>Día libre · {canje.fechaObjetivo}</strong>
                  <span>
                    {canje.bloquesAfectados.length} bloques ·{" "}
                    {canje.puntosGastados} puntos
                  </span>
                </div>
                <time dateTime={canje.canjeadoEn}>
                  {formatearInstante(canje.canjeadoEn)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      {operacionId && vistaPrevia && (
        <DialogoCanjeDiaLibre
          vistaPrevia={vistaPrevia}
          procesando={procesando}
          {...(error ? { error } : {})}
          onCancelar={() => {
            setOperacionId(undefined);
            setError(undefined);
            botonCanjearRef.current?.focus();
          }}
          onConfirmar={() => void confirmar()}
        />
      )}
    </section>
  );
}

function etiquetaMotivo(motivo: MotivoProteccionDiaLibreDto): string {
  const etiquetas: Record<MotivoProteccionDiaLibreDto, string> = {
    YA_RESUELTO: "Ya fue resuelto",
    YA_EXCUSADO: "Ya fue excusado",
    COMPROMISO_ESTRICTO: "Compromiso estricto",
    AUTORIDAD_EXTERNA: "Plazo de autoridad externa",
    EXCUSION_NO_PERMITIDA: "La política no permite excusarlo",
  };
  return etiquetas[motivo] ?? "Bloque protegido";
}

function mensajeError(causa: unknown): string {
  return causa instanceof Error
    ? causa.message
    : "No fue posible procesar el canje de Día libre.";
}

function mensajeErrorHistorial(causa: unknown): string {
  return causa instanceof Error
    ? causa.message
    : "El almacenamiento local no respondió al consultar los canjes.";
}

function formatearInstante(instante: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(instante));
}
