import { useEffect, useRef, useState } from "react";
import type {
  ComandoGestionarSesionCronometro,
  EstadoCronometroBloqueDto,
} from "../../aplicacion";
import { useEnfoqueError } from "../hooks/useEnfoqueError";
import type { ServiciosCalendario } from "./ServiciosCalendario";

interface ControlCronometroBloqueProps {
  readonly bloqueId: string;
  readonly titulo: string;
  readonly permitirInicio: boolean;
  readonly servicios: Pick<
    ServiciosCalendario,
    "consultarCronometro" | "gestionarCronometro" | "generarOperacionId"
  >;
  readonly revision: number;
  readonly onCambio: (mensaje: string) => void;
}

type EstadoControl =
  | Readonly<{ tipo: "cargando" }>
  | Readonly<{ tipo: "listo"; cronometro: EstadoCronometroBloqueDto }>
  | Readonly<{ tipo: "error"; mensaje: string }>;

export function ControlCronometroBloque({
  bloqueId,
  titulo,
  permitirInicio,
  servicios,
  revision,
  onCambio,
}: ControlCronometroBloqueProps) {
  const [estado, setEstado] = useState<EstadoControl>({ tipo: "cargando" });
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string>();
  const [error, setError] = useState<string>();
  const [reintento, setReintento] = useState(0);
  const controlRef = useRef<HTMLElement>(null);
  const [marcaTemporal, setMarcaTemporal] = useState<
    Readonly<{ sesionId: string; ahora: number }> | undefined
  >();
  const operacionPendiente = useRef<
    | {
        clave: string;
        operacionId: string;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    let vigente = true;
    servicios.consultarCronometro.ejecutar(bloqueId).then(
      (cronometro) => {
        if (vigente) setEstado({ tipo: "listo", cronometro });
      },
      (error: unknown) => {
        if (vigente) {
          setEstado({
            tipo: "error",
            mensaje:
              error instanceof Error
                ? error.message
                : "No fue posible recuperar el cronómetro.",
          });
        }
      },
    );
    return () => {
      vigente = false;
    };
  }, [bloqueId, reintento, revision, servicios]);

  const sesionAbierta =
    estado.tipo === "listo" ? estado.cronometro.sesionAbierta : undefined;
  const sesionPropia =
    sesionAbierta?.bloqueId === bloqueId ? sesionAbierta : undefined;
  useEnfoqueError(
    controlRef,
    estado.tipo === "error" ? estado.mensaje : (error ?? ""),
  );

  useEffect(() => {
    if (sesionPropia?.estado !== "ACTIVA") return;
    const intervalo = window.setInterval(
      () =>
        setMarcaTemporal({
          sesionId: sesionPropia.id,
          ahora: Date.now(),
        }),
      1000,
    );
    return () => window.clearInterval(intervalo);
  }, [sesionPropia?.estado, sesionPropia?.id]);

  if (estado.tipo === "cargando") {
    return <p className="estado-cronometro">Recuperando cronómetro…</p>;
  }
  if (estado.tipo === "error") {
    return (
      <section
        ref={controlRef}
        className="error-campo estado-error-cronometro"
        role="alert"
        tabIndex={-1}
      >
        <p>No fue posible recuperar el cronómetro. {estado.mensaje}</p>
        <button
          className="boton-texto"
          type="button"
          onClick={() => {
            setEstado({ tipo: "cargando" });
            setReintento((actual) => actual + 1);
          }}
        >
          Reintentar cronómetro
        </button>
      </section>
    );
  }

  const ejecutar = async (
    clave: string,
    crearComando: (operacionId: string) => ComandoGestionarSesionCronometro,
    confirmacion: string,
  ) => {
    const pendiente = operacionPendiente.current;
    const operacionId =
      pendiente?.clave === clave
        ? pendiente.operacionId
        : servicios.generarOperacionId();
    operacionPendiente.current = { clave, operacionId };
    setProcesando(true);
    setMensaje(undefined);
    setError(undefined);
    try {
      await servicios.gestionarCronometro.ejecutar(crearComando(operacionId));
      operacionPendiente.current = undefined;
      setMensaje(confirmacion);
      onCambio(confirmacion);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible cambiar el cronómetro.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const duracion = calcularDuracionVisible(
    estado.cronometro,
    sesionPropia,
    marcaTemporal && marcaTemporal.sesionId === sesionPropia?.id
      ? marcaTemporal.ahora
      : Date.parse(estado.cronometro.consultadoEn),
  );
  const otraSesionAbierta = Boolean(sesionAbierta && !sesionPropia);

  return (
    <section
      ref={controlRef}
      className="control-cronometro"
      aria-label={`Cronómetro opcional para ${titulo}`}
      aria-busy={procesando}
    >
      <div>
        <span>Cronómetro opcional</span>
        <output aria-label={`Tiempo medido para ${titulo}`}>
          {formatearDuracion(duracion)}
        </output>
      </div>
      {otraSesionAbierta && (
        <p id={`motivo-cronometro-${bloqueId}`} className="ayuda-campo">
          Hay otra sesión abierta. Detenla antes de medir este bloque.
        </p>
      )}
      <div className="acciones-cronometro">
        {!sesionPropia && permitirInicio && (
          <button
            className="boton-texto"
            type="button"
            disabled={procesando || otraSesionAbierta}
            aria-describedby={
              otraSesionAbierta ? `motivo-cronometro-${bloqueId}` : undefined
            }
            onClick={() =>
              void ejecutar(
                `INICIAR:${bloqueId}`,
                (operacionId) => ({
                  tipo: "INICIAR",
                  operacionId,
                  bloqueId,
                }),
                `Cronómetro iniciado para ${titulo}.`,
              )
            }
          >
            Iniciar cronómetro
          </button>
        )}
        {sesionPropia?.estado === "ACTIVA" && (
          <button
            className="boton-texto"
            type="button"
            disabled={procesando}
            onClick={() =>
              void ejecutar(
                `PAUSAR:${sesionPropia.id}`,
                (operacionId) => ({
                  tipo: "PAUSAR",
                  operacionId,
                  sesionId: sesionPropia.id,
                }),
                `Cronómetro pausado para ${titulo}.`,
              )
            }
          >
            Pausar
          </button>
        )}
        {sesionPropia?.estado === "PAUSADA" && (
          <button
            className="boton-texto"
            type="button"
            disabled={procesando}
            onClick={() =>
              void ejecutar(
                `REANUDAR:${sesionPropia.id}`,
                (operacionId) => ({
                  tipo: "REANUDAR",
                  operacionId,
                  sesionId: sesionPropia.id,
                }),
                `Cronómetro reanudado para ${titulo}.`,
              )
            }
          >
            Reanudar
          </button>
        )}
        {sesionPropia && (
          <button
            className="boton-texto boton-peligro"
            type="button"
            disabled={procesando}
            onClick={() =>
              void ejecutar(
                `DETENER:${sesionPropia.id}`,
                (operacionId) => ({
                  tipo: "DETENER",
                  operacionId,
                  sesionId: sesionPropia.id,
                }),
                `Cronómetro detenido para ${titulo}. El bloque continúa pendiente.`,
              )
            }
          >
            Detener
          </button>
        )}
      </div>
      {mensaje && (
        <p className="mensaje-cronometro" role="status">
          {mensaje}
        </p>
      )}
      {error && (
        <p
          className="mensaje-cronometro error-campo"
          role="alert"
          tabIndex={-1}
        >
          {error}
        </p>
      )}
    </section>
  );
}

function calcularDuracionVisible(
  cronometro: EstadoCronometroBloqueDto,
  sesionPropia: EstadoCronometroBloqueDto["sesionAbierta"],
  ahora: number,
): number {
  if (sesionPropia?.estado !== "ACTIVA") {
    return cronometro.duracionTotalMilisegundos;
  }
  return (
    cronometro.duracionTotalMilisegundos +
    Math.max(0, ahora - Date.parse(cronometro.consultadoEn))
  );
}

function formatearDuracion(milisegundos: number): string {
  const segundos = Math.floor(milisegundos / 1000);
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = segundos % 60;
  return [horas, minutos, resto]
    .map((valor) => String(valor).padStart(2, "0"))
    .join(":");
}
