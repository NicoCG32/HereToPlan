import type { ActividadDto, InventarioRecompensasDto } from "../../aplicacion";

export type ElementoAsignableArrastrado =
  | Readonly<{ tipo: "ACTIVIDAD"; id: string; nombre: string }>
  | Readonly<{ tipo: "RECOMPENSA"; id: string; nombre: string }>;

interface BandejaAsignablesCalendarioProps {
  readonly fecha: string;
  readonly actividadesSinProgramar: readonly ActividadDto[];
  readonly actividadesAsignadas: readonly ActividadDto[];
  readonly inventario?: InventarioRecompensasDto;
  readonly cargandoInventario: boolean;
  readonly errorInventario?: string;
  readonly onFecha: (fecha: string) => void;
  readonly onNuevaActividad: (origen: HTMLButtonElement) => void;
  readonly onAsignarActividad: (
    actividadId: string,
    fecha: string,
    origen: HTMLButtonElement,
  ) => void;
  readonly onAplicarRecompensa: (
    unidadId: string,
    fecha: string,
    origen: HTMLButtonElement,
  ) => void;
  readonly onArrastre: (elemento?: ElementoAsignableArrastrado) => void;
}

export function BandejaAsignablesCalendario({
  fecha,
  actividadesSinProgramar,
  actividadesAsignadas,
  inventario,
  cargandoInventario,
  errorInventario,
  onFecha,
  onNuevaActividad,
  onAsignarActividad,
  onAplicarRecompensa,
  onArrastre,
}: BandejaAsignablesCalendarioProps) {
  return (
    <section className="bandeja-asignables" aria-labelledby="asignables">
      <div className="titulo-region">
        <div>
          <p className="sobrelinea">Asignación explícita</p>
          <h3 id="asignables">Actividades e inventario</h3>
          <p>
            Elige una fecha y continúa al editor o a la vista previa. También
            puedes arrastrar un elemento hasta un día del calendario.
          </p>
        </div>
        <div className="campo campo-fecha-asignable">
          <label htmlFor="fecha-asignable">Fecha de asignación</label>
          <input
            id="fecha-asignable"
            type="date"
            value={fecha}
            onChange={(evento) => onFecha(evento.target.value)}
          />
        </div>
      </div>
      <div className="grupos-asignables">
        <GrupoActividades
          titulo="Sin programar"
          actividades={actividadesSinProgramar}
          fecha={fecha}
          onAsignar={onAsignarActividad}
          onArrastre={onArrastre}
        />
        <GrupoActividades
          titulo="Ya asignadas"
          actividades={actividadesAsignadas}
          fecha={fecha}
          onAsignar={onAsignarActividad}
          onArrastre={onArrastre}
        />
        <div aria-labelledby="inventario-asignable">
          <h4 id="inventario-asignable">Inventario disponible</h4>
          {cargandoInventario ? (
            <p aria-live="polite">Cargando inventario…</p>
          ) : errorInventario ? (
            <p className="mensaje-error" role="alert">
              {errorInventario}
            </p>
          ) : !inventario || inventario.disponibles.length === 0 ? (
            <p className="estado-vacio-lineal">
              No hay unidades disponibles. Puedes adquirirlas en Puntos.
            </p>
          ) : (
            <ul className="lista-asignables">
              {inventario.disponibles.map((unidad) => (
                <li
                  key={unidad.id}
                  draggable
                  onDragStart={() =>
                    onArrastre({
                      tipo: "RECOMPENSA",
                      id: unidad.id,
                      nombre: unidad.nombre,
                    })
                  }
                  onDragEnd={() => onArrastre(undefined)}
                >
                  <div>
                    <strong>{unidad.nombre}</strong>
                    <span>Unidad disponible</span>
                  </div>
                  <button
                    className="boton-texto"
                    type="button"
                    data-unidad-recompensa={unidad.id}
                    onClick={(evento) =>
                      onAplicarRecompensa(
                        unidad.id,
                        fecha,
                        evento.currentTarget,
                      )
                    }
                  >
                    Aplicar {unidad.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="instruccion-arrastre">
        Arrastrar es opcional: soltar sólo abre el editor o la vista previa; no
        guarda ni consume nada. Los botones ofrecen el mismo recorrido por
        teclado.
      </p>
      <button
        className="boton-secundario"
        type="button"
        onClick={(evento) => onNuevaActividad(evento.currentTarget)}
      >
        Nueva actividad sin fecha
      </button>
    </section>
  );
}

function GrupoActividades({
  titulo,
  actividades,
  fecha,
  onAsignar,
  onArrastre,
}: Readonly<{
  titulo: string;
  actividades: readonly ActividadDto[];
  fecha: string;
  onAsignar: BandejaAsignablesCalendarioProps["onAsignarActividad"];
  onArrastre: BandejaAsignablesCalendarioProps["onArrastre"];
}>) {
  const id = `grupo-${titulo.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div aria-labelledby={id}>
      <h4 id={id}>{titulo}</h4>
      {actividades.length === 0 ? (
        <p className="estado-vacio-lineal">No hay actividades en este grupo.</p>
      ) : (
        <ul className="lista-asignables">
          {actividades.map((actividad) => (
            <li
              key={actividad.id}
              draggable
              onDragStart={() =>
                onArrastre({
                  tipo: "ACTIVIDAD",
                  id: actividad.id,
                  nombre: actividad.titulo,
                })
              }
              onDragEnd={() => onArrastre(undefined)}
            >
              <div>
                <strong>{actividad.titulo}</strong>
                <span>{etiquetaTipoActividad(actividad.tipo)}</span>
              </div>
              <button
                className="boton-texto"
                type="button"
                onClick={(evento) =>
                  onAsignar(actividad.id, fecha, evento.currentTarget)
                }
              >
                Asignar {actividad.titulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function etiquetaTipoActividad(tipo: ActividadDto["tipo"]): string {
  if (tipo === "HABITO") return "Hábito";
  if (tipo === "PROYECTO") return "Proyecto";
  return "Tarea";
}
