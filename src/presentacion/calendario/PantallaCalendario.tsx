import { useEffect, useRef, useState } from "react";
import type {
  ActividadDto,
  BloqueCalendarioDto,
  CalendarioDto,
  ContextoPlanificacionDto,
  VistaTemporalCalendario,
} from "../../aplicacion";
import { FormularioActividadCalendario } from "./FormularioActividadCalendario";
import { FormularioBloqueCalendario } from "./FormularioBloqueCalendario";
import { FormularioContextoNombrado } from "./FormularioContextoNombrado";
import type { ServiciosCalendario } from "./ServiciosCalendario";

interface PantallaCalendarioProps {
  readonly servicios: ServiciosCalendario;
}

type EstadoCalendario =
  | Readonly<{ tipo: "cargando" }>
  | Readonly<{ tipo: "lista"; calendario: CalendarioDto }>
  | Readonly<{ tipo: "error"; mensaje: string }>;

const SELECCION_TODAS = "TODAS";
const ID_CONTEXTO_LIBRE = "contexto-libre";

export function PantallaCalendario({ servicios }: PantallaCalendarioProps) {
  const botonCrearContextoRef = useRef<HTMLButtonElement>(null);
  const fechaInicialSincronizadaRef = useRef(false);
  const [estado, setEstado] = useState<EstadoCalendario>({ tipo: "cargando" });
  const [seleccion, setSeleccion] = useState(SELECCION_TODAS);
  const [vista, setVista] = useState<VistaTemporalCalendario>("MES");
  const [fechaAncla, setFechaAncla] = useState(obtenerHoyLocal());
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>();
  const [formularioContextoVisible, setFormularioContextoVisible] =
    useState(false);
  const [formularioActividadVisible, setFormularioActividadVisible] =
    useState(false);
  const [fechaDestinoActividad, setFechaDestinoActividad] = useState<string>();
  const [actividadPreseleccionadaId, setActividadPreseleccionadaId] =
    useState<string>();
  const [bloqueEditado, setBloqueEditado] = useState<BloqueCalendarioDto>();
  const [mensaje, setMensaje] = useState<string>();
  const [errorAccion, setErrorAccion] = useState<string>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let activa = true;
    servicios.consultarCalendario
      .ejecutar({
        seleccion:
          seleccion === SELECCION_TODAS
            ? { tipo: "TODAS" }
            : { tipo: "CONTEXTO", contextoId: seleccion },
        vistaTemporal: vista,
        fechaAncla,
        ...(diaSeleccionado ? { diaSeleccionado } : {}),
      })
      .then(
        (calendario) => {
          if (!activa) return;
          setEstado({ tipo: "lista", calendario });
          if (!fechaInicialSincronizadaRef.current) {
            fechaInicialSincronizadaRef.current = true;
            if (fechaAncla !== calendario.hoy) {
              setFechaAncla(calendario.hoy);
            }
          }
        },
        (error: unknown) => {
          if (!activa) return;
          setEstado({
            tipo: "error",
            mensaje:
              error instanceof Error
                ? error.message
                : "No fue posible cargar el calendario.",
          });
        },
      );
    return () => {
      activa = false;
    };
  }, [diaSeleccionado, fechaAncla, revision, seleccion, servicios, vista]);

  const actualizar = (mensajeActualizacion?: string) => {
    if (mensajeActualizacion) setMensaje(mensajeActualizacion);
    setErrorAccion(undefined);
    setBloqueEditado(undefined);
    setActividadPreseleccionadaId(undefined);
    setRevision((actual) => actual + 1);
  };

  const contextoCreado = (contexto: ContextoPlanificacionDto) => {
    setSeleccion(contexto.id);
    setFormularioContextoVisible(false);
    actualizar(
      `La agenda ${contexto.nombre} quedó disponible en el calendario.`,
    );
    botonCrearContextoRef.current?.focus();
  };

  const actividadCreada = (actividad: ActividadDto, asignar: boolean) => {
    setFormularioActividadVisible(false);
    setRevision((actual) => actual + 1);
    if (asignar && fechaDestinoActividad) {
      setDiaSeleccionado(fechaDestinoActividad);
      setActividadPreseleccionadaId(actividad.id);
      setMensaje(
        `${actividad.titulo} fue creada. Define ahora los minutos y la política del bloque.`,
      );
      return;
    }
    setMensaje(
      `${actividad.titulo} quedó en Sin programar hasta que le asignes un bloque.`,
    );
  };

  const quitarBloque = async (bloque: BloqueCalendarioDto) => {
    try {
      const resultado = await servicios.eliminarBloque.ejecutar(bloque.id);
      if (resultado.exito) {
        actualizar(
          `El bloque ${bloque.titulo} fue quitado de la planificación.`,
        );
        return;
      }
      setErrorAccion(resultado.error.mensaje);
    } catch (error: unknown) {
      setErrorAccion(
        error instanceof Error
          ? error.message
          : "No fue posible quitar el bloque.",
      );
    }
  };

  if (estado.tipo === "cargando") {
    return (
      <section className="panel-agenda estado-carga" aria-live="polite">
        <p>Cargando calendario general…</p>
      </section>
    );
  }

  if (estado.tipo === "error") {
    return (
      <section className="panel-agenda estado-error" role="alert">
        <h2>No fue posible abrir el calendario</h2>
        <p>{estado.mensaje}</p>
        <button
          className="boton-secundario"
          type="button"
          onClick={() => setRevision((actual) => actual + 1)}
        >
          Reintentar
        </button>
      </section>
    );
  }

  const calendario = estado.calendario;
  const contextoAsignacionId =
    seleccion === SELECCION_TODAS ? ID_CONTEXTO_LIBRE : seleccion;
  const contextoAsignacion = calendario.contextos.find(
    (contexto) => contexto.id === contextoAsignacionId,
  );
  const editorVisible = diaSeleccionado || bloqueEditado;

  return (
    <section
      className="panel-agenda panel-calendario"
      aria-labelledby="titulo-calendario"
    >
      <header className="cabecera-panel-agenda">
        <div>
          <p className="sobrelinea">Planificación global</p>
          <h2 id="titulo-calendario">Calendario general</h2>
          <p className="descripcion-panel">
            Toda actividad ocupa una fecha únicamente mediante un bloque. Puedes
            consultar conjuntamente Libre y las agendas nombradas sin alterar su
            origen.
          </p>
        </div>
        <button
          ref={botonCrearContextoRef}
          className="boton-primario"
          type="button"
          onClick={() => {
            setFormularioContextoVisible(true);
            setFormularioActividadVisible(false);
            setMensaje(undefined);
          }}
          aria-expanded={formularioContextoVisible}
          aria-controls="panel-nueva-agenda"
        >
          Nueva agenda
        </button>
      </header>

      <div className="barra-contextos">
        <div className="campo selector-contexto">
          <label htmlFor="selector-contexto">Contexto visible</label>
          <select
            id="selector-contexto"
            value={seleccion}
            onChange={(evento) => {
              setSeleccion(evento.target.value);
              setBloqueEditado(undefined);
            }}
          >
            <option value={SELECCION_TODAS}>Todas</option>
            {calendario.contextos.map((contexto) => (
              <option key={contexto.id} value={contexto.id}>
                {contexto.tipo === "LIBRE"
                  ? "Libre — predeterminado"
                  : contexto.nombre}
              </option>
            ))}
          </select>
        </div>
        <p className="contexto-asignacion" aria-live="polite">
          Las nuevas asignaciones se incorporarán en{" "}
          <strong>{contextoAsignacion?.nombre ?? "Libre"}</strong>.
        </p>
      </div>

      <BarraNavegacionCalendario
        vista={vista}
        fechaAncla={fechaAncla}
        onVista={(nuevaVista) => setVista(nuevaVista)}
        onFecha={setFechaAncla}
        onDesplazar={(direccion) =>
          setFechaAncla(desplazarFecha(fechaAncla, vista, direccion))
        }
        onHoy={() => {
          setFechaAncla(calendario.hoy);
          setDiaSeleccionado(calendario.hoy);
        }}
      />

      {formularioContextoVisible && (
        <div id="panel-nueva-agenda">
          <FormularioContextoNombrado
            crearContexto={servicios.crearContexto}
            onCancelar={() => {
              setFormularioContextoVisible(false);
              botonCrearContextoRef.current?.focus();
            }}
            onCreado={contextoCreado}
          />
        </div>
      )}

      {formularioActividadVisible && (
        <FormularioActividadCalendario
          crearActividad={servicios.crearActividad}
          {...(fechaDestinoActividad
            ? { fechaDestino: fechaDestinoActividad }
            : {})}
          onCancelar={() => setFormularioActividadVisible(false)}
          onCreada={actividadCreada}
        />
      )}

      {mensaje && (
        <p className="mensaje-exito" role="status">
          {mensaje}
        </p>
      )}
      {errorAccion && (
        <p className="mensaje-error mensaje-formulario" role="alert">
          {errorAccion}
        </p>
      )}

      <VistaCalendario
        calendario={calendario}
        {...(diaSeleccionado ? { diaSeleccionado } : {})}
        onSeleccionarDia={(fecha) => {
          setDiaSeleccionado(fecha);
          setFechaDestinoActividad(fecha);
          setBloqueEditado(undefined);
          setActividadPreseleccionadaId(undefined);
        }}
      />

      {editorVisible && !formularioActividadVisible && (
        <FormularioBloqueCalendario
          key={`${bloqueEditado?.id ?? "nuevo"}-${actividadPreseleccionadaId ?? "sin-preseleccion"}-${diaSeleccionado ?? "sin-dia"}`}
          actividades={calendario.actividadesAsignables}
          contextoId={bloqueEditado?.origen.contextoId ?? contextoAsignacionId}
          fecha={bloqueEditado?.fecha ?? diaSeleccionado ?? calendario.hoy}
          {...(actividadPreseleccionadaId
            ? { actividadPreseleccionadaId }
            : {})}
          {...(bloqueEditado ? { bloque: bloqueEditado } : {})}
          servicios={servicios}
          onCancelar={() => {
            setDiaSeleccionado(undefined);
            setBloqueEditado(undefined);
          }}
          onGuardado={actualizar}
          onNuevaActividad={() => {
            setFechaDestinoActividad(
              bloqueEditado?.fecha ?? diaSeleccionado ?? calendario.hoy,
            );
            setFormularioActividadVisible(true);
          }}
        />
      )}

      <PanelSieteDias
        calendario={calendario}
        onSeleccionar={(fecha) => {
          setDiaSeleccionado(fecha);
          setFechaDestinoActividad(fecha);
          setBloqueEditado(undefined);
          setActividadPreseleccionadaId(undefined);
        }}
      />

      <section className="bandeja-actividades" aria-labelledby="sin-programar">
        <div className="titulo-region">
          <div>
            <p className="sobrelinea">Catálogo</p>
            <h3 id="sin-programar">Sin programar</h3>
          </div>
          <button
            className="boton-secundario"
            type="button"
            onClick={() => {
              setFechaDestinoActividad(undefined);
              setFormularioActividadVisible(true);
            }}
          >
            Nueva actividad sin fecha
          </button>
        </div>
        {calendario.actividadesSinProgramar.length === 0 ? (
          <p className="estado-vacio-lineal">
            Todas las actividades poseen al menos un bloque explícito.
          </p>
        ) : (
          <ul className="lista-actividades-sin-programar">
            {calendario.actividadesSinProgramar.map((actividad) => (
              <li key={actividad.id}>
                <div>
                  <strong>{actividad.titulo}</strong>
                  <span>{etiquetaTipoActividad(actividad.tipo)}</span>
                </div>
                <button
                  className="boton-texto"
                  type="button"
                  onClick={() => {
                    setFechaAncla(calendario.hoy);
                    setDiaSeleccionado(calendario.hoy);
                    setFechaDestinoActividad(calendario.hoy);
                    setActividadPreseleccionadaId(actividad.id);
                  }}
                >
                  Agendar {actividad.titulo}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <VistaListaBloques
        bloques={calendario.listaEquivalente}
        onEditar={(bloque) => {
          setBloqueEditado(bloque);
          setDiaSeleccionado(bloque.fecha);
          setFormularioActividadVisible(false);
        }}
        onQuitar={(bloque) => void quitarBloque(bloque)}
      />
    </section>
  );
}

interface BarraNavegacionCalendarioProps {
  readonly vista: VistaTemporalCalendario;
  readonly fechaAncla: string;
  readonly onVista: (vista: VistaTemporalCalendario) => void;
  readonly onFecha: (fecha: string) => void;
  readonly onDesplazar: (direccion: -1 | 1) => void;
  readonly onHoy: () => void;
}

function BarraNavegacionCalendario({
  vista,
  fechaAncla,
  onVista,
  onFecha,
  onDesplazar,
  onHoy,
}: BarraNavegacionCalendarioProps) {
  return (
    <nav
      className="navegacion-calendario"
      aria-label="Navegación del calendario"
    >
      <div className="grupo-vistas" aria-label="Vista temporal">
        {(["DIA", "SEMANA", "MES"] as const).map((opcion) => (
          <button
            key={opcion}
            className="boton-secundario"
            type="button"
            aria-pressed={vista === opcion}
            onClick={() => onVista(opcion)}
          >
            {etiquetaVista(opcion)}
          </button>
        ))}
      </div>
      <div className="grupo-navegacion-fecha">
        <button
          className="boton-secundario"
          type="button"
          onClick={() => onDesplazar(-1)}
          aria-label="Período anterior"
        >
          ← Anterior
        </button>
        <button className="boton-secundario" type="button" onClick={onHoy}>
          Hoy
        </button>
        <button
          className="boton-secundario"
          type="button"
          onClick={() => onDesplazar(1)}
          aria-label="Período siguiente"
        >
          Siguiente →
        </button>
        <div className="campo campo-fecha-ancla">
          <label htmlFor="fecha-ancla">Fecha de referencia</label>
          <input
            id="fecha-ancla"
            type="date"
            value={fechaAncla}
            onChange={(evento) => onFecha(evento.target.value)}
          />
        </div>
      </div>
    </nav>
  );
}

function VistaCalendario({
  calendario,
  diaSeleccionado,
  onSeleccionarDia,
}: {
  readonly calendario: CalendarioDto;
  readonly diaSeleccionado?: string;
  readonly onSeleccionarDia: (fecha: string) => void;
}) {
  const fechas = enumerarFechas(
    calendario.rangoVisible.fechaInicio,
    calendario.rangoVisible.fechaFin,
  );
  return (
    <section className="superficie-calendario" aria-labelledby="vista-activa">
      <div className="encabezado-superficie-calendario">
        <div>
          <p className="sobrelinea">Vista activa</p>
          <h3 id="vista-activa">{calendario.seleccion.nombre}</h3>
        </div>
        <p>
          {calendario.resumenSeleccion.cantidadBloques} bloques ·{" "}
          {calendario.resumenSeleccion.minutosPlanificados} minutos
        </p>
      </div>
      <div
        className={`rejilla-calendario vista-${calendario.vistaTemporal.toLowerCase()}`}
      >
        {fechas.map((fecha) => {
          const bloques = calendario.bloquesVisibles.filter(
            (bloque) => bloque.fecha === fecha,
          );
          return (
            <article
              key={fecha}
              className={`dia-calendario${diaSeleccionado === fecha ? " seleccionado" : ""}`}
            >
              <button
                className="boton-dia-calendario"
                type="button"
                onClick={() => onSeleccionarDia(fecha)}
                aria-pressed={diaSeleccionado === fecha}
                aria-label={`Seleccionar día ${fecha}`}
              >
                <span>{formatearDia(fecha)}</span>
                <strong>{fecha.slice(8)}</strong>
              </button>
              <ListaCompactaBloques bloques={bloques} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PanelSieteDias({
  calendario,
  onSeleccionar,
}: {
  readonly calendario: CalendarioDto;
  readonly onSeleccionar: (fecha: string) => void;
}) {
  return (
    <section className="panel-siete-dias" aria-labelledby="proximos-siete-dias">
      <div className="titulo-region">
        <div>
          <p className="sobrelinea">Ventana móvil</p>
          <h3 id="proximos-siete-dias">Hoy y los seis días siguientes</h3>
        </div>
      </div>
      <div className="rejilla-siete-dias">
        {calendario.proximosSieteDias.map((dia) => (
          <article key={dia.fecha} className="dia-proximo">
            <button
              className="boton-dia-proximo"
              type="button"
              onClick={() => onSeleccionar(dia.fecha)}
              aria-label={`Planificar ${dia.fecha}`}
            >
              <span>{dia.esHoy ? "Hoy" : formatearDia(dia.fecha)}</span>
              <strong>{dia.fecha}</strong>
              <small>{dia.minutosPlanificados} min</small>
            </button>
            <ListaCompactaBloques bloques={dia.bloques} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ListaCompactaBloques({
  bloques,
}: {
  readonly bloques: readonly BloqueCalendarioDto[];
}) {
  if (bloques.length === 0)
    return <p className="dia-sin-bloques">Sin bloques</p>;
  return (
    <ul className="bloques-compactos">
      {bloques.map((bloque) => (
        <li
          key={bloque.id}
          aria-label={`${bloque.titulo}, ${bloque.origen.nombreContexto}, ${bloque.minutosPlanificados} minutos, ${bloque.politica.rigidez.toLowerCase()}`}
        >
          <strong>{bloque.titulo}</strong>
          <span>{bloque.origen.nombreContexto}</span>
          <small>
            {bloque.minutosPlanificados} min ·{" "}
            {bloque.politica.rigidez === "ESTRICTO" ? "Estricta" : "Flexible"}
          </small>
        </li>
      ))}
    </ul>
  );
}

function VistaListaBloques({
  bloques,
  onEditar,
  onQuitar,
}: {
  readonly bloques: readonly BloqueCalendarioDto[];
  readonly onEditar: (bloque: BloqueCalendarioDto) => void;
  readonly onQuitar: (bloque: BloqueCalendarioDto) => void;
}) {
  return (
    <section
      className="vista-lista-calendario"
      aria-labelledby="lista-equivalente"
    >
      <div className="titulo-region">
        <div>
          <p className="sobrelinea">Alternativa accesible</p>
          <h3 id="lista-equivalente">Vista de lista equivalente</h3>
        </div>
      </div>
      {bloques.length === 0 ? (
        <p className="estado-vacio-lineal">
          No hay bloques en el rango visible.
        </p>
      ) : (
        <ul>
          {bloques.map((bloque) => (
            <li key={bloque.id}>
              <div>
                <time dateTime={bloque.fecha}>{bloque.fecha}</time>
                <strong>{bloque.titulo}</strong>
                <span>
                  {bloque.origen.nombreContexto} · {bloque.minutosPlanificados}{" "}
                  min ·{" "}
                  {bloque.politica.rigidez === "ESTRICTO"
                    ? "Estricta"
                    : "Flexible"}
                </span>
              </div>
              {bloque.editable && (
                <div className="acciones-bloque">
                  <button
                    className="boton-texto"
                    type="button"
                    onClick={() => onEditar(bloque)}
                  >
                    Editar {bloque.titulo}
                  </button>
                  <button
                    className="boton-texto boton-peligro"
                    type="button"
                    onClick={() => onQuitar(bloque)}
                  >
                    Quitar {bloque.titulo}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function obtenerHoyLocal(): string {
  const hoy = new Date();
  return `${String(hoy.getFullYear()).padStart(4, "0")}-${String(
    hoy.getMonth() + 1,
  ).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function desplazarFecha(
  fecha: string,
  vista: VistaTemporalCalendario,
  direccion: -1 | 1,
): string {
  const instante = convertirFecha(fecha);
  if (vista === "MES") {
    instante.setUTCMonth(instante.getUTCMonth() + direccion);
  } else {
    instante.setUTCDate(
      instante.getUTCDate() + direccion * (vista === "SEMANA" ? 7 : 1),
    );
  }
  return serializarFecha(instante);
}

function enumerarFechas(inicio: string, fin: string): readonly string[] {
  const fechas: string[] = [];
  const cursor = convertirFecha(inicio);
  const limite = convertirFecha(fin);
  while (cursor <= limite) {
    fechas.push(serializarFecha(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return fechas;
}

function convertirFecha(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

function serializarFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function formatearDia(fecha: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    timeZone: "UTC",
  }).format(convertirFecha(fecha));
}

function etiquetaVista(vista: VistaTemporalCalendario): string {
  return { DIA: "Día", SEMANA: "Semana", MES: "Mes" }[vista];
}

function etiquetaTipoActividad(tipo: ActividadDto["tipo"]): string {
  return {
    TAREA_SIMPLE: "Tarea simple",
    TAREA_COMPUESTA: "Tarea compuesta",
    PROYECTO: "Proyecto",
    HABITO: "Hábito",
  }[tipo];
}
