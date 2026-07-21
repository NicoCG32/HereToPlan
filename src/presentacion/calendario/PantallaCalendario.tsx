import { useEffect, useRef, useState, type RefObject } from "react";
import type {
  ActividadDto,
  BloqueCalendarioDto,
  CalendarioDto,
  ContextoPlanificacionDto,
  ImpactoEliminacionContextoDto,
  RevisionCortePlanificacionDto,
  VistaTemporalCalendario,
} from "../../aplicacion";
import { DialogoEliminarContexto } from "./DialogoEliminarContexto";
import {
  DialogoResolverBloque,
  type AccionResolucionBloque,
} from "./DialogoResolverBloque";
import { DialogoRevisarCorte } from "./DialogoRevisarCorte";
import { FormularioActividadCalendario } from "./FormularioActividadCalendario";
import { FormularioBloqueCalendario } from "./FormularioBloqueCalendario";
import { FormularioContextoNombrado } from "./FormularioContextoNombrado";
import { PanelGraciaPlanificacion } from "./PanelGraciaPlanificacion";
import { ControlCronometroBloque } from "./ControlCronometroBloque";
import type { ServiciosCalendario } from "./ServiciosCalendario";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface PantallaCalendarioProps {
  readonly servicios: ServiciosCalendario;
  readonly onPuntosCambiados?: () => void;
  readonly revisionExterna?: number;
}

type EstadoCalendario =
  | Readonly<{ tipo: "cargando" }>
  | Readonly<{ tipo: "lista"; calendario: CalendarioDto }>
  | Readonly<{ tipo: "error"; mensaje: string }>;

const SELECCION_TODAS = "TODAS";
const ID_CONTEXTO_LIBRE = "contexto-libre";

