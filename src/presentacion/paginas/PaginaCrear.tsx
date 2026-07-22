import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  ActividadDto,
  CalendarioDto,
  ContextoPlanificacionDto,
  ImpactoEliminacionContextoDto,
} from "../../aplicacion";
import { PantallaAgendaBorrador } from "../agendas/PantallaAgendaBorrador";
import type { ServiciosAgendaBorrador } from "../agendas/ServiciosAgendaBorrador";
import { DialogoEliminarContexto } from "../calendario/DialogoEliminarContexto";
import { FormularioActividadCalendario } from "../calendario/FormularioActividadCalendario";
import { FormularioContextoNombrado } from "../calendario/FormularioContextoNombrado";
import type { ServiciosCalendario } from "../calendario/ServiciosCalendario";
import { DialogoEliminarActividad } from "../crear/DialogoEliminarActividad";
import { etiquetaModoSeguimiento } from "../actividades/etiquetasActividad";
import "./PaginaCrear.css";
import { EncabezadoPagina } from "./EncabezadoPagina";

interface PaginaCrearProps {
  readonly serviciosCalendario?: ServiciosCalendario;
  readonly serviciosAgenda?: ServiciosAgendaBorrador;
}

type EditorVisible =
  | Readonly<{ tipo: "CREAR_AGENDA" }>
  | Readonly<{ tipo: "EDITAR_AGENDA"; contexto: ContextoPlanificacionDto }>
  | Readonly<{ tipo: "CREAR_ACTIVIDAD" }>
  | Readonly<{ tipo: "EDITAR_ACTIVIDAD"; actividad: ActividadDto }>;

