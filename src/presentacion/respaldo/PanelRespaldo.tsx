import { useState, type ChangeEvent } from "react";
import type { ResultadoAnalisisRespaldo } from "../../aplicacion";
import type { ServiciosRespaldo } from "./ServiciosRespaldo";

interface PanelRespaldoProps {
  readonly servicios: ServiciosRespaldo;
}

export function PanelRespaldo({ servicios }: PanelRespaldoProps) {
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string>();
  const [error, setError] = useState<string>();
  const [analisis, setAnalisis] = useState<ResultadoAnalisisRespaldo>();

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
    try {
      const contenido = await servicios.leerArchivo(archivo);
      setAnalisis(servicios.analizarImportacion.ejecutar(contenido));
    } catch (causa: unknown) {
      setError(mensajeError(causa, "No fue posible analizar el respaldo."));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <section
      className="panel-agenda panel-respaldo"
      aria-labelledby="titulo-respaldo"
    >
      <header className="cabecera-panel-agenda">
        <div>
          <p className="sobrelinea">Portabilidad local</p>
          <h2 id="titulo-respaldo">Respaldo de datos</h2>
          <p className="descripcion-panel">
            Descarga una instantánea versionada de todo el estado persistente o
            comprueba un archivo antes de una futura restauración.
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
      {error && (
        <p className="mensaje-error mensaje-formulario" role="alert">
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
      <p role={esValido ? "status" : "alert"}>
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
