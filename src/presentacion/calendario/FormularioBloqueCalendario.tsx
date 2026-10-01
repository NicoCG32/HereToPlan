import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ActividadDto,
  BloqueCalendarioDto,
  ResultadoGestionBloque,
} from "../../aplicacion";
import type { ServiciosCalendario } from "./ServiciosCalendario";
import { useEnfoqueError } from "../hooks/useEnfoqueError";
import { DialogoPlanificacion } from "./DialogoPlanificacion";

interface FormularioBloqueCalendarioProps {
  readonly actividades: readonly ActividadDto[];
  readonly contextoId: string;
  readonly nombreContexto: string;
  readonly contextoVisibleId?: string;
  readonly fecha: string;
  readonly actividadPreseleccionadaId?: string;
  readonly bloque?: BloqueCalendarioDto;
  readonly servicios: Pick<
    ServiciosCalendario,
    "asignarActividad" | "editarBloque" | "consultarCalendario"
  >;
  readonly onCancelar: () => void;
  readonly onGuardado: (mensaje: string) => void;
  readonly onNuevaActividad: (origen: HTMLButtonElement) => void;
}

export function FormularioBloqueCalendario({
  actividades,
  contextoId,
  nombreContexto,
  contextoVisibleId,
  fecha,
  actividadPreseleccionadaId,
  bloque,
  servicios,
  onCancelar,
  onGuardado,
  onNuevaActividad,
}: FormularioBloqueCalendarioProps) {
  const actividadInicial =
    bloque?.actividadId ??
    actividadPreseleccionadaId ??
    actividades[0]?.id ??
    "";
  const actividad = actividades.find(
    (candidata) => candidata.id === actividadInicial,
  );
  const [actividadId, setActividadId] = useState(actividadInicial);
  const [fechaBloque, setFechaBloque] = useState(fecha);
  const [minutos, setMinutos] = useState(
    String(
      bloque?.minutosPlanificados ?? actividad?.tiempoNecesarioMinutos ?? 30,
    ),
  );
  const [rigidez, setRigidez] = useState<"ESTRICTO" | "FLEXIBLE">(
    bloque?.politica.rigidez ??
      actividad?.politicaPredeterminada?.rigidez ??
      "FLEXIBLE",
  );
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const [estadoDia, setEstadoDia] = useState<
    Readonly<{
      clave: string;
      bloques: readonly BloqueCalendarioDto[];
      error?: string;
    }>
  >();
  const claveDia = `${contextoVisibleId ?? "TODAS"}:${fechaBloque}`;
  const resultadoDia = estadoDia?.clave === claveDia ? estadoDia : undefined;
  const bloquesDelDia = resultadoDia?.bloques ?? [];
  const cargandoDia = !resultadoDia;
  const errorDia = resultadoDia?.error;
  const seccionRef = useRef<HTMLElement>(null);
  const actividadRef = useRef<HTMLSelectElement>(null);
  const fechaRef = useRef<HTMLInputElement>(null);
  const crearActividadRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let activa = true;
    servicios.consultarCalendario
      .ejecutar({
        seleccion: contextoVisibleId
          ? { tipo: "CONTEXTO", contextoId: contextoVisibleId }
          : { tipo: "TODAS" },
        vistaTemporal: "DIA",
        fechaAncla: fechaBloque,
      })
      .then(
        (calendario) => {
          if (!activa) return;
          setEstadoDia({
            clave: claveDia,
            bloques: calendario.bloquesVisibles.filter(
              (item) => item.fecha === fechaBloque,
            ),
          });
        },
        () => {
          if (!activa) return;
          setEstadoDia({
            clave: claveDia,
            bloques: [],
            error: "No fue posible consultar los bloques de esta fecha.",
          });
        },
      );
    return () => {
      activa = false;
    };
  }, [servicios, contextoVisibleId, fechaBloque, claveDia]);

  useEnfoqueError(seccionRef, error ?? "");

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setGuardando(true);
    setError(undefined);
    const politica = {
      rigidez,
      autoridadPlazo: "PERSONAL" as const,
      ...(rigidez === "FLEXIBLE"
        ? {
            ajustesPermitidos: [
              "EXCUSAR",
              "REPROGRAMAR",
              "EXTENDER_PLAZO",
              "REDUCIR_CARGA",
            ] as const,
          }
        : {}),
    };
    try {
      const resultado = bloque
        ? await servicios.editarBloque.ejecutar({
            bloqueId: bloque.id,
            fecha: fechaBloque,
            minutosPlanificados: Number(minutos),
            politica,
          })
        : await servicios.asignarActividad.ejecutar({
            actividadId,
            contextoId,
            fecha: fechaBloque,
            minutosPlanificados: Number(minutos),
            politica,
          });
      procesarResultado(resultado);
    } catch (causa: unknown) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No fue posible guardar el bloque.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const procesarResultado = (resultado: ResultadoGestionBloque) => {
    if (resultado.exito) {
      onGuardado(
        bloque
          ? `El bloque ${resultado.bloque.titulo} fue actualizado.`
          : `La actividad ${resultado.bloque.titulo} fue asignada a ${fechaBloque}.`,
      );
      return;
    }
    setError(resultado.error.mensaje);
  };

  return (
    <DialogoPlanificacion
      tituloId="titulo-editor-dia"
      focoInicialRef={
        actividades.length === 0 && !bloque
          ? crearActividadRef
          : bloque
            ? fechaRef
            : actividadRef
      }
      bloqueado={guardando}
      onCerrar={onCancelar}
    >
      <section
        ref={seccionRef}
        className="editor-dia"
        aria-labelledby="titulo-editor-dia"
      >
        <div className="titulo-region">
          <div>
            <p className="sobrelinea">1 · Asignar un bloque</p>
            <h3 id="titulo-editor-dia">
              {bloque ? "Editar bloque" : `Planificar ${fechaBloque}`}
            </h3>
          </div>
          {!bloque && (
            <button
              ref={crearActividadRef}
              className="boton-texto"
              type="button"
              onClick={(evento) => onNuevaActividad(evento.currentTarget)}
            >
              Nueva actividad
            </button>
          )}
        </div>
        <p className="contexto-editor">
          Agenda: <strong>{nombreContexto}</strong>. Después podrás revisar y
          confirmar la planificación.
        </p>
        <details className="detalle-dia-editor">
          <summary>Ya planificado para {fechaBloque}</summary>
          {cargandoDia ? (
            <p role="status">Consultando la fecha…</p>
          ) : errorDia ? (
            <p role="status">{errorDia}</p>
          ) : bloquesDelDia.length > 0 ? (
            <ul>
              {bloquesDelDia.map((item) => (
                <li key={item.id}>
                  <strong>{item.titulo}</strong> · {item.origen.nombreContexto}{" "}
                  · {item.minutosPlanificados} min · {item.estado.toLowerCase()}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin bloques para esta fecha.</p>
          )}
        </details>
        {actividades.length === 0 && !bloque ? (
          <div className="estado-vacio-bloques">
            <p>No hay actividades en el catálogo.</p>
            <button
              ref={crearActividadRef}
              className="boton-primario"
              type="button"
              onClick={(evento) => onNuevaActividad(evento.currentTarget)}
            >
              Crear primera actividad
            </button>
            <button
              className="boton-secundario"
              type="button"
              onClick={onCancelar}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <form
            className="formulario-contexto formulario-bloque-calendario"
            onSubmit={(evento) => void enviar(evento)}
            aria-busy={guardando}
            noValidate
          >
            {guardando && (
              <p className="ayuda-campo campo-ancho" role="status">
                Guardando el bloque; los controles están temporalmente
                indisponibles.
              </p>
            )}
            <div className="campo campo-ancho">
              <label htmlFor="actividad-bloque">Actividad</label>
              <select
                ref={actividadRef}
                id="actividad-bloque"
                value={actividadId}
                onChange={(evento) => {
                  const id = evento.target.value;
                  setActividadId(id);
                  const seleccionada = actividades.find(
                    (candidata) => candidata.id === id,
                  );
                  if (seleccionada) {
                    setMinutos(String(seleccionada.tiempoNecesarioMinutos));
                    setRigidez(
                      seleccionada.politicaPredeterminada?.rigidez ??
                        "FLEXIBLE",
                    );
                  }
                }}
                disabled={Boolean(bloque) || guardando}
                aria-describedby={
                  bloque ? "motivo-actividad-bloque-fija" : undefined
                }
              >
                {actividades.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.titulo} — {etiquetaTipo(item.tipo)}
                  </option>
                ))}
              </select>
              {bloque && (
                <small
                  id="motivo-actividad-bloque-fija"
                  className="motivo-control-inhabilitado"
                >
                  La actividad pertenece a la identidad del bloque; para
                  cambiarla crea una asignación nueva.
                </small>
              )}
            </div>
            <div className="campo">
              <label htmlFor="fecha-bloque-calendario">Fecha</label>
              <input
                ref={fechaRef}
                id="fecha-bloque-calendario"
                type="date"
                value={fechaBloque}
                onChange={(evento) => setFechaBloque(evento.target.value)}
                disabled={guardando}
              />
            </div>
            <div className="campo">
              <label htmlFor="minutos-bloque-calendario">
                Minutos planificados
              </label>
              <input
                id="minutos-bloque-calendario"
                type="number"
                min="1"
                value={minutos}
                onChange={(evento) => setMinutos(evento.target.value)}
                disabled={guardando}
              />
            </div>
            <fieldset className="selector-politica campo-ancho">
              <legend>Política efectiva</legend>
              <label>
                <input
                  type="radio"
                  name="rigidez-bloque"
                  value="FLEXIBLE"
                  checked={rigidez === "FLEXIBLE"}
                  onChange={() => setRigidez("FLEXIBLE")}
                  disabled={guardando}
                />
                Flexible — admite ajustes autorizados
              </label>
              <label>
                <input
                  type="radio"
                  name="rigidez-bloque"
                  value="ESTRICTO"
                  checked={rigidez === "ESTRICTO"}
                  onChange={() => setRigidez("ESTRICTO")}
                  disabled={guardando}
                />
                Estricta — no admite ajustes
              </label>
            </fieldset>
            {error && (
              <p
                className="mensaje-error mensaje-formulario"
                role="alert"
                tabIndex={-1}
              >
                {error}
              </p>
            )}
            <div className="acciones-formulario campo-ancho">
              <button
                className="boton-secundario"
                type="button"
                onClick={onCancelar}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                className="boton-primario"
                type="submit"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando…"
                  : bloque
                    ? "Guardar cambios"
                    : "Agregar bloque"}
              </button>
            </div>
          </form>
        )}
      </section>
    </DialogoPlanificacion>
  );
}

function etiquetaTipo(tipo: ActividadDto["tipo"]): string {
  return {
    TAREA_SIMPLE: "Tarea simple",
    TAREA_COMPUESTA: "Tarea compuesta",
    PROYECTO: "Proyecto",
    HABITO: "Hábito",
  }[tipo];
}
