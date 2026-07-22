import { useEffect, useRef, useState } from "react";
import type {
  InventarioRecompensasDto,
  RecompensaCatalogoDto,
} from "../../aplicacion";
import { useEnfoqueError } from "../hooks/useEnfoqueError";
import { DialogoAdquirirRecompensa } from "./DialogoAdquirirRecompensa";
import type { ServiciosInventarioRecompensas } from "./ServiciosInventarioRecompensas";

interface PanelInventarioRecompensasProps {
  readonly servicios: ServiciosInventarioRecompensas;
  readonly revision: number;
  readonly onInventarioCambiado: () => void;
}

type EstadoPanel =
  | Readonly<{ tipo: "CARGANDO" }>
  | Readonly<{
      tipo: "LISTO";
      catalogo: readonly RecompensaCatalogoDto[];
      inventario: InventarioRecompensasDto;
    }>
  | Readonly<{ tipo: "ERROR"; mensaje: string }>;

export function PanelInventarioRecompensas({
  servicios,
  revision,
  onInventarioCambiado,
}: PanelInventarioRecompensasProps) {
  const panelRef = useRef<HTMLElement>(null);
  const origenRef = useRef<HTMLButtonElement | null>(null);
  const [estado, setEstado] = useState<EstadoPanel>({ tipo: "CARGANDO" });
  const [reintento, setReintento] = useState(0);
  const [seleccion, setSeleccion] = useState<RecompensaCatalogoDto>();
  const [operacionId, setOperacionId] = useState<string>();
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string>();
  const [anuncio, setAnuncio] = useState<string>();
  useEnfoqueError(
    panelRef,
    estado.tipo === "ERROR" ? estado.mensaje : (errorAccion ?? ""),
  );

  useEffect(() => {
    let activo = true;
    Promise.all([
      servicios.consultarCatalogo.ejecutar(),
      servicios.consultarInventario.ejecutar(),
    ]).then(
      ([catalogo, inventario]) => {
        if (activo) setEstado({ tipo: "LISTO", catalogo, inventario });
      },
      (causa: unknown) => {
        if (activo) setEstado({ tipo: "ERROR", mensaje: mensajeError(causa) });
      },
    );
    return () => {
      activo = false;
    };
  }, [reintento, revision, servicios]);

  const abrirConfirmacion = (
    recompensa: RecompensaCatalogoDto,
    origen: HTMLButtonElement,
  ) => {
    origenRef.current = origen;
    setSeleccion(recompensa);
    setOperacionId(servicios.generarOperacionId());
    setErrorAccion(undefined);
  };

  const cancelar = () => {
    setSeleccion(undefined);
    setOperacionId(undefined);
    setErrorAccion(undefined);
    queueMicrotask(() => origenRef.current?.focus());
  };

  const confirmar = async () => {
    if (!seleccion || !operacionId) return;
    setProcesando(true);
    setErrorAccion(undefined);
    try {
      const resultado = await servicios.adquirir.ejecutar({
        operacionId,
        recompensaId: seleccion.id,
      });
      const [catalogo, inventario] = await Promise.all([
        servicios.consultarCatalogo.ejecutar(),
        servicios.consultarInventario.ejecutar(),
      ]);
      setEstado({ tipo: "LISTO", catalogo, inventario });
      setAnuncio(
        `${resultado.recompensa.nombre} fue añadida al inventario. Saldo: ${resultado.saldoPosterior} puntos.`,
      );
      setSeleccion(undefined);
      setOperacionId(undefined);
      onInventarioCambiado();
      queueMicrotask(() => origenRef.current?.focus());
    } catch (causa: unknown) {
      setErrorAccion(mensajeError(causa));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <section
      ref={panelRef}
      className="panel-agenda panel-inventario-recompensas"
      aria-labelledby="titulo-inventario-recompensas"
      aria-busy={estado.tipo === "CARGANDO" || procesando}
    >
      <header className="cabecera-panel-agenda">
        <div>
          <p className="sobrelinea">Flexibilidad adquirida</p>
          <h2 id="titulo-inventario-recompensas">Catálogo e inventario</h2>
          <p className="descripcion-panel">
            Adquirir gasta puntos y crea una unidad disponible. Aplicarla es una
            acción posterior y separada.
          </p>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {anuncio}
      </p>

      {estado.tipo === "CARGANDO" && (
        <p className="estado-vacio-lineal" role="status">
          Consultando catálogo e inventario…
        </p>
      )}
      {estado.tipo === "ERROR" && (
        <div
          className="mensaje-error mensaje-formulario"
          role="alert"
          tabIndex={-1}
        >
          <p>{estado.mensaje}</p>
          <button
            className="boton-secundario"
            type="button"
            onClick={() => {
              setEstado({ tipo: "CARGANDO" });
              setReintento((actual) => actual + 1);
            }}
          >
            Reintentar catálogo e inventario
          </button>
        </div>
      )}
      {estado.tipo === "LISTO" && (
        <>
          <section aria-labelledby="titulo-catalogo-recompensas">
            <h3 id="titulo-catalogo-recompensas">Catálogo</h3>
            <div className="rejilla-catalogo-recompensas">
              {estado.catalogo.map((recompensa) => (
                <article className="tarjeta-recompensa" key={recompensa.id}>
                  <div>
                    <h4>{recompensa.nombre}</h4>
                    <p>{recompensa.descripcion}</p>
                  </div>
                  <p className="costo-recompensa">
                    <strong>{recompensa.costoPuntos}</strong> puntos
                  </p>
                  {!recompensa.puedeAdquirir && (
                    <p
                      id={`motivo-${recompensa.id}`}
                      className="motivo-control-inhabilitado"
                    >
                      {recompensa.motivoNoDisponible}
                    </p>
                  )}
                  <button
                    className="boton-primario"
                    type="button"
                    disabled={!recompensa.puedeAdquirir}
                    aria-describedby={
                      recompensa.puedeAdquirir
                        ? undefined
                        : `motivo-${recompensa.id}`
                    }
                    onClick={(evento) =>
                      abrirConfirmacion(recompensa, evento.currentTarget)
                    }
                  >
                    Adquirir
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="titulo-unidades-disponibles">
            <h3 id="titulo-unidades-disponibles">
              Disponibles ({estado.inventario.disponibles.length})
            </h3>
            {estado.inventario.disponibles.length === 0 ? (
              <p className="estado-vacio-lineal">
                No tienes recompensas disponibles. Completa bloques para obtener
                puntos y adquiere una unidad desde el catálogo.
              </p>
            ) : (
              <ol className="lista-inventario-recompensas">
                {estado.inventario.disponibles.map((unidad) => (
                  <li key={unidad.id}>
                    <div>
                      <strong>{unidad.nombre}</strong>
                      <span>Unidad disponible</span>
                    </div>
                    <time dateTime={unidad.adquiridaEn}>
                      {formatearInstante(unidad.adquiridaEn)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="titulo-aplicaciones-recompensas">
            <h3 id="titulo-aplicaciones-recompensas">
              Aplicaciones históricas ({estado.inventario.aplicaciones.length})
            </h3>
            {estado.inventario.aplicaciones.length === 0 ? (
              <p className="estado-vacio-lineal">
                Todavía no se ha aplicado ninguna recompensa. Las unidades
                adquiridas permanecen disponibles hasta un uso confirmado.
              </p>
            ) : (
              <ol className="lista-inventario-recompensas">
                {estado.inventario.aplicaciones.map((aplicacion) => (
                  <li key={aplicacion.id}>
                    <div>
                      <strong>
                        {aplicacion.nombre} · {aplicacion.fechaObjetivo}
                      </strong>
                      <span>
                        {aplicacion.bloquesAfectados.length} bloques ·{" "}
                        {aplicacion.puntosGastados} puntos históricos
                      </span>
                    </div>
                    <time dateTime={aplicacion.aplicadaEn}>
                      {formatearInstante(aplicacion.aplicadaEn)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {seleccion && operacionId && (
        <DialogoAdquirirRecompensa
          recompensa={seleccion}
          procesando={procesando}
          {...(errorAccion ? { error: errorAccion } : {})}
          onCancelar={cancelar}
          onConfirmar={() => void confirmar()}
        />
      )}
    </section>
  );
}

function mensajeError(causa: unknown): string {
  return causa instanceof Error
    ? causa.message
    : "No fue posible consultar o modificar el inventario.";
}

function formatearInstante(instante: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(instante));
}
