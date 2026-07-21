import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  AgendaBorradorCreada,
  CampoCrearAgendaBorrador,
  CrearAgendaBorrador,
} from "../../aplicacion";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

interface FormularioCrearAgendaProps {
  readonly crearAgenda: CrearAgendaBorrador;
  readonly alCrear: (agenda: AgendaBorradorCreada) => void;
}

type ErroresCamposAgenda = Partial<Record<CampoCrearAgendaBorrador, string>>;

export function FormularioCrearAgenda({
  crearAgenda,
  alCrear,
}: FormularioCrearAgendaProps) {
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [errores, setErrores] = useState<ErroresCamposAgenda>({});
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const formularioRef = useRef<HTMLFormElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const claveError = `${JSON.stringify(errores)}|${errorGeneral ?? ""}`;

  useEffect(() => nombreRef.current?.focus(), []);
  useEnfoqueError(formularioRef, claveError);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setGuardando(true);
    setErrores({});
    setErrorGeneral(undefined);

    try {
      const resultado = await crearAgenda.ejecutar({
        nombre,
        fechaInicio,
        fechaFin,
      });

      if (resultado.exito) {
        alCrear(resultado.agenda);
        return;
      }

      if (resultado.error.campo) {
        setErrores({ [resultado.error.campo]: resultado.error.mensaje });
      } else {
        setErrorGeneral(resultado.error.mensaje);
      }
    } catch {
      setErrorGeneral(
        "No fue posible guardar la agenda. Tus datos permanecen en el formulario.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => {
    setNombre("");
    setFechaInicio("");
    setFechaFin("");
    setErrores({});
    setErrorGeneral(undefined);
  };

  return (
    <section className="panel-agenda" aria-labelledby="titulo-nueva-agenda">
      <div className="cabecera-panel-agenda">
        <div>
          <p className="sobrelinea">Agenda / nuevo borrador</p>
          <h2 id="titulo-nueva-agenda">Planifica tu próximo horizonte</h2>
        </div>
        <span className="insignia-estado">Borrador</span>
      </div>

      <p className="descripcion-panel">
        Define el período que quieres organizar. Después podrás distribuir sus
        actividades en bloques de trabajo.
      </p>

      <form
        ref={formularioRef}
        className="formulario-agenda"
        onSubmit={(evento) => void enviar(evento)}
        aria-busy={guardando}
        noValidate
      >
        <div className="campo campo-ancho">
          <label htmlFor="nombre-agenda">Nombre de la agenda</label>
          <input
            ref={nombreRef}
            id="nombre-agenda"
            name="nombre"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            aria-describedby={
              errores.nombre ? "error-nombre-agenda" : undefined
            }
            aria-invalid={errores.nombre ? "true" : undefined}
            autoComplete="off"
          />
          {errores.nombre && (
            <span id="error-nombre-agenda" className="mensaje-error">
              {errores.nombre}
            </span>
          )}
        </div>

        <div className="campo">
          <label htmlFor="fecha-inicio-agenda">Fecha inicial</label>
          <input
            id="fecha-inicio-agenda"
            name="fechaInicio"
            type="date"
            value={fechaInicio}
            onChange={(evento) => setFechaInicio(evento.target.value)}
            aria-describedby={
              errores.fechaInicio ? "error-fecha-inicio" : undefined
            }
            aria-invalid={errores.fechaInicio ? "true" : undefined}
          />
          {errores.fechaInicio && (
            <span id="error-fecha-inicio" className="mensaje-error">
              {errores.fechaInicio}
            </span>
          )}
        </div>

        <div className="campo">
          <label htmlFor="fecha-fin-agenda">Fecha final</label>
          <input
            id="fecha-fin-agenda"
            name="fechaFin"
            type="date"
            value={fechaFin}
            onChange={(evento) => setFechaFin(evento.target.value)}
            aria-describedby={errores.fechaFin ? "error-fecha-fin" : undefined}
            aria-invalid={errores.fechaFin ? "true" : undefined}
          />
          {errores.fechaFin && (
            <span id="error-fecha-fin" className="mensaje-error">
              {errores.fechaFin}
            </span>
          )}
        </div>

        {errorGeneral && (
          <p
            className="mensaje-error mensaje-formulario"
            role="alert"
            tabIndex={-1}
          >
            {errorGeneral}
          </p>
        )}

        <div className="acciones-formulario campo-ancho">
          <button className="boton-secundario" type="button" onClick={cancelar}>
            Cancelar
          </button>
          <button className="boton-primario" type="submit" disabled={guardando}>
            {guardando ? "Creando…" : "Crear borrador"}
          </button>
        </div>
      </form>
    </section>
  );
}
