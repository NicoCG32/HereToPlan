import { useEffect, useRef, useState } from "react";
import type { ImpactoReinicioPlanificacion } from "../../aplicacion";
import type { ServiciosRespaldo } from "./ServiciosRespaldo";
import { DialogoReiniciarPlanificacion } from "./DialogoReiniciarPlanificacion";

interface PanelReinicioPlanificacionProps {
  readonly servicios: ServiciosRespaldo;
  readonly onReiniciada?: () => void;
}

export function PanelReinicioPlanificacion({
  servicios,
  onReiniciada,
}: PanelReinicioPlanificacionProps) {
  const [impacto, setImpacto] = useState<ImpactoReinicioPlanificacion>();
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [error, setError] = useState<string>();
  const abrirRef = useRef<HTMLButtonElement>(null);

  const consultar = () => {
    const casoDeUso = servicios.consultarImpactoReinicio;
    if (!casoDeUso) return;
    setCargando(true);
    setError(undefined);
    void casoDeUso.ejecutar().then(
      (resultado) => {
        setImpacto(resultado);
        setCargando(false);
      },
      (causa: unknown) => {
        setError(mensajeError(causa, "No fue posible calcular el impacto."));
        setCargando(false);
      },
    );
  };

  useEffect(() => {
    const casoDeUso = servicios.consultarImpactoReinicio;
    let vigente = true;
    if (!casoDeUso) return;

    void casoDeUso.ejecutar().then(
      (resultado) => {
        if (!vigente) return;
        setImpacto(resultado);
        setCargando(false);
      },
      (causa: unknown) => {
        if (!vigente) return;
        setError(mensajeError(causa, "No fue posible calcular el impacto."));
        setCargando(false);
      },
    );

    return () => {
      vigente = false;
    };
  }, [servicios.consultarImpactoReinicio]);

  const cancelar = () => {
    setDialogoAbierto(false);
    setError(undefined);
    queueMicrotask(() => abrirRef.current?.focus());
  };

  const reiniciar = async (confirmacion: string) => {
    if (
      !impacto ||
      !servicios.reiniciarPlanificacion ||
      !servicios.generarOperacionIdReinicio
    )
      return;
    setProcesando(true);
    setError(undefined);
    try {
      await servicios.reiniciarPlanificacion.ejecutar({
        impacto,
        confirmacion,
        operacionId: servicios.generarOperacionIdReinicio(),
      });
      setDialogoAbierto(false);
      setImpacto({
        ...impacto,
        totalEliminaciones: 0,
        eliminar: {
          agendasActivas: 0,
          bloquesAgendaPendientes: 0,
          bloquesPlanificacionActivos: 0,
          cortesActivos: 0,
          sesionesAbiertas: 0,
        },
      });
      onReiniciada?.();
    } catch (causa: unknown) {
      setError(
        mensajeError(causa, "No fue posible reiniciar la planificación."),
      );
      if (
        typeof causa === "object" &&
        causa !== null &&
        "codigo" in causa &&
        causa.codigo === "IMPACTO_REINICIO_DESACTUALIZADO"
      ) {
        consultar();
      }
    } finally {
      setProcesando(false);
    }
  };

  return (
    <section
      className="preparacion-restauracion panel-reinicio-planificacion"
      aria-labelledby="titulo-panel-reinicio"
      aria-busy={cargando || procesando}
    >
      <p className="sobrelinea">Nuevo ciclo de planificación</p>
      <h3 id="titulo-panel-reinicio">Reiniciar planificación</h3>
      <p>
        Retira únicamente la planificación activa. Antes de continuar,
        recomendamos descargar un respaldo completo.
      </p>

      {cargando && <p role="status">Calculando impacto…</p>}
      {error && !dialogoAbierto && (
        <p className="mensaje-error" role="alert" tabIndex={-1}>
          {error}
        </p>
      )}
      {impacto && !cargando && (
        <>
          <dl className="resumen-impacto-eliminacion">
            <div>
              <dt>Planificación a retirar</dt>
              <dd>{impacto.totalEliminaciones}</dd>
            </div>
            <div>
              <dt>Historia y economía conservadas</dt>
              <dd>{impacto.totalConservados}</dd>
            </div>
          </dl>
          <p className="aviso-respaldo">
            Se conservan {impacto.conservar.actividades} actividades,{" "}
            {impacto.conservar.movimientosPuntos} movimientos de puntos y{" "}
            {impacto.conservar.recompensasAdquiridas} recompensas adquiridas.
          </p>
          {impacto.incidencias.length > 0 && (
            <ul>
              {impacto.incidencias.map((incidencia) => (
                <li key={incidencia}>{incidencia}</li>
              ))}
            </ul>
          )}
          {impacto.totalEliminaciones === 0 ? (
            <p className="estado-vacio-lineal" role="status">
              No existe planificación activa que retirar.
            </p>
          ) : (
            <button
              ref={abrirRef}
              className="boton-primario boton-destructivo"
              type="button"
              disabled={procesando}
              onClick={() => setDialogoAbierto(true)}
            >
              Revisar y reiniciar
            </button>
          )}
        </>
      )}

      {dialogoAbierto && impacto && (
        <DialogoReiniciarPlanificacion
          impacto={impacto}
          procesando={procesando}
          {...(error ? { error } : {})}
          onCancelar={cancelar}
          onConfirmar={(confirmacion) => void reiniciar(confirmacion)}
        />
      )}
    </section>
  );
}

function mensajeError(causa: unknown, predeterminado: string): string {
  return causa instanceof Error ? causa.message : predeterminado;
}