export function PaginaCrear({
  serviciosCalendario,
  serviciosAgenda,
}: PaginaCrearProps) {
  const navegar = useNavigate();
  const [editor, setEditor] = useState<EditorVisible>();
  const [catalogo, setCatalogo] = useState<CalendarioDto>();
  const [error, setError] = useState<string>();
  const [mensaje, setMensaje] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [impactoAgenda, setImpactoAgenda] =
    useState<ImpactoEliminacionContextoDto>();
  const [actividadAEliminar, setActividadAEliminar] = useState<ActividadDto>();
  const [procesando, setProcesando] = useState(false);
  const [errorDialogo, setErrorDialogo] = useState<string>();
  const origenDialogoRef = useRef<HTMLElement | undefined>(undefined);

  useEffect(() => {
    if (!serviciosCalendario) return;
    let activo = true;
    serviciosCalendario.consultarCalendario
      .ejecutar({
        seleccion: { tipo: "TODAS" },
        vistaTemporal: "MES",
        fechaAncla: hoyLocal(),
      })
      .then(
        (resultado) => {
          if (!activo) return;
          setCatalogo(resultado);
          setError(undefined);
        },
        (causa: unknown) => {
          if (!activo) return;
          setError(
            causa instanceof Error
              ? causa.message
              : "No fue posible consultar los catálogos.",
          );
        },
      );
    return () => {
      activo = false;
    };
  }, [revision, serviciosCalendario]);

  const registrarContexto = (contexto: ContextoPlanificacionDto) => {
    setEditor(undefined);
    setMensaje(`La agenda ${contexto.nombre} quedó guardada.`);
    setRevision((actual) => actual + 1);
  };

  const registrarActividad = (actividad: ActividadDto, asignar: boolean) => {
    setEditor(undefined);
    setRevision((actual) => actual + 1);
    if (asignar) {
      void navegar(
        `/calendario?actividad=${encodeURIComponent(actividad.id)}&fecha=${hoyLocal()}`,
      );
      return;
    }
    setMensaje(`${actividad.titulo} quedó disponible sin programar.`);
  };

  const cerrarDialogo = () => {
    setImpactoAgenda(undefined);
    setActividadAEliminar(undefined);
    setErrorDialogo(undefined);
    queueMicrotask(() => origenDialogoRef.current?.focus());
  };

  const prepararEliminacionAgenda = async (
    contexto: ContextoPlanificacionDto,
    origen: HTMLElement,
  ) => {
    if (!serviciosCalendario?.consultarImpactoEliminacion) return;
    origenDialogoRef.current = origen;
    setProcesando(true);
    setErrorDialogo(undefined);
    try {
      const resultado =
        await serviciosCalendario.consultarImpactoEliminacion.ejecutar(
          contexto.id,
        );
      if (resultado.exito) setImpactoAgenda(resultado.impacto);
      else setError(resultado.error.mensaje);
    } catch (causa: unknown) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No fue posible consultar el impacto de la agenda.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const eliminarAgenda = async (
    estrategia: "TRASLADAR_A_LIBRE" | "ELIMINAR_BORRADORES",
    confirmacionReforzada?: string,
  ) => {
    if (!serviciosCalendario || !impactoAgenda) return;
    setProcesando(true);
    setErrorDialogo(undefined);
    try {
      const resultado = await serviciosCalendario.eliminarContexto.ejecutar({
        contextoId: impactoAgenda.contextoId,
        estrategia,
        huellaImpacto: impactoAgenda.huella,
        ...(confirmacionReforzada ? { confirmacionReforzada } : {}),
      });
      if (!resultado.exito) {
        setErrorDialogo(resultado.error.mensaje);
        return;
      }
      setMensaje(`La agenda ${resultado.resultado.nombre} fue eliminada.`);
      cerrarDialogo();
      setRevision((actual) => actual + 1);
    } catch (causa: unknown) {
      setErrorDialogo(
        causa instanceof Error
          ? causa.message
          : "No fue posible eliminar la agenda.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const eliminarActividad = async () => {
    if (!serviciosCalendario?.eliminarActividad || !actividadAEliminar) return;
    setProcesando(true);
    setErrorDialogo(undefined);
    try {
      const resultado = await serviciosCalendario.eliminarActividad.ejecutar(
        actividadAEliminar.id,
      );
      if (!resultado.exito) {
        setErrorDialogo(resultado.error.mensaje);
        return;
      }
      setMensaje(`La actividad ${resultado.titulo} fue eliminada.`);
      cerrarDialogo();
      setRevision((actual) => actual + 1);
    } catch (causa: unknown) {
      setErrorDialogo(
        causa instanceof Error
          ? causa.message
          : "No fue posible eliminar la actividad.",
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="pagina-aplicacion pagina-crear">
      <EncabezadoPagina
        sobrelinea="Elementos reutilizables"
        titulo="Crear"
        descripcion="Define y administra agendas y actividades. Programar siempre requiere un bloque explícito en el calendario."
      />

      {serviciosCalendario ? (
        <>
          <section
            className="panel-contexto acciones-creacion"
            aria-label="Crear elementos"
          >
            <button
              className="boton-primario"
              type="button"
              aria-expanded={editor?.tipo === "CREAR_AGENDA"}
              onClick={() => setEditor({ tipo: "CREAR_AGENDA" })}
            >
              Crear agenda
            </button>
            <button
              className="boton-secundario"
              type="button"
              aria-expanded={editor?.tipo === "CREAR_ACTIVIDAD"}
              onClick={() => setEditor({ tipo: "CREAR_ACTIVIDAD" })}
            >
              Crear actividad
            </button>
          </section>

          {(editor?.tipo === "CREAR_AGENDA" ||
            editor?.tipo === "EDITAR_AGENDA") && (
            <FormularioContextoNombrado
              crearContexto={serviciosCalendario.crearContexto}
              {...(editor.tipo === "EDITAR_AGENDA" &&
              serviciosCalendario.editarContexto
                ? {
                    editarContexto: serviciosCalendario.editarContexto,
                    contexto: editor.contexto,
                  }
                : {})}
              onCancelar={() => setEditor(undefined)}
              onCreado={registrarContexto}
            />
          )}
          {(editor?.tipo === "CREAR_ACTIVIDAD" ||
            editor?.tipo === "EDITAR_ACTIVIDAD") && (
            <FormularioActividadCalendario
              crearActividad={serviciosCalendario.crearActividad}
              {...(editor.tipo === "EDITAR_ACTIVIDAD" &&
              serviciosCalendario.editarActividad
                ? {
                    editarActividad: serviciosCalendario.editarActividad,
                    actividad: editor.actividad,
                  }
                : { fechaDestino: hoyLocal() })}
              onCancelar={() => setEditor(undefined)}
              onCreada={registrarActividad}
            />
          )}

          {mensaje && (
            <p className="mensaje-exito" role="status">
              {mensaje}
            </p>
          )}
          {error && (
            <p className="mensaje-error" role="alert">
              {error}
            </p>
          )}

          <div className="catalogos-crear">
            <CatalogoAgendas
              contextos={catalogo?.contextos ?? []}
              editable={Boolean(serviciosCalendario.editarContexto)}
              eliminable={Boolean(
                serviciosCalendario.consultarImpactoEliminacion,
              )}
              onEditar={(contexto) =>
                setEditor({ tipo: "EDITAR_AGENDA", contexto })
              }
              onEliminar={(contexto, origen) =>
                void prepararEliminacionAgenda(contexto, origen)
              }
            />
            <CatalogoActividades
              actividades={catalogo?.actividadesAsignables ?? []}
              editable={Boolean(serviciosCalendario.editarActividad)}
              eliminable={Boolean(serviciosCalendario.eliminarActividad)}
              onEditar={(actividad) =>
                setEditor({ tipo: "EDITAR_ACTIVIDAD", actividad })
              }
              onEliminar={(actividad, origen) => {
                origenDialogoRef.current = origen;
                setErrorDialogo(undefined);
                setActividadAEliminar(actividad);
              }}
              onAgendar={(actividad) =>
                void navegar(
                  `/calendario?actividad=${encodeURIComponent(actividad.id)}&fecha=${hoyLocal()}`,
                )
              }
            />
          </div>
        </>
      ) : serviciosAgenda ? (
        <PantallaAgendaBorrador servicios={serviciosAgenda} />
      ) : (
        <p className="mensaje-error" role="alert">
          La creación no está disponible en esta composición.
        </p>
      )}

      {impactoAgenda && (
        <DialogoEliminarContexto
          impacto={impactoAgenda}
          procesando={procesando}
          {...(errorDialogo ? { error: errorDialogo } : {})}
          onCancelar={cerrarDialogo}
          onTrasladarALibre={() => void eliminarAgenda("TRASLADAR_A_LIBRE")}
          onEliminarBorradores={(confirmacion) =>
            void eliminarAgenda("ELIMINAR_BORRADORES", confirmacion)
          }
        />
      )}
      {actividadAEliminar && (
        <DialogoEliminarActividad
          actividad={actividadAEliminar}
          procesando={procesando}
          {...(errorDialogo ? { error: errorDialogo } : {})}
          onCancelar={cerrarDialogo}
          onConfirmar={() => void eliminarActividad()}
        />
      )}
    </div>
  );
}

interface CatalogoAgendasProps {
  readonly contextos: readonly ContextoPlanificacionDto[];
  readonly editable: boolean;
  readonly eliminable: boolean;
  readonly onEditar: (contexto: ContextoPlanificacionDto) => void;
  readonly onEliminar: (
    contexto: ContextoPlanificacionDto,
    origen: HTMLElement,
  ) => void;
}

function CatalogoAgendas({
  contextos,
  editable,
  eliminable,
  onEditar,
  onEliminar,
}: CatalogoAgendasProps) {
  const agendas = contextos.filter((contexto) => contexto.tipo === "NOMBRADO");
  return (
    <section className="panel-contexto" aria-labelledby="catalogo-agendas">
      <p className="sobrelinea">Catálogo</p>
      <h2 id="catalogo-agendas">Agendas existentes</h2>
      {agendas.length === 0 ? (
        <p className="estado-vacio-lineal">
          Todavía no existen agendas nombradas.
        </p>
      ) : (
        <ul className="lista-catalogo-crear">
          {agendas.map((agenda) => (
            <li key={agenda.id}>
              <div>
                <strong>{agenda.nombre}</strong>
                <span>{agenda.proposito ?? "Sin propósito específico"}</span>
              </div>
              <div className="acciones-item-catalogo">
                {editable && (
                  <button
                    className="boton-texto"
                    type="button"
                    onClick={() => onEditar(agenda)}
                  >
                    Editar
                  </button>
                )}
                {eliminable && (
                  <button
                    className="boton-texto boton-peligro"
                    type="button"
                    onClick={(evento) =>
                      onEliminar(agenda, evento.currentTarget)
                    }
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface CatalogoActividadesProps {
  readonly actividades: readonly ActividadDto[];
  readonly editable: boolean;
  readonly eliminable: boolean;
  readonly onEditar: (actividad: ActividadDto) => void;
  readonly onEliminar: (actividad: ActividadDto, origen: HTMLElement) => void;
  readonly onAgendar: (actividad: ActividadDto) => void;
}

function CatalogoActividades({
  actividades,
  editable,
  eliminable,
  onEditar,
  onEliminar,
  onAgendar,
}: CatalogoActividadesProps) {
  return (
    <section className="panel-contexto" aria-labelledby="catalogo-actividades">
      <p className="sobrelinea">Catálogo</p>
      <h2 id="catalogo-actividades">Actividades existentes</h2>
      {actividades.length === 0 ? (
        <p className="estado-vacio-lineal">Todavía no existen actividades.</p>
      ) : (
        <ul className="lista-catalogo-crear">
          {actividades.map((actividad) => (
            <li key={actividad.id}>
              <div>
                <strong>{actividad.titulo}</strong>
                <span>
                  {actividad.tipo.replaceAll("_", " ")} ·{" "}
                  {etiquetaModoSeguimiento(actividad.modoSeguimiento)}
                </span>
              </div>
              <div className="acciones-item-catalogo">
                <button
                  className="boton-texto"
                  type="button"
                  onClick={() => onAgendar(actividad)}
                >
                  Agendar
                </button>
                {editable && (
                  <button
                    className="boton-texto"
                    type="button"
                    onClick={() => onEditar(actividad)}
                  >
                    Editar
                  </button>
                )}
                {eliminable && (
                  <button
                    className="boton-texto boton-peligro"
                    type="button"
                    onClick={(evento) =>
                      onEliminar(actividad, evento.currentTarget)
                    }
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function hoyLocal(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}
