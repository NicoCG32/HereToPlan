import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type {
  PlanRestauracionRespaldo,
  ResultadoAnalisisRespaldo,
} from "../../aplicacion";
import { DialogoRestaurarRespaldo } from "./DialogoRestaurarRespaldo";
import type { ServiciosRespaldo } from "./ServiciosRespaldo";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface PanelRespaldoProps {
  readonly servicios: ServiciosRespaldo;
}

export function PanelRespaldo({ servicios }: PanelRespaldoProps) {
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string>();
  const [error, setError] = useState<string>();
  const [analisis, setAnalisis] = useState<ResultadoAnalisisRespaldo>();
  const [plan, setPlan] = useState<PlanRestauracionRespaldo>();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [restauracionCompletada, setRestauracionCompletada] = useState(false);
  const abrirRestauracionRef = useRef<HTMLButtonElement>(null);
  const recargarRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const claveError =
    error ??
    (analisis && analisis.estado !== "VALIDO"
      ? analisis.errores.join("|")
      : "");
  useEnfoqueError(panelRef, dialogoAbierto ? "" : claveError);
  useEffect(() => {
    if (restauracionCompletada) recargarRef.current?.focus();
  }, [restauracionCompletada]);

  const exportar = async () => {
    setProcesando(true);
    setMensaje(undefined);
    setError(undefined);
    try {
      const archivo = await servicios.exportar.ejecutar();
      servicios.descargar(archivo);
      setMensaje(`Respaldo generado: ${archivo.nombre}`);
    } catch (causa: unknown) {
      setError(mensajeError(causa, "No fue posible generar el respaldo."));
    } finally {
      setProcesando(false);
    }
  };

  const analizar = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setProcesando(true);
    setMensaje(undefined);
    setError(undefined);
    setAnalisis(undefined);
    setPlan(undefined);
    setRestauracionCompletada(false);
    try {
      const contenido = await servicios.leerArchivo(archivo);
      const resultado = servicios.analizarImportacion.ejecutar(contenido);
      setAnalisis(resultado);
      if (resultado.estado === "VALIDO") {
        setPlan(servicios.prepararRestauracion.ejecutar(contenido));
      }
    } catch (causa: unknown) {
      setError(mensajeError(causa, "No fue posible analizar el respaldo."));
    } finally {
      setProcesando(false);
    }
  };

  const cancelarRestauracion = () => {
    setDialogoAbierto(false);
    setError(undefined);
    queueMicrotask(() => abrirRestauracionRef.current?.focus());
  };

  const restaurar = async (confirmacion: string) => {
    if (!plan) return;
    setProcesando(true);
    setError(undefined);
    setMensaje(undefined);
    try {
      const resultado = await servicios.restaurar.ejecutar({
        plan,
        confirmacion,
      });
      setDialogoAbierto(false);
      setRestauracionCompletada(true);
      setMensaje(
        `Restauración completada: ${resultado.totalRegistros} registros reemplazados atómicamente.`,
      );
    } catch (causa: unknown) {
      setError(mensajeError(causa, "No fue posible restaurar el respaldo."));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <section
      ref={panelRef}
      className="panel-agenda panel-respaldo"
      aria-labelledby="titulo-respaldo"
    >
      <header className="cabecera-panel-agenda">
        <div>
          <p className="sobrelinea">Portabilidad local</p>
          <h2 id="titulo-respaldo">Respaldo de datos</h2>
          <p className="descripcion-panel">
            Descarga una instantánea versionada de todo el estado persistente o
            analiza y restaura una instantánea compatible de forma controlada.
          </p>
        </div>
      </header>

      <p className="aviso-respaldo">
        Analizar un archivo no reemplaza, combina ni elimina los datos locales.
      </p>

      {mensaje && (
        <p className="mensaje-exito" role="status">
          {mensaje}
        </p>
      )}
      {error && !dialogoAbierto && (
        <p
          className="mensaje-error mensaje-formulario"
          role="alert"
          tabIndex={-1}
        >
          {error}
        </p>
      )}

      <div className="acciones-respaldo">
        <button
          className="boton-primario"
          type="button"
          disabled={procesando}
          onClick={() => void exportar()}
        >
          {procesando ? "Procesando…" : "Descargar respaldo"}
        </button>
        <label className="boton-secundario selector-archivo-respaldo">
          Analizar archivo
          <input
            type="file"
            accept="application/json,.json"
            disabled={procesando}
            onChange={(evento) => void analizar(evento)}
          />
        </label>
      </div>

      {analisis && <InformeAnalisis analisis={analisis} />}

      {plan && !restauracionCompletada && (
        <section
          className="preparacion-restauracion"
          aria-labelledby="titulo-preparacion-restauracion"
        >
          <h3 id="titulo-preparacion-restauracion">Restauración preparada</h3>
          <p>
            {plan.totalRegistros} registros · ruta V1 → estado persistente
            actual. El reemplazo todavía no se ha ejecutado.
          </p>
          <button
            ref={abrirRestauracionRef}
            className="boton-destructivo boton-primario"
            type="button"
            disabled={procesando}
            onClick={() => setDialogoAbierto(true)}
          >
            Restaurar este respaldo
          </button>
        </section>
      )}

      {restauracionCompletada && (
        <button
          ref={recargarRef}
          className="boton-primario"
          type="button"
          onClick={servicios.recargarAplicacion}
        >
          Recargar y usar los datos restaurados
        </button>
      )}

      {dialogoAbierto && plan && (
        <DialogoRestaurarRespaldo
          plan={plan}
          procesando={procesando}
          error={error}
          onCancelar={cancelarRestauracion}
          onConfirmar={(confirmacion) => void restaurar(confirmacion)}
        />
      )}
    </section>
  );
}

