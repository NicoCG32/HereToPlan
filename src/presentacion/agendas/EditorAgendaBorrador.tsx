import { useRef, useState, type FormEvent } from "react";
import type {
  AgendaBorradorDto,
  BloqueEditableAgendaBorrador,
  GuardarBloquesAgendaBorrador,
} from "../../aplicacion";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface EditorAgendaBorradorProps {
  readonly agenda: AgendaBorradorDto;
  readonly guardarBloques: GuardarBloquesAgendaBorrador;
  readonly alGuardar: (agenda: AgendaBorradorDto) => void;
}

interface BloqueEnEdicion extends BloqueEditableAgendaBorrador {
  readonly clave: string;
}

const BLOQUE_INICIAL = {
  actividad: "",
  fecha: "",
  minutosPlanificados: 30,
  rigidez: "FLEXIBLE",
  autoridadPlazo: "PERSONAL",
  ajustesPermitidos: ["EXCUSAR"],
} as const satisfies BloqueEditableAgendaBorrador;

export function EditorAgendaBorrador({
  agenda,
  guardarBloques,
  alGuardar,
}: EditorAgendaBorradorProps) {
  const secuenciaClaves = useRef(0);
  const [bloques, setBloques] = useState<readonly BloqueEnEdicion[]>(() =>
    convertirBloques(agenda),
  );
  const [borradorBloque, setBorradorBloque] =
    useState<BloqueEditableAgendaBorrador>(BLOQUE_INICIAL);
  const [claveEditada, setClaveEditada] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string>();
  const [error, setError] = useState<string>();
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEnfoqueError(errorRef, error ?? "");

  const agregarOEditarBloque = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const bloque: BloqueEnEdicion = {
      ...borradorBloque,
      ajustesPermitidos:
        borradorBloque.rigidez === "ESTRICTO"
          ? []
          : borradorBloque.ajustesPermitidos,
      clave: claveEditada ?? `nuevo-${++secuenciaClaves.current}`,
    };

    setBloques((actuales) =>
      claveEditada
        ? actuales.map((actual) =>
            actual.clave === claveEditada ? bloque : actual,
          )
        : [...actuales, bloque],
    );
    limpiarEditorBloque();
    setMensaje(undefined);
    setError(undefined);
  };

  const editarBloque = (bloque: BloqueEnEdicion) => {
    setClaveEditada(bloque.clave);
    setBorradorBloque({
      ...(bloque.id ? { id: bloque.id } : {}),
      ...(bloque.actividadId ? { actividadId: bloque.actividadId } : {}),
      actividad: bloque.actividad,
      fecha: bloque.fecha,
      minutosPlanificados: bloque.minutosPlanificados,
      rigidez: bloque.rigidez,
      autoridadPlazo: bloque.autoridadPlazo,
      ajustesPermitidos: bloque.ajustesPermitidos,
    });
    setMensaje(undefined);
    setError(undefined);
  };

  const quitarBloque = (clave: string) => {
    setBloques((actuales) =>
      actuales.filter((bloque) => bloque.clave !== clave),
    );
    if (claveEditada === clave) {
      limpiarEditorBloque();
    }
    setMensaje(undefined);
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje(undefined);
    setError(undefined);

    try {
      const resultado = await guardarBloques.ejecutar({
        agendaId: agenda.id,
        bloques: bloques.map(convertirBloqueEnComando),
      });

      if (resultado.exito) {
        setBloques(convertirBloques(resultado.agenda));
        alGuardar(resultado.agenda);
        setMensaje("Borrador guardado correctamente.");
        return;
      }

      const prefijo =
        resultado.error.indiceBloque === undefined
          ? ""
          : `Bloque ${resultado.error.indiceBloque + 1}: `;
      setError(`${prefijo}${resultado.error.mensaje}`);
    } catch {
      setError(
        "No fue posible guardar el borrador. Los cambios continúan en pantalla.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const limpiarEditorBloque = () => {
    setClaveEditada(undefined);
    setBorradorBloque(BLOQUE_INICIAL);
  };

  return (
    <section className="panel-agenda" aria-labelledby="titulo-editor-agenda">
      <div className="cabecera-panel-agenda">
        <div>
          <p className="sobrelinea">Agenda / editor</p>
          <h2 id="titulo-editor-agenda">{agenda.nombre}</h2>
          <p className="rango-agenda">
            {agenda.fechaInicio} — {agenda.fechaFin}
          </p>
        </div>
        <span className="insignia-estado">Borrador</span>
      </div>

      <div className="resumen-agenda" aria-label="Resumen del borrador">
        <div>
          <strong>{bloques.length}</strong>
          <span>{bloques.length === 1 ? "bloque" : "bloques"}</span>
        </div>
        <div>
          <strong>
            {bloques.reduce(
              (total, bloque) => total + bloque.minutosPlanificados,
              0,
            )}
          </strong>
          <span>minutos planificados</span>
        </div>
      </div>

      <div className="distribucion-editor">
        <div className="lista-bloques">
          <div className="titulo-region">
            <div>
              <p className="sobrelinea">Distribución</p>
              <h3>Bloques de trabajo</h3>
            </div>
          </div>

          {bloques.length === 0 ? (
            <div className="estado-vacio-bloques">
              <p>Aún no hay bloques en esta agenda.</p>
              <span>Utiliza el formulario para agregar el primero.</span>
            </div>
          ) : (
            <ol>
              {bloques.map((bloque) => (
                <li key={bloque.clave} className="tarjeta-bloque">
                  <div>
                    <span className="fecha-bloque">{bloque.fecha}</span>
                    <h4>{bloque.actividad}</h4>
                    <p>
                      {bloque.minutosPlanificados} min ·{" "}
                      {bloque.rigidez.toLowerCase()} ·{" "}
                      {bloque.autoridadPlazo.toLowerCase()}
                    </p>
                  </div>
                  <div className="acciones-bloque">
                    <button
                      type="button"
                      className="boton-texto"
                      onClick={() => editarBloque(bloque)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="boton-texto boton-peligro"
                      onClick={() => quitarBloque(bloque.clave)}
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <form className="formulario-bloque" onSubmit={agregarOEditarBloque}>
          <div className="titulo-region">
            <div>
              <p className="sobrelinea">
                {claveEditada ? "Modificar" : "Nuevo bloque"}
              </p>
              <h3>{claveEditada ? "Editar actividad" : "Agregar actividad"}</h3>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="actividad-bloque">Actividad</label>
            <input
              id="actividad-bloque"
              value={borradorBloque.actividad}
              onChange={(evento) =>
                setBorradorBloque((actual) => ({
                  ...actual,
                  actividad: evento.target.value,
                }))
              }
              required
            />
          </div>

          <div className="campos-en-linea">
            <div className="campo">
              <label htmlFor="fecha-bloque">Fecha</label>
              <input
                id="fecha-bloque"
                type="date"
                min={agenda.fechaInicio}
                max={agenda.fechaFin}
                value={borradorBloque.fecha}
                onChange={(evento) =>
                  setBorradorBloque((actual) => ({
                    ...actual,
                    fecha: evento.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="minutos-bloque">Minutos</label>
              <input
                id="minutos-bloque"
                type="number"
                min="1"
                step="1"
                value={borradorBloque.minutosPlanificados}
                onChange={(evento) =>
                  setBorradorBloque((actual) => ({
                    ...actual,
                    minutosPlanificados: Number(evento.target.value),
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="campos-en-linea">
            <div className="campo">
              <label htmlFor="rigidez-bloque">Rigidez</label>
              <select
                id="rigidez-bloque"
                value={borradorBloque.rigidez}
                onChange={(evento) => {
                  const rigidez = evento.target.value as
                    "ESTRICTO" | "FLEXIBLE";
                  setBorradorBloque((actual) => ({
                    ...actual,
                    rigidez,
                    ajustesPermitidos:
                      rigidez === "ESTRICTO" ? [] : ["EXCUSAR"],
                  }));
                }}
              >
                <option value="FLEXIBLE">Flexible</option>
                <option value="ESTRICTO">Estricto</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="autoridad-bloque">Autoridad del plazo</label>
              <select
                id="autoridad-bloque"
                value={borradorBloque.autoridadPlazo}
                onChange={(evento) =>
                  setBorradorBloque((actual) => ({
                    ...actual,
                    autoridadPlazo: evento.target.value as
                      "PERSONAL" | "EXTERNA",
                  }))
                }
              >
                <option value="PERSONAL">Personal</option>
                <option value="EXTERNA">Externa</option>
              </select>
            </div>
          </div>

          <label className="campo-verificacion">
            <input
              type="checkbox"
              checked={borradorBloque.ajustesPermitidos.includes("EXCUSAR")}
              disabled={borradorBloque.rigidez === "ESTRICTO"}
              onChange={(evento) =>
                setBorradorBloque((actual) => ({
                  ...actual,
                  ajustesPermitidos: evento.target.checked ? ["EXCUSAR"] : [],
                }))
              }
            />
            Permitir que una recompensa excuse este bloque
          </label>

          <div className="acciones-formulario">
            {claveEditada && (
              <button
                className="boton-secundario"
                type="button"
                onClick={limpiarEditorBloque}
              >
                Cancelar edición
              </button>
            )}
            <button className="boton-secundario" type="submit">
              {claveEditada ? "Guardar cambios" : "Agregar bloque"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <p
          ref={errorRef}
          className="mensaje-error mensaje-formulario"
          role="alert"
          tabIndex={-1}
        >
          {error}
        </p>
      )}
      {mensaje && (
        <p className="mensaje-exito" role="status">
          {mensaje}
        </p>
      )}

      <div className="barra-acciones-agenda">
        <p>Los cambios locales se conservan si ocurre un error al guardar.</p>
        <button
          className="boton-primario"
          type="button"
          disabled={guardando}
          onClick={() => void guardar()}
        >
          {guardando ? "Guardando…" : "Guardar borrador"}
        </button>
      </div>
    </section>
  );
}

function convertirBloques(agenda: AgendaBorradorDto): BloqueEnEdicion[] {
  return agenda.bloques.map((bloque) => ({
    clave: bloque.id,
    id: bloque.id,
    actividadId: bloque.actividadId,
    actividad: bloque.actividad,
    fecha: bloque.fecha,
    minutosPlanificados: bloque.minutosPlanificados,
    rigidez: bloque.politica.rigidez,
    autoridadPlazo: bloque.politica.autoridadPlazo,
    ajustesPermitidos: bloque.politica.ajustesPermitidos,
  }));
}

function convertirBloqueEnComando(
  bloque: BloqueEnEdicion,
): BloqueEditableAgendaBorrador {
  return {
    ...(bloque.id ? { id: bloque.id } : {}),
    ...(bloque.actividadId ? { actividadId: bloque.actividadId } : {}),
    actividad: bloque.actividad,
    fecha: bloque.fecha,
    minutosPlanificados: bloque.minutosPlanificados,
    rigidez: bloque.rigidez,
    autoridadPlazo: bloque.autoridadPlazo,
    ajustesPermitidos: bloque.ajustesPermitidos,
  };
}
