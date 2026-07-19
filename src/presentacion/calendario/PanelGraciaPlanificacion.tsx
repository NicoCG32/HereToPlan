import { useEffect, useRef, useState } from "react";
import type {
  CasoDeUsoCorregirCortePlanificacion,
  CasoDeUsoSincronizarCortesPlanificacion,
  CortePlanificacionDto,
} from "../../aplicacion";
import { DialogoCorregirCorte } from "./DialogoCorregirCorte";

interface PanelGraciaPlanificacionProps {
  readonly sincronizarCortes: Pick<
    CasoDeUsoSincronizarCortesPlanificacion,
    "ejecutar"
  >;
  readonly corregirCorte: Pick<CasoDeUsoCorregirCortePlanificacion, "ejecutar">;
  readonly onCorteCorregido?: (corte: CortePlanificacionDto) => void;
  readonly onCorreccionRechazada?: (mensaje: string) => void;
  readonly intervaloActualizacionMs?: number;
  readonly revision?: number;
}

export function PanelGraciaPlanificacion({
  sincronizarCortes,
  corregirCorte,
  onCorteCorregido,
  onCorreccionRechazada,
  intervaloActualizacionMs = 1_000,
  revision = 0,
}: PanelGraciaPlanificacionProps) {
  const [cortes, setCortes] = useState<readonly CortePlanificacionDto[]>([]);
  const [anuncio, setAnuncio] = useState<string>();
  const [error, setError] = useState<string>();
  const [corteEnCorreccion, setCorteEnCorreccion] =
    useState<CortePlanificacionDto>();
  const [procesandoCorreccion, setProcesandoCorreccion] = useState(false);
  const [errorCorreccion, setErrorCorreccion] = useState<string>();
  const botonOrigenCorreccionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let activo = true;
    let temporizador: number | undefined;

    const sincronizar = async () => {
      try {
        const resultado = await sincronizarCortes.ejecutar();
        if (!activo) return;
        setCortes(resultado);
        setError(undefined);
        const confirmados = resultado.filter(
          (corte) => corte.confirmacionMaterializada,
        );
        if (confirmados.length > 0) {
          setAnuncio(crearAnuncioConfirmacion(confirmados));
        }
        if (resultado.some((corte) => corte.estado === "EN_GRACIA")) {
          temporizador = window.setTimeout(
            () => void sincronizar(),
            intervaloActualizacionMs,
          );
        }
      } catch (causa: unknown) {
        if (!activo) return;
        setError(
          causa instanceof Error
            ? causa.message
            : "No fue posible sincronizar la confirmación automática.",
        );
      }
    };

    void sincronizar();
    return () => {
      activo = false;
      if (temporizador !== undefined) window.clearTimeout(temporizador);
    };
  }, [intervaloActualizacionMs, revision, sincronizarCortes]);

  const activos = cortes.filter((corte) => corte.estado === "EN_GRACIA");

  const cancelarCorreccion = () => {
    setCorteEnCorreccion(undefined);
    setErrorCorreccion(undefined);
    requestAnimationFrame(() => botonOrigenCorreccionRef.current?.focus());
  };

  const confirmarCorreccion = async () => {
    if (!corteEnCorreccion) return;
    setProcesandoCorreccion(true);
    setErrorCorreccion(undefined);
    try {
      const resultado = await corregirCorte.ejecutar({
        corteId: corteEnCorreccion.id,
      });
      if (!resultado.exito) {
        if (resultado.error.codigo === "CORTE_NO_CORREGIBLE") {
          setCorteEnCorreccion(undefined);
          onCorreccionRechazada?.(resultado.error.mensaje);
          return;
        }
        setErrorCorreccion(resultado.error.mensaje);
        return;
      }
      setCortes((actuales) =>
        actuales.filter((corte) => corte.id !== resultado.corte.id),
      );
      setCorteEnCorreccion(undefined);
      onCorteCorregido?.(resultado.corte);
    } catch (causa: unknown) {
      setErrorCorreccion(
        causa instanceof Error
          ? causa.message
          : "No fue posible volver a editar la planificación.",
      );
    } finally {
      setProcesandoCorreccion(false);
    }
  };

  return (
    <>
      {anuncio && (
        <p className="mensaje-exito mensaje-confirmacion-corte" role="status">
          {anuncio}
        </p>
      )}
      {error && (
        <p className="mensaje-error mensaje-formulario" role="alert">
          {error}
        </p>
      )}
      {activos.length > 0 && (
        <section
          className="panel-gracia-planificacion"
          aria-labelledby="titulo-periodo-gracia"
        >
          <div className="titulo-region">
            <div>
              <p className="sobrelinea">Confirmación pendiente</p>
              <h3 id="titulo-periodo-gracia">Período de gracia</h3>
            </div>
            <p>
              Puedes volver a editar mediante una decisión explícita mientras el
              reloj autoritativo conserve abierta la ventana.
            </p>
          </div>
          <ul className="lista-cortes-gracia">
            {activos.map((corte) => (
              <li key={corte.id}>
                <div>
                  <strong>{resumirCorte(corte)}</strong>
                  <span>
                    Confirmación automática:{" "}
                    <time dateTime={corte.confirmarAutomaticamenteEn}>
                      {formatearInstante(corte.confirmarAutomaticamenteEn!)}
                    </time>
                  </span>
                </div>
                <div className="acciones-corte-gracia">
                  <span className="cuenta-regresiva" aria-hidden="true">
                    {formatearDuracion(corte.milisegundosRestantes ?? 0)}
                  </span>
                  <button
                    className="boton-texto"
                    type="button"
                    onClick={(evento) => {
                      botonOrigenCorreccionRef.current = evento.currentTarget;
                      setErrorCorreccion(undefined);
                      setCorteEnCorreccion(corte);
                    }}
                  >
                    Corregir {resumirCorte(corte)}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {corteEnCorreccion && (
        <DialogoCorregirCorte
          corte={corteEnCorreccion}
          procesando={procesandoCorreccion}
          {...(errorCorreccion ? { error: errorCorreccion } : {})}
          onCancelar={cancelarCorreccion}
          onConfirmar={() => void confirmarCorreccion()}
        />
      )}
    </>
  );
}

function resumirCorte(corte: CortePlanificacionDto): string {
  if (corte.cantidadBloques === 1) {
    return corte.titulosBloques[0] ?? "Planificación seleccionada";
  }
  return `${corte.cantidadBloques} bloques seleccionados`;
}

function formatearDuracion(milisegundos: number): string {
  const segundosTotales = Math.ceil(Math.max(0, milisegundos) / 1_000);
  const minutos = Math.floor(segundosTotales / 60);
  const segundos = segundosTotales % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

function formatearInstante(instante: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(instante));
}

function crearAnuncioConfirmacion(
  cortes: readonly CortePlanificacionDto[],
): string {
  if (cortes.length === 1) {
    return `${resumirCorte(cortes[0]!)} quedó confirmado automáticamente.`;
  }
  return `${cortes.length} planificaciones quedaron confirmadas automáticamente.`;
}
