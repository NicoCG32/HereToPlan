import { useEffect, useState } from "react";
import type {
  CasoDeUsoSincronizarCortesPlanificacion,
  CortePlanificacionDto,
} from "../../aplicacion";

interface PanelGraciaPlanificacionProps {
  readonly sincronizarCortes: Pick<
    CasoDeUsoSincronizarCortesPlanificacion,
    "ejecutar"
  >;
  readonly intervaloActualizacionMs?: number;
  readonly revision?: number;
}

export function PanelGraciaPlanificacion({
  sincronizarCortes,
  intervaloActualizacionMs = 1_000,
  revision = 0,
}: PanelGraciaPlanificacionProps) {
  const [cortes, setCortes] = useState<readonly CortePlanificacionDto[]>([]);
  const [anuncio, setAnuncio] = useState<string>();
  const [error, setError] = useState<string>();

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
              Puedes revisar el resumen mientras el reloj autoritativo conserva
              el vencimiento original.
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
                <span className="cuenta-regresiva" aria-hidden="true">
                  {formatearDuracion(corte.milisegundosRestantes ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
