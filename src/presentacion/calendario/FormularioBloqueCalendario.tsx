import { useState, type FormEvent } from "react";
import type {
  ActividadDto,
  BloqueCalendarioDto,
  ResultadoGestionBloque,
} from "../../aplicacion";
import type { ServiciosCalendario } from "./ServiciosCalendario";

interface FormularioBloqueCalendarioProps {
  readonly actividades: readonly ActividadDto[];
  readonly contextoId: string;
  readonly fecha: string;
  readonly actividadPreseleccionadaId?: string;
  readonly bloque?: BloqueCalendarioDto;
  readonly servicios: Pick<
    ServiciosCalendario,
    "asignarActividad" | "editarBloque"
  >;
  readonly onCancelar: () => void;
  readonly onGuardado: (mensaje: string) => void;
  readonly onNuevaActividad: () => void;
}

export function FormularioBloqueCalendario({
  actividades,
  contextoId,
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
    <section className="editor-dia" aria-labelledby="titulo-editor-dia">
      <div className="titulo-region">
        <div>
          <p className="sobrelinea">Asignación temporal</p>
          <h3 id="titulo-editor-dia">
            {bloque ? "Editar bloque" : `Planificar ${fecha}`}
          </h3>
        </div>
        {!bloque && (
          <button
            className="boton-texto"
            type="button"
            onClick={onNuevaActividad}
          >
            Nueva actividad
          </button>
        )}
      </div>
      {actividades.length === 0 && !bloque ? (
        <div className="estado-vacio-bloques">
          <p>No hay actividades en el catálogo.</p>
          <button
            className="boton-primario"
            type="button"
            onClick={onNuevaActividad}
          >
            Crear primera actividad
          </button>
        </div>
      ) : (
        <form
          className="formulario-contexto formulario-bloque-calendario"
          onSubmit={(evento) => void enviar(evento)}
          noValidate
        >
          <div className="campo campo-ancho">
            <label htmlFor="actividad-bloque">Actividad</label>
            <select
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
                    seleccionada.politicaPredeterminada?.rigidez ?? "FLEXIBLE",
                  );
                }
              }}
              disabled={Boolean(bloque) || guardando}
            >
              {actividades.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titulo} — {etiquetaTipo(item.tipo)}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="fecha-bloque-calendario">Fecha</label>
            <input
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
            <p className="mensaje-error mensaje-formulario" role="alert">
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
