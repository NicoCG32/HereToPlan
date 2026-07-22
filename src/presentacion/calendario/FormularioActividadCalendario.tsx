import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ActividadDto,
  CampoCrearActividad,
  ComandoCrearActividad,
  ModoSeguimientoDto,
  ResultadoCrearActividad,
  ResultadoEditarActividad,
} from "../../aplicacion";
import type { ServiciosCalendario } from "./ServiciosCalendario";
import { useEnfoqueError } from "../hooks/useEnfoqueError";
import { SelectorModoSeguimiento } from "../actividades/SelectorModoSeguimiento";

interface FormularioActividadCalendarioProps {
  readonly crearActividad: ServiciosCalendario["crearActividad"];
  readonly editarActividad?: NonNullable<
    ServiciosCalendario["editarActividad"]
  >;
  readonly actividad?: ActividadDto;
  readonly fechaDestino?: string;
  readonly onCancelar: () => void;
  readonly onCreada: (actividad: ActividadDto, asignar: boolean) => void;
}

const DIAS = [
  [1, "Lunes"],
  [2, "Martes"],
  [3, "Miércoles"],
  [4, "Jueves"],
  [5, "Viernes"],
  [6, "Sábado"],
  [7, "Domingo"],
] as const;

export function FormularioActividadCalendario({
  crearActividad,
  editarActividad,
  actividad,
  fechaDestino,
  onCancelar,
  onCreada,
}: FormularioActividadCalendarioProps) {
  const [tipo, setTipo] = useState<ActividadDto["tipo"]>(
    actividad?.tipo ?? "TAREA_SIMPLE",
  );
  const [titulo, setTitulo] = useState(actividad?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(actividad?.descripcion ?? "");
  const [minutos, setMinutos] = useState(
    String(actividad?.tiempoNecesarioMinutos ?? 30),
  );
  const [modoSeguimiento, setModoSeguimiento] = useState<ModoSeguimientoDto>(
    actividad?.modoSeguimiento ?? "MANUAL",
  );
  const [fechaLimite, setFechaLimite] = useState(
    actividad && actividad.tipo !== "HABITO"
      ? (actividad.fechaLimite ?? "")
      : "",
  );
  const [frecuencia, setFrecuencia] = useState<
    "DIARIA" | "SEMANAL" | "PERSONALIZADA"
  >(actividad?.tipo === "HABITO" ? actividad.frecuencia : "DIARIA");
  const [diasSemana, setDiasSemana] = useState<number[]>(
    actividad?.tipo === "HABITO" ? [...actividad.diasSemana] : [1],
  );
  const [errores, setErrores] = useState<
    Partial<Record<CampoCrearActividad | "general", string>>
  >({});
  const [guardando, setGuardando] = useState(false);
  const intencionAsignar = useRef(false);
  const formularioRef = useRef<HTMLFormElement>(null);
  const tipoRef = useRef<HTMLSelectElement>(null);
  const claveError = JSON.stringify(errores);

  useEffect(() => tipoRef.current?.focus(), []);
  useEnfoqueError(formularioRef, claveError);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setGuardando(true);
    setErrores({});
    try {
      const comando = crearComando();
      const resultado = actividad
        ? await editarActividad!.ejecutar({
            actividadId: actividad.id,
            ...comando,
          })
        : await crearActividad.ejecutar(comando);
      procesarResultado(resultado);
    } catch (error: unknown) {
      setErrores({
        general:
          error instanceof Error
            ? error.message
            : "No fue posible crear la actividad.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const crearComando = (): ComandoCrearActividad => {
    const base = {
      titulo,
      ...(descripcion ? { descripcion } : {}),
      tiempoNecesarioMinutos: Number(minutos),
      modoSeguimiento,
    };
    if (tipo === "HABITO") {
      return {
        ...base,
        tipo,
        frecuencia,
        ...(frecuencia === "DIARIA"
          ? {}
          : {
              diasSemana:
                frecuencia === "SEMANAL" ? [diasSemana[0] ?? 1] : diasSemana,
            }),
      };
    }
    return {
      ...base,
      tipo,
      ...(fechaLimite ? { fechaLimite } : {}),
    };
  };

  const procesarResultado = (
    resultado: ResultadoCrearActividad | ResultadoEditarActividad,
  ) => {
    if (resultado.exito) {
      onCreada(resultado.actividad, intencionAsignar.current);
      return;
    }
    setErrores({
      [resultado.error.campo ?? "general"]: resultado.error.mensaje,
    });
  };

  const alternarDia = (dia: number) => {
    setDiasSemana((actuales) =>
      actuales.includes(dia)
        ? actuales.filter((actual) => actual !== dia)
        : [...actuales, dia].sort((a, b) => a - b),
    );
  };

  return (
    <section className="panel-contexto" aria-labelledby="titulo-actividad">
      <p className="sobrelinea">Catálogo de actividades</p>
      <h3 id="titulo-actividad">
        {actividad ? "Editar actividad" : "Nueva actividad"}
      </h3>
      <p className="descripcion-panel-contexto">
        La actividad define qué quieres realizar. Solo ocupará una fecha cuando
        guardes además un bloque explícito.
      </p>
      <form
        ref={formularioRef}
        className="formulario-contexto"
        onSubmit={(evento) => void enviar(evento)}
        aria-busy={guardando}
        noValidate
      >
        {guardando && (
          <p className="ayuda-campo campo-ancho" role="status">
            Guardando la actividad; los controles están temporalmente
            indisponibles.
          </p>
        )}
        <div className="campo">
          <label htmlFor="tipo-actividad">Tipo</label>
          <select
            ref={tipoRef}
            id="tipo-actividad"
            value={tipo}
            onChange={(evento) =>
              setTipo(evento.target.value as ActividadDto["tipo"])
            }
            disabled={guardando || Boolean(actividad)}
            aria-describedby={actividad ? "ayuda-tipo-actividad" : undefined}
          >
            <option value="TAREA_SIMPLE">Tarea simple</option>
            <option value="TAREA_COMPUESTA">Tarea compuesta</option>
            <option value="PROYECTO">Proyecto</option>
            <option value="HABITO">Hábito</option>
          </select>
          {actividad && (
            <small id="ayuda-tipo-actividad">
              La familia tarea/hábito se conserva para proteger su historia.
            </small>
          )}
        </div>
        <SelectorModoSeguimiento
          valor={modoSeguimiento}
          deshabilitado={guardando}
          {...(errores.modoSeguimiento
            ? { error: errores.modoSeguimiento }
            : {})}
          onCambiar={setModoSeguimiento}
        />
        <div className="campo">
          <label htmlFor="titulo-actividad-campo">Título</label>
          <input
            id="titulo-actividad-campo"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            aria-invalid={Boolean(errores.titulo)}
            aria-describedby={
              errores.titulo ? "error-titulo-actividad" : undefined
            }
            disabled={guardando}
          />
          {errores.titulo && (
            <p id="error-titulo-actividad" className="mensaje-error">
              {errores.titulo}
            </p>
          )}
        </div>
        <div className="campo campo-ancho">
          <label htmlFor="descripcion-actividad">Descripción (opcional)</label>
          <textarea
            id="descripcion-actividad"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            disabled={guardando}
          />
        </div>
        <div className="campo">
          <label htmlFor="minutos-necesarios">Tiempo necesario (minutos)</label>
          <input
            id="minutos-necesarios"
            type="number"
            min="1"
            value={minutos}
            onChange={(evento) => setMinutos(evento.target.value)}
            aria-invalid={Boolean(errores.tiempoNecesarioMinutos)}
            aria-describedby={
              errores.tiempoNecesarioMinutos
                ? "error-minutos-actividad"
                : undefined
            }
            disabled={guardando}
          />
          {errores.tiempoNecesarioMinutos && (
            <p id="error-minutos-actividad" className="mensaje-error">
              {errores.tiempoNecesarioMinutos}
            </p>
          )}
        </div>
        {tipo !== "HABITO" && (
          <div className="campo">
            <label htmlFor="fecha-limite">Fecha límite (opcional)</label>
            <input
              id="fecha-limite"
              type="date"
              value={fechaLimite}
              onChange={(evento) => setFechaLimite(evento.target.value)}
              aria-invalid={Boolean(errores.fechaLimite)}
              aria-describedby={
                errores.fechaLimite ? "error-fecha-limite-actividad" : undefined
              }
              disabled={guardando}
            />
            {errores.fechaLimite && (
              <p id="error-fecha-limite-actividad" className="mensaje-error">
                {errores.fechaLimite}
              </p>
            )}
          </div>
        )}
        {tipo === "HABITO" && (
          <>
            <div className="campo">
              <label htmlFor="frecuencia-habito">Frecuencia</label>
              <select
                id="frecuencia-habito"
                value={frecuencia}
                onChange={(evento) =>
                  setFrecuencia(evento.target.value as typeof frecuencia)
                }
                aria-invalid={Boolean(errores.frecuencia)}
                aria-describedby={
                  errores.frecuencia ? "error-frecuencia-habito" : undefined
                }
                disabled={guardando}
              >
                <option value="DIARIA">Diaria</option>
                <option value="SEMANAL">Semanal</option>
                <option value="PERSONALIZADA">Personalizada</option>
              </select>
              {errores.frecuencia && (
                <p id="error-frecuencia-habito" className="mensaje-error">
                  {errores.frecuencia}
                </p>
              )}
            </div>
            {frecuencia !== "DIARIA" && (
              <fieldset
                className="selector-dias campo-ancho"
                aria-invalid={Boolean(errores.diasSemana)}
                aria-describedby={
                  errores.diasSemana ? "error-dias-habito" : undefined
                }
                tabIndex={-1}
              >
                <legend>Días de la semana</legend>
                {DIAS.map(([dia, nombre]) => (
                  <label key={dia}>
                    <input
                      type={frecuencia === "SEMANAL" ? "radio" : "checkbox"}
                      name="dias-habito"
                      checked={diasSemana.includes(dia)}
                      onChange={() =>
                        frecuencia === "SEMANAL"
                          ? setDiasSemana([dia])
                          : alternarDia(dia)
                      }
                      disabled={guardando}
                    />
                    {nombre}
                  </label>
                ))}
                {errores.diasSemana && (
                  <p id="error-dias-habito" className="mensaje-error">
                    {errores.diasSemana}
                  </p>
                )}
              </fieldset>
            )}
          </>
        )}
        {errores.general && (
          <p
            className="mensaje-error mensaje-formulario"
            role="alert"
            tabIndex={-1}
          >
            {errores.general}
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
            className={actividad ? "boton-primario" : "boton-secundario"}
            type="submit"
            onClick={() => {
              intencionAsignar.current = false;
            }}
            disabled={guardando}
          >
            {actividad ? "Guardar cambios" : "Guardar sin programar"}
          </button>
          {!actividad && fechaDestino && (
            <button
              className="boton-primario"
              type="submit"
              onClick={() => {
                intencionAsignar.current = true;
              }}
              disabled={guardando}
            >
              Guardar y asignar a {fechaDestino}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
