import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ContextoPlanificacionDto,
  ResultadoEditarContextoPlanificacion,
  ResultadoCrearContextoNombrado,
} from "../../aplicacion";
import type { ServiciosCalendario } from "./ServiciosCalendario";
import { useEnfoqueError } from "../hooks/useEnfoqueError";

type CampoFormulario = "nombre" | "proposito" | "fechaInicio" | "fechaFin";

interface FormularioContextoNombradoProps {
  readonly crearContexto: ServiciosCalendario["crearContexto"];
  readonly editarContexto?: NonNullable<ServiciosCalendario["editarContexto"]>;
  readonly contexto?: ContextoPlanificacionDto;
  readonly onCancelar: () => void;
  readonly onCreado: (contexto: ContextoPlanificacionDto) => void;
}

export function FormularioContextoNombrado({
  crearContexto,
  editarContexto,
  contexto,
  onCancelar,
  onCreado,
}: FormularioContextoNombradoProps) {
  const nombreRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState(contexto?.nombre ?? "");
  const [proposito, setProposito] = useState(contexto?.proposito ?? "");
  const [usarRango, setUsarRango] = useState(
    Boolean(contexto?.fechaInicio && contexto.fechaFin),
  );
  const [fechaInicio, setFechaInicio] = useState(contexto?.fechaInicio ?? "");
  const [fechaFin, setFechaFin] = useState(contexto?.fechaFin ?? "");
  const [errores, setErrores] = useState<
    Partial<Record<CampoFormulario, string>>
  >({});
  const [mensajeGeneral, setMensajeGeneral] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const formularioRef = useRef<HTMLFormElement>(null);
  const claveError = `${JSON.stringify(errores)}|${mensajeGeneral ?? ""}`;

  useEffect(() => {
    nombreRef.current?.focus();
  }, []);
  useEnfoqueError(formularioRef, claveError);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const erroresLocales: Partial<Record<CampoFormulario, string>> = {};
    if (proposito.trim().length > 240) {
      erroresLocales.proposito =
        "El propósito del contexto no puede superar 240 caracteres.";
    }
    if (usarRango && !fechaInicio) {
      erroresLocales.fechaInicio = "Indica la fecha inicial del período.";
    }
    if (usarRango && !fechaFin) {
      erroresLocales.fechaFin = "Indica la fecha final del período.";
    }
    if (Object.keys(erroresLocales).length > 0) {
      setErrores(erroresLocales);
      return;
    }

    setGuardando(true);
    setErrores({});
    setMensajeGeneral(undefined);
    try {
      const datos = {
        nombre,
        ...(proposito ? { proposito } : {}),
        ...(usarRango ? { fechaInicio, fechaFin } : {}),
      };
      const resultado = contexto
        ? await editarContexto!.ejecutar({
            contextoId: contexto.id,
            ...datos,
          })
        : await crearContexto.ejecutar(datos);
      procesarResultado(resultado);
    } catch (error: unknown) {
      setMensajeGeneral(
        error instanceof Error
          ? error.message
          : "No fue posible crear la agenda nombrada.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const procesarResultado = (
    resultado:
      ResultadoCrearContextoNombrado | ResultadoEditarContextoPlanificacion,
  ) => {
    if (resultado.exito) {
      onCreado(resultado.contexto);
      return;
    }
    if (resultado.error.campo) {
      setErrores({ [resultado.error.campo]: resultado.error.mensaje });
      return;
    }
    setMensajeGeneral(resultado.error.mensaje);
  };

  return (
    <section className="panel-contexto" aria-labelledby="titulo-nueva-agenda">
      <div className="titulo-region">
        <div>
          <p className="sobrelinea">Contexto opcional</p>
          <h3 id="titulo-nueva-agenda">
            {contexto ? "Editar agenda nombrada" : "Nueva agenda nombrada"}
          </h3>
        </div>
      </div>
      <p className="descripcion-panel-contexto">
        Úsala para delimitar un semestre, un proyecto o cualquier período que
        quieras consultar por separado. El calendario general y Libre seguirán
        disponibles.
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
            Guardando la agenda; los controles están temporalmente
            indisponibles.
          </p>
        )}
        <div className="campo campo-ancho">
          <label htmlFor="nombre-contexto">Nombre</label>
          <input
            ref={nombreRef}
            id="nombre-contexto"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            aria-invalid={Boolean(errores.nombre)}
            aria-describedby={
              errores.nombre ? "error-nombre-contexto" : undefined
            }
            disabled={guardando}
          />
          {errores.nombre && (
            <p id="error-nombre-contexto" className="mensaje-error">
              {errores.nombre}
            </p>
          )}
        </div>

        <div className="campo campo-ancho">
          <label htmlFor="proposito-contexto">Propósito (opcional)</label>
          <textarea
            id="proposito-contexto"
            value={proposito}
            onChange={(evento) => setProposito(evento.target.value)}
            aria-invalid={Boolean(errores.proposito)}
            aria-describedby={
              errores.proposito ? "error-proposito-contexto" : undefined
            }
            disabled={guardando}
          />
          <span className="ayuda-campo">Máximo 240 caracteres.</span>
          {errores.proposito && (
            <p id="error-proposito-contexto" className="mensaje-error">
              {errores.proposito}
            </p>
          )}
        </div>

        <label className="campo-verificacion campo-ancho">
          <input
            type="checkbox"
            checked={usarRango}
            onChange={(evento) => setUsarRango(evento.target.checked)}
            disabled={guardando}
          />
          Definir un rango personalizado
        </label>

        {usarRango && (
          <>
            <div className="campo">
              <label htmlFor="fecha-inicio-contexto">Fecha inicial</label>
              <input
                id="fecha-inicio-contexto"
                type="date"
                value={fechaInicio}
                onChange={(evento) => setFechaInicio(evento.target.value)}
                aria-invalid={Boolean(errores.fechaInicio)}
                aria-describedby={
                  errores.fechaInicio ? "error-inicio-contexto" : undefined
                }
                disabled={guardando}
              />
              {errores.fechaInicio && (
                <p id="error-inicio-contexto" className="mensaje-error">
                  {errores.fechaInicio}
                </p>
              )}
            </div>
            <div className="campo">
              <label htmlFor="fecha-fin-contexto">Fecha final</label>
              <input
                id="fecha-fin-contexto"
                type="date"
                value={fechaFin}
                onChange={(evento) => setFechaFin(evento.target.value)}
                aria-invalid={Boolean(errores.fechaFin)}
                aria-describedby={
                  errores.fechaFin ? "error-fin-contexto" : undefined
                }
                disabled={guardando}
              />
              {errores.fechaFin && (
                <p id="error-fin-contexto" className="mensaje-error">
                  {errores.fechaFin}
                </p>
              )}
            </div>
          </>
        )}

        {mensajeGeneral && (
          <p
            className="mensaje-error mensaje-formulario"
            role="alert"
            tabIndex={-1}
          >
            {mensajeGeneral}
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
          <button className="boton-primario" type="submit" disabled={guardando}>
            {guardando
              ? "Guardando…"
              : contexto
                ? "Guardar cambios"
                : "Crear agenda"}
          </button>
        </div>
      </form>
    </section>
  );
}