function InformeAnalisis({
  analisis,
}: Readonly<{ analisis: ResultadoAnalisisRespaldo }>) {
  const esValido = analisis.estado === "VALIDO";
  return (
    <section
      className={`informe-respaldo informe-respaldo-${analisis.estado.toLowerCase()}`}
      aria-labelledby="titulo-analisis-respaldo"
    >
      <h3 id="titulo-analisis-respaldo">Resultado del análisis</h3>
      <p
        role={esValido ? "status" : "alert"}
        tabIndex={esValido ? undefined : -1}
      >
        <strong>{etiquetaEstado(analisis.estado)}</strong>
        {analisis.versionFormato !== undefined &&
          ` · formato v${analisis.versionFormato}`}
        {analisis.versionBaseDatos !== undefined &&
          ` · IndexedDB v${analisis.versionBaseDatos}`}
      </p>

      {analisis.contenidoReconocido.length > 0 && (
        <dl className="conteos-respaldo">
          {analisis.contenidoReconocido.map(({ coleccion, cantidad }) => (
            <div key={coleccion}>
              <dt>{coleccion}</dt>
              <dd>{cantidad}</dd>
            </div>
          ))}
        </dl>
      )}

      {analisis.advertencias.length > 0 && (
        <div>
          <h4>Advertencias</h4>
          <ul>
            {analisis.advertencias.map((advertencia) => (
              <li key={advertencia}>{advertencia}</li>
            ))}
          </ul>
        </div>
      )}
      {analisis.errores.length > 0 && (
        <div>
          <h4>Problemas encontrados</h4>
          <ul>
            {analisis.errores.map((problema) => (
              <li key={problema}>{problema}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function etiquetaEstado(estado: ResultadoAnalisisRespaldo["estado"]): string {
  if (estado === "VALIDO") return "Respaldo válido";
  if (estado === "INCOMPATIBLE") return "Respaldo incompatible";
  return "Respaldo inválido";
}

function mensajeError(causa: unknown, predeterminado: string): string {
  return causa instanceof Error ? causa.message : predeterminado;
}