export function PantallaCalendario({
  servicios,
  onPuntosCambiados,
  revisionExterna = 0,
}: PantallaCalendarioProps) {
  const botonCrearContextoRef = useRef<HTMLButtonElement>(null);
  const botonEliminarContextoRef = useRef<HTMLButtonElement>(null);
  const botonRevisarCorteRef = useRef<HTMLButtonElement>(null);
  const botonResolucionOrigenRef = useRef<HTMLButtonElement | null>(null);
  const controlEditorOrigenRef = useRef<HTMLElement | null>(null);
  const controlActividadOrigenRef = useRef<HTMLElement | null>(null);
  const selectorContextoRef = useRef<HTMLSelectElement>(null);
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
  const [impactoEliminacion, setImpactoEliminacion] =
    useState<ImpactoEliminacionContextoDto>();
  const [consultandoImpacto, setConsultandoImpacto] = useState(false);
  const [procesandoEliminacion, setProcesandoEliminacion] = useState(false);
  const [errorEliminacion, setErrorEliminacion] = useState<string>();
  const [bloquesSeleccionados, setBloquesSeleccionados] = useState<
    readonly string[]
  >([]);
  const [corteBorradorId, setCorteBorradorId] = useState<string>();
  const [revisionCorte, setRevisionCorte] =
    useState<RevisionCortePlanificacionDto>();
  const [revisandoCorte, setRevisandoCorte] = useState(false);
  const [asignandoCorte, setAsignandoCorte] = useState(false);
  const [errorCorte, setErrorCorte] = useState<string>();
  const [resolucionPendiente, setResolucionPendiente] = useState<
    Readonly<{
      bloque: BloqueCalendarioDto;
      accion: AccionResolucionBloque;
      operacionId: string;
    }>
  >();
  const [procesandoResolucion, setProcesandoResolucion] = useState(false);
  const [errorResolucion, setErrorResolucion] = useState<string>();
  const [revision, setRevision] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const claveErrorVisible =
    estado.tipo === "error" ? estado.mensaje : (errorAccion ?? "");
  useEnfoqueError(panelRef, claveErrorVisible);

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
  }, [
    diaSeleccionado,
    fechaAncla,
    revision,
    revisionExterna,
    seleccion,
    servicios,
    vista,
  ]);

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
    requestAnimationFrame(() => controlActividadOrigenRef.current?.focus());
  };

  const cancelarActividad = () => {
    setFormularioActividadVisible(false);
    requestAnimationFrame(() => controlActividadOrigenRef.current?.focus());
  };

  const cancelarEditor = () => {
    setDiaSeleccionado(undefined);
    setBloqueEditado(undefined);
    devolverFocoEditor(diaSeleccionado ?? bloqueEditado?.fecha);
  };

  const devolverFocoEditor = (fecha?: string) => {
    requestAnimationFrame(() => {
      const origen = controlEditorOrigenRef.current;
      if (origen?.isConnected) {
        origen.focus();
        return;
      }
      const dia = fecha
        ? panelRef.current?.querySelector<HTMLButtonElement>(
            `button[aria-label="Seleccionar día ${fecha}"]`,
          )
        : undefined;
      (dia ?? selectorContextoRef.current)?.focus();
    });
  };

  const quitarBloque = async (bloque: BloqueCalendarioDto) => {
    try {
      const resultado = await servicios.eliminarBloque.ejecutar(bloque.id);
      if (resultado.exito) {
        setBloquesSeleccionados((actuales) =>
          actuales.filter((id) => id !== bloque.id),
        );
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

  const abrirEliminacion = async (contextoId: string) => {
    setConsultandoImpacto(true);
    setErrorAccion(undefined);
    setErrorEliminacion(undefined);
    try {
      const resultado =
        await servicios.consultarImpactoEliminacion.ejecutar(contextoId);
      if (resultado.exito) {
        setImpactoEliminacion(resultado.impacto);
        return;
      }
      setErrorAccion(resultado.error.mensaje);
    } catch (error: unknown) {
      setErrorAccion(
        error instanceof Error
          ? error.message
          : "No fue posible calcular el impacto de eliminar la agenda.",
      );
    } finally {
      setConsultandoImpacto(false);
    }
  };

  const cancelarEliminacion = () => {
    setImpactoEliminacion(undefined);
    setErrorEliminacion(undefined);
    requestAnimationFrame(() => botonEliminarContextoRef.current?.focus());
  };

  const ejecutarEliminacion = async (
    estrategia: "TRASLADAR_A_LIBRE" | "ELIMINAR_BORRADORES",
    confirmacionReforzada?: string,
  ) => {
    if (!impactoEliminacion) return;
    setProcesandoEliminacion(true);
    setErrorEliminacion(undefined);
    try {
      const resultado = await servicios.eliminarContexto.ejecutar({
        contextoId: impactoEliminacion.contextoId,
        estrategia,
        huellaImpacto: impactoEliminacion.huella,
        ...(confirmacionReforzada ? { confirmacionReforzada } : {}),
      });
      if (!resultado.exito) {
        setErrorEliminacion(resultado.error.mensaje);
        return;
      }
      setImpactoEliminacion(undefined);
      setSeleccion(ID_CONTEXTO_LIBRE);
      setDiaSeleccionado(undefined);
      setBloqueEditado(undefined);
      setActividadPreseleccionadaId(undefined);
      if (estrategia === "ELIMINAR_BORRADORES") {
        const bloquesEliminados = new Set(
          impactoEliminacion.bloqueIdsEditables,
        );
        setBloquesSeleccionados((actuales) =>
          actuales.filter((id) => !bloquesEliminados.has(id)),
        );
      }
      setMensaje(
        estrategia === "TRASLADAR_A_LIBRE"
          ? `La agenda ${resultado.resultado.nombre} fue eliminada y sus ${resultado.resultado.cantidadBloquesTrasladados} bloques editables quedaron en Libre.`
          : `La agenda ${resultado.resultado.nombre} y sus ${resultado.resultado.cantidadBloquesEliminados} bloques editables fueron eliminados. El historial confirmado se conservó.`,
      );
      setRevision((actual) => actual + 1);
      requestAnimationFrame(() => selectorContextoRef.current?.focus());
    } catch (error: unknown) {
      setErrorEliminacion(
        error instanceof Error
          ? error.message
          : "No fue posible eliminar la agenda sin comprometer sus datos.",
      );
    } finally {
      setProcesandoEliminacion(false);
    }
  };

  const alternarBloqueSeleccionado = (bloqueId: string) => {
    setBloquesSeleccionados((actuales) =>
      actuales.includes(bloqueId)
        ? actuales.filter((id) => id !== bloqueId)
        : [...actuales, bloqueId],
    );
    setErrorAccion(undefined);
  };

  const revisarSeleccion = async () => {
    setRevisandoCorte(true);
    setErrorAccion(undefined);
    try {
      const resultado = await servicios.revisarCorte.ejecutar({
        bloqueIds: bloquesSeleccionados,
        ...(corteBorradorId ? { corteId: corteBorradorId } : {}),
      });
      if (!resultado.exito) {
        setErrorAccion(resultado.error.mensaje);
        return;
      }
      setRevisionCorte(resultado.revision);
      setErrorCorte(undefined);
    } catch (error: unknown) {
      setErrorAccion(
        error instanceof Error
          ? error.message
          : "No fue posible preparar la revisión de la planificación.",
      );
    } finally {
      setRevisandoCorte(false);
    }
  };

  const cancelarRevisionCorte = () => {
    setRevisionCorte(undefined);
    setErrorCorte(undefined);
    requestAnimationFrame(() => botonRevisarCorteRef.current?.focus());
  };

  const asignarCorte = async () => {
    if (!revisionCorte) return;
    setAsignandoCorte(true);
    setErrorCorte(undefined);
    try {
      const resultado = await servicios.asignarCorte.ejecutar({
        bloqueIds: bloquesSeleccionados,
        ...(revisionCorte.corteId ? { corteId: revisionCorte.corteId } : {}),
      });
      if (!resultado.exito) {
        setErrorCorte(resultado.error.mensaje);
        return;
      }
      setRevisionCorte(undefined);
      setBloquesSeleccionados([]);
      setCorteBorradorId(undefined);
      actualizar(
        `La planificación entró en gracia y se confirmará automáticamente a las ${formatearHora(resultado.corte.confirmarAutomaticamenteEn!)}.`,
      );
      requestAnimationFrame(() => selectorContextoRef.current?.focus());
    } catch (error: unknown) {
      setErrorCorte(
        error instanceof Error
          ? error.message
          : "No fue posible asignar la planificación.",
      );
    } finally {
      setAsignandoCorte(false);
    }
  };

  const abrirResolucion = (
    bloque: BloqueCalendarioDto,
    accion: AccionResolucionBloque,
    origen: HTMLButtonElement,
  ) => {
    try {
      botonResolucionOrigenRef.current = origen;
      setErrorResolucion(undefined);
      setResolucionPendiente({
        bloque,
        accion,
        operacionId: servicios.generarOperacionId(),
      });
    } catch (error: unknown) {
      setErrorAccion(
        error instanceof Error
          ? error.message
          : "No fue posible preparar la resolución del bloque.",
      );
    }
  };

  const cancelarResolucion = () => {
    setResolucionPendiente(undefined);
    setErrorResolucion(undefined);
    requestAnimationFrame(() => botonResolucionOrigenRef.current?.focus());
  };

  const resolverBloque = async () => {
    if (!resolucionPendiente) return;
    setProcesandoResolucion(true);
    setErrorResolucion(undefined);
    try {
      const casoDeUso =
        resolucionPendiente.accion === "COMPLETAR"
          ? servicios.completarBloque
          : servicios.marcarBloqueIncumplido;
      const resultado = await casoDeUso.ejecutar({
        bloqueId: resolucionPendiente.bloque.id,
        operacionId: resolucionPendiente.operacionId,
      });
      if (!resultado.exito) {
        setErrorResolucion(resultado.error.mensaje);
        return;
      }
      const titulo = resolucionPendiente.bloque.titulo;
      const completado = resolucionPendiente.accion === "COMPLETAR";
      setResolucionPendiente(undefined);
      if (completado) onPuntosCambiados?.();
      actualizar(
        completado
          ? `${titulo} quedó completado y registrado en su historial.`
          : `${titulo} quedó marcado como incumplido, sin deuda ni pérdida de puntos.`,
      );
    } catch (error: unknown) {
      setErrorResolucion(
        error instanceof Error
          ? error.message
          : "No fue posible registrar la resolución del bloque.",
      );
    } finally {
      setProcesandoResolucion(false);
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
      <section
        ref={panelRef}
        className="panel-agenda estado-error"
        role="alert"
        tabIndex={-1}
      >
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
  const contextoEliminable =
    seleccion !== SELECCION_TODAS && contextoAsignacion?.tipo === "NOMBRADO"
      ? contextoAsignacion
      : undefined;
  const editorVisible = diaSeleccionado || bloqueEditado;

  return (
    <section
      ref={panelRef}
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

      <PanelGraciaPlanificacion
        sincronizarCortes={servicios.sincronizarCortes}
        corregirCorte={servicios.corregirCorte}
        onCorteCorregido={(corte) => {
          setCorteBorradorId(corte.id);
          setBloquesSeleccionados(corte.bloqueIds);
          actualizar(
            "La confirmación prevista fue cancelada. Los bloques vuelven a estar editables y permanecen seleccionados para una nueva revisión.",
          );
          requestAnimationFrame(() => selectorContextoRef.current?.focus());
        }}
        onCorreccionRechazada={(mensajeCorreccion) => {
          setErrorAccion(mensajeCorreccion);
          setRevision((actual) => actual + 1);
          requestAnimationFrame(() => selectorContextoRef.current?.focus());
        }}
        revision={revision}
      />

      <div className="barra-contextos">
        <div className="campo selector-contexto">
          <label htmlFor="selector-contexto">Contexto visible</label>
          <select
            ref={selectorContextoRef}
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
        {contextoEliminable && (
          <button
            ref={botonEliminarContextoRef}
            className="boton-texto boton-peligro"
            type="button"
            onClick={() => void abrirEliminacion(contextoEliminable.id)}
            disabled={consultandoImpacto}
          >
            {consultandoImpacto
              ? "Calculando impacto…"
              : `Eliminar agenda ${contextoEliminable.nombre}`}
          </button>
        )}
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
        onPlanificarFecha={(origen) => {
          controlEditorOrigenRef.current = origen;
          setDiaSeleccionado(fechaAncla);
          setFechaDestinoActividad(fechaAncla);
          setBloqueEditado(undefined);
          setActividadPreseleccionadaId(undefined);
        }}
      />

      <p className="acceso-lista-calendario">
        <a href="#lista-equivalente">Consultar planificación como lista</a>
      </p>

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
          onCancelar={cancelarActividad}
          onCreada={actividadCreada}
        />
      )}

      {mensaje && (
        <p className="mensaje-exito" role="status">
          {mensaje}
        </p>
      )}
      {errorAccion && (
        <p
          className="mensaje-error mensaje-formulario"
          role="alert"
          tabIndex={-1}
        >
          {errorAccion}
        </p>
      )}

      <VistaCalendario
        calendario={calendario}
        {...(diaSeleccionado ? { diaSeleccionado } : {})}
        onSeleccionarDia={(fecha, origen) => {
          controlEditorOrigenRef.current = origen;
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
          onCancelar={cancelarEditor}
          onGuardado={(mensajeGuardado) => {
            const fechaEditor = bloqueEditado?.fecha ?? diaSeleccionado;
            setDiaSeleccionado(undefined);
            setFechaDestinoActividad(undefined);
            actualizar(mensajeGuardado);
            devolverFocoEditor(fechaEditor);
          }}
          onNuevaActividad={(origen) => {
            controlActividadOrigenRef.current = origen;
            setFechaDestinoActividad(
              bloqueEditado?.fecha ?? diaSeleccionado ?? calendario.hoy,
            );
            setFormularioActividadVisible(true);
          }}
        />
      )}

      <PanelSieteDias
        calendario={calendario}
        onSeleccionar={(fecha, origen) => {
          controlEditorOrigenRef.current = origen;
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
            onClick={(evento) => {
              controlActividadOrigenRef.current = evento.currentTarget;
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
                  onClick={(evento) => {
                    controlEditorOrigenRef.current = evento.currentTarget;
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
        bloquesSeleccionados={bloquesSeleccionados}
        botonRevisarRef={botonRevisarCorteRef}
        revisando={revisandoCorte}
        onAlternarSeleccion={alternarBloqueSeleccionado}
        onRevisar={() => void revisarSeleccion()}
        onEditar={(bloque, origen) => {
          controlEditorOrigenRef.current = origen;
          setBloqueEditado(bloque);
          setDiaSeleccionado(bloque.fecha);
          setFormularioActividadVisible(false);
        }}
        onQuitar={(bloque) => void quitarBloque(bloque)}
        onResolver={abrirResolucion}
        servicios={servicios}
        revisionCronometro={revision}
        onCronometroCambio={actualizar}
      />

      {impactoEliminacion && (
        <DialogoEliminarContexto
          impacto={impactoEliminacion}
          procesando={procesandoEliminacion}
          {...(errorEliminacion ? { error: errorEliminacion } : {})}
          onCancelar={cancelarEliminacion}
          onTrasladarALibre={() =>
            void ejecutarEliminacion("TRASLADAR_A_LIBRE")
          }
          onEliminarBorradores={(confirmacion) =>
            void ejecutarEliminacion("ELIMINAR_BORRADORES", confirmacion)
          }
        />
      )}

      {revisionCorte && (
        <DialogoRevisarCorte
          revision={revisionCorte}
          procesando={asignandoCorte}
          {...(errorCorte ? { error: errorCorte } : {})}
          onCancelar={cancelarRevisionCorte}
          onAsignar={() => void asignarCorte()}
        />
      )}

      {resolucionPendiente && (
        <DialogoResolverBloque
          bloque={resolucionPendiente.bloque}
          accion={resolucionPendiente.accion}
          procesando={procesandoResolucion}
          {...(errorResolucion ? { error: errorResolucion } : {})}
          onCancelar={cancelarResolucion}
          onConfirmar={() => void resolverBloque()}
        />
      )}
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
  readonly onPlanificarFecha: (origen: HTMLButtonElement) => void;
}

function BarraNavegacionCalendario({
  vista,
  fechaAncla,
  onVista,
  onFecha,
  onDesplazar,
  onHoy,
  onPlanificarFecha,
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
        <button
          className="boton-primario accion-planificar-fecha"
          type="button"
          onClick={(evento) => onPlanificarFecha(evento.currentTarget)}
          aria-label={`Planificar fecha ${fechaAncla}`}
        >
          Planificar fecha
        </button>
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
  readonly onSeleccionarDia: (fecha: string, origen: HTMLButtonElement) => void;
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
                onClick={(evento) =>
                  onSeleccionarDia(fecha, evento.currentTarget)
                }
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
  readonly onSeleccionar: (fecha: string, origen: HTMLButtonElement) => void;
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
              onClick={(evento) =>
                onSeleccionar(dia.fecha, evento.currentTarget)
              }
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
          aria-label={`${bloque.titulo}, ${bloque.origen.nombreContexto}, ${obtenerMinutosEfectivos(bloque)} minutos efectivos, ${bloque.politica.rigidez.toLowerCase()}, ${etiquetaEstadoBloque(bloque.estado).toLowerCase()}`}
        >
          <strong>{bloque.titulo}</strong>
          <span>{bloque.origen.nombreContexto}</span>
          <small>
            {etiquetaCargaBloque(bloque)} ·{" "}
            {bloque.politica.rigidez === "ESTRICTO" ? "Estricta" : "Flexible"}
            {bloque.estado !== "PENDIENTE" &&
              ` · ${etiquetaEstadoBloque(bloque.estado)}`}
          </small>
        </li>
      ))}
    </ul>
  );
}

function VistaListaBloques({
  bloques,
  bloquesSeleccionados,
  botonRevisarRef,
  revisando,
  onAlternarSeleccion,
  onRevisar,
  onEditar,
  onQuitar,
  onResolver,
  servicios,
  revisionCronometro,
  onCronometroCambio,
}: {
  readonly bloques: readonly BloqueCalendarioDto[];
  readonly bloquesSeleccionados: readonly string[];
  readonly botonRevisarRef: RefObject<HTMLButtonElement | null>;
  readonly revisando: boolean;
  readonly onAlternarSeleccion: (bloqueId: string) => void;
  readonly onRevisar: () => void;
  readonly onEditar: (
    bloque: BloqueCalendarioDto,
    origen: HTMLButtonElement,
  ) => void;
  readonly onQuitar: (bloque: BloqueCalendarioDto) => void;
  readonly onResolver: (
    bloque: BloqueCalendarioDto,
    accion: AccionResolucionBloque,
    origen: HTMLButtonElement,
  ) => void;
  readonly servicios: ServiciosCalendario;
  readonly revisionCronometro: number;
  readonly onCronometroCambio: (mensaje: string) => void;
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
          <p className="descripcion-lista-equivalente">
            Los mismos bloques del rango visible, ordenados por fecha y con sus
            acciones disponibles.
          </p>
        </div>
        <button
          ref={botonRevisarRef}
          className="boton-primario"
          type="button"
          onClick={onRevisar}
          disabled={bloquesSeleccionados.length === 0 || revisando}
          aria-describedby={
            bloquesSeleccionados.length === 0
              ? "motivo-revisar-seleccion"
              : undefined
          }
        >
          {revisando
            ? "Preparando revisión…"
            : `Revisar selección (${bloquesSeleccionados.length})`}
        </button>
        {bloquesSeleccionados.length === 0 && (
          <p
            id="motivo-revisar-seleccion"
            className="motivo-control-inhabilitado"
          >
            Selecciona al menos un bloque editable para preparar la revisión.
          </p>
        )}
      </div>
      {bloques.length === 0 ? (
        <p className="estado-vacio-lineal">
          No hay bloques en el rango visible. Selecciona un día del calendario o
          de los próximos siete días para planificar el primero.
        </p>
      ) : (
        <ul aria-label="Planificación temporal en lista">
          {bloques.map((bloque) => (
            <li key={bloque.id}>
              <div>
                <time dateTime={bloque.fecha}>{bloque.fecha}</time>
                <strong>{bloque.titulo}</strong>
                <span>
                  {bloque.origen.nombreContexto} · {etiquetaCargaBloque(bloque)}{" "}
                  ·{" "}
                  {bloque.politica.rigidez === "ESTRICTO"
                    ? "Estricta"
                    : "Flexible"}
                </span>
                {bloque.editable ? (
                  <label className="seleccion-bloque-corte">
                    <input
                      type="checkbox"
                      checked={bloquesSeleccionados.includes(bloque.id)}
                      onChange={() => onAlternarSeleccion(bloque.id)}
                      aria-label={`Seleccionar ${bloque.titulo} para revisión`}
                    />
                    Incluir en la próxima revisión
                  </label>
                ) : bloque.estado === "PENDIENTE" && bloque.proteccion ? (
                  <span className="estado-proteccion-bloque">
                    {bloque.proteccion.estado === "EN_GRACIA"
                      ? "En período de gracia"
                      : "Planificación confirmada"}
                  </span>
                ) : (
                  <span className="estado-resolucion-bloque">
                    {etiquetaEstadoBloque(bloque.estado)}
                  </span>
                )}
                {bloque.historial.length > 0 && (
                  <ol
                    className="historial-bloque"
                    aria-label={`Historial de ${bloque.titulo}`}
                  >
                    {bloque.historial.map((evento) => (
                      <li key={`${evento.tipo}-${evento.ocurridoEn}`}>
                        {etiquetaEstadoBloque(evento.resultado)} el{" "}
                        <time dateTime={evento.ocurridoEn}>
                          {formatearInstante(evento.ocurridoEn)}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {bloque.editable && (
                <div className="acciones-bloque">
                  <button
                    className="boton-texto"
                    type="button"
                    onClick={(evento) => onEditar(bloque, evento.currentTarget)}
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
              {!bloque.editable &&
                bloque.proteccion?.estado === "CONFIRMADA" && (
                  <div className="ejecucion-bloque">
                    <ControlCronometroBloque
                      bloqueId={bloque.id}
                      titulo={bloque.titulo}
                      permitirInicio={bloque.estado === "PENDIENTE"}
                      servicios={servicios}
                      revision={revisionCronometro}
                      onCambio={onCronometroCambio}
                    />
                    {bloque.estado === "PENDIENTE" && (
                      <div className="acciones-bloque acciones-resolucion-bloque">
                        <button
                          className="boton-texto"
                          type="button"
                          onClick={(evento) =>
                            onResolver(
                              bloque,
                              "COMPLETAR",
                              evento.currentTarget,
                            )
                          }
                        >
                          Completar {bloque.titulo}
                        </button>
                        <button
                          className="boton-texto boton-peligro"
                          type="button"
                          onClick={(evento) =>
                            onResolver(
                              bloque,
                              "INCUMPLIR",
                              evento.currentTarget,
                            )
                          }
                        >
                          Marcar incumplido {bloque.titulo}
                        </button>
                      </div>
                    )}
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

function etiquetaEstadoBloque(estado: BloqueCalendarioDto["estado"]): string {
  return {
    PENDIENTE: "Pendiente",
    COMPLETADO: "Completado",
    INCUMPLIDO: "Incumplido",
    EXCUSADO: "Excusado",
  }[estado];
}

function obtenerMinutosEfectivos(bloque: BloqueCalendarioDto): number {
  return bloque.reduccionCarga?.minutosEfectivos ?? bloque.minutosPlanificados;
}

function etiquetaCargaBloque(bloque: BloqueCalendarioDto): string {
  const minutosEfectivos = obtenerMinutosEfectivos(bloque);
  return bloque.reduccionCarga
    ? `${minutosEfectivos} min efectivos (${bloque.minutosPlanificados} originales)`
    : `${minutosEfectivos} min`;
}

function formatearInstante(instante: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(instante));
}

function formatearHora(instante: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instante));
}
