import { useEffect, useRef, useState } from "react";
import type { BilleteraPuntosDto } from "../../aplicacion";
import { useEnfoqueError } from "../hooks/useEnfoqueError";
import type { ServiciosPuntos } from "./ServiciosPuntos";

interface PanelBilleteraProps {
  readonly servicios: ServiciosPuntos;
  readonly revision: number;
}

type EstadoPanelBilletera =
  | Readonly<{ tipo: "cargando" }>
  | Readonly<{ tipo: "lista"; billetera: BilleteraPuntosDto }>
  | Readonly<{ tipo: "error"; mensaje: string }>;

export function PanelBilletera({ servicios, revision }: PanelBilleteraProps) {
  const [estado, setEstado] = useState<EstadoPanelBilletera>({
    tipo: "cargando",
  });
  const [reintento, setReintento] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  useEnfoqueError(panelRef, estado.tipo === "error" ? estado.mensaje : "");

  useEffect(() => {
    let activo = true;
    servicios.consultarBilletera.ejecutar().then(
      (billetera) => {
        if (activo) setEstado({ tipo: "lista", billetera });
      },
      (error: unknown) => {
        if (!activo) return;
        setEstado({
          tipo: "error",
          mensaje:
            error instanceof Error
              ? error.message
              : "No fue posible consultar la billetera.",
        });
      },
    );
    return () => {
      activo = false;
    };
  }, [reintento, revision, servicios]);

  return (
    <section
      ref={panelRef}
      className="panel-agenda panel-billetera"
      aria-labelledby="titulo-billetera"
    >
      <header className="cabecera-panel-agenda cabecera-billetera">
        <div>
          <p className="sobrelinea">Economía trazable</p>
          <h2 id="titulo-billetera">Billetera de puntos</h2>
          <p className="descripcion-panel">
            El saldo se deriva de movimientos históricos; no se almacena como un
            número independiente.
          </p>
        </div>
        {estado.tipo === "lista" && (
          <p
            className="saldo-billetera"
            aria-label={`${estado.billetera.saldo} puntos disponibles`}
          >
            <strong>{estado.billetera.saldo}</strong>
            <span>puntos disponibles</span>
          </p>
        )}
      </header>

      {estado.tipo === "cargando" && (
        <p className="estado-vacio-lineal" role="status">
          Consultando movimientos…
        </p>
      )}
      {estado.tipo === "error" && (
        <div className="estado-billetera-error" role="alert" tabIndex={-1}>
          <p>No fue posible reconstruir el saldo. {estado.mensaje}</p>
          <button
            className="boton-secundario"
            type="button"
            onClick={() => {
              setEstado({ tipo: "cargando" });
              setReintento((actual) => actual + 1);
            }}
          >
            Reintentar billetera
          </button>
        </div>
      )}
      {estado.tipo === "lista" && estado.billetera.movimientos.length === 0 && (
        <p className="estado-vacio-lineal">
          Aún no hay movimientos. Completar un bloque confirmado generará el
          primer ingreso.
        </p>
      )}
      {estado.tipo === "lista" && estado.billetera.movimientos.length > 0 && (
        <ol
          className="lista-movimientos-puntos"
          aria-label="Movimientos de puntos"
        >
          {estado.billetera.movimientos.map((movimiento) => (
            <li id={`movimiento-${movimiento.id}`} key={movimiento.id}>
              <div>
                <strong>{movimiento.descripcion}</strong>
                <span>{etiquetaFuente(movimiento.fuente.tipo)}</span>
                <small>
                  Fuente: <code>{movimiento.fuente.id}</code>
                </small>
              </div>
              <div className="valor-movimiento-puntos">
                <strong>
                  {movimiento.variacion > 0 ? "+" : ""}
                  {movimiento.variacion}
                </strong>
                <time dateTime={movimiento.ocurridaEn}>
                  {formatearInstante(movimiento.ocurridaEn)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function etiquetaFuente(
  tipo: BilleteraPuntosDto["movimientos"][number]["fuente"]["tipo"],
): string {
  return tipo === "COMPROMISO_COMPLETADO"
    ? "Bloque completado"
    : "Canje de recompensa";
}

function formatearInstante(instante: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(instante));
}
