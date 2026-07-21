import { useEffect, useState } from "react";
import type {
  ActividadDto,
  CalendarioDto,
  ContextoPlanificacionDto,
} from "../../aplicacion";
import { PantallaAgendaBorrador } from "../agendas/PantallaAgendaBorrador";
import type { ServiciosAgendaBorrador } from "../agendas/ServiciosAgendaBorrador";
import { FormularioActividadCalendario } from "../calendario/FormularioActividadCalendario";
import { FormularioContextoNombrado } from "../calendario/FormularioContextoNombrado";
import type { ServiciosCalendario } from "../calendario/ServiciosCalendario";
import { EncabezadoPagina } from "./EncabezadoPagina";

interface PaginaCrearProps {
  readonly serviciosCalendario?: ServiciosCalendario;
  readonly serviciosAgenda?: ServiciosAgendaBorrador;
}

type FormularioVisible = "AGENDA" | "ACTIVIDAD" | undefined;

export function PaginaCrear({
  serviciosCalendario,
  serviciosAgenda,
}: PaginaCrearProps) {
  const [formulario, setFormulario] = useState<FormularioVisible>();
  const [catalogo, setCatalogo] = useState<CalendarioDto>();
  const [error, setError] = useState<string>();
  const [mensaje, setMensaje] = useState<string>();
  const [revision, setRevision] = useState(0);

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
    setFormulario(undefined);
    setMensaje(`La agenda ${contexto.nombre} quedó disponible.`);
    setRevision((actual) => actual + 1);
  };

  const registrarActividad = (actividad: ActividadDto) => {
    setFormulario(undefined);
    setMensaje(`${actividad.titulo} quedó disponible para planificar.`);
    setRevision((actual) => actual + 1);
  };

  return (
    <div className="pagina-aplicacion pagina-crear">
      <EncabezadoPagina
        sobrelinea="Elementos reutilizables"
        titulo="Crear"
        descripcion="Define agendas y actividades sin asignarlas por accidente. La fecha y la política se deciden posteriormente mediante un bloque."
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
              aria-expanded={formulario === "AGENDA"}
              onClick={() => setFormulario("AGENDA")}
            >
              Crear agenda
            </button>
            <button
              className="boton-secundario"
              type="button"
              aria-expanded={formulario === "ACTIVIDAD"}
              onClick={() => setFormulario("ACTIVIDAD")}
            >
              Crear actividad
            </button>
          </section>

          {formulario === "AGENDA" && (
            <FormularioContextoNombrado
              crearContexto={serviciosCalendario.crearContexto}
              onCancelar={() => setFormulario(undefined)}
              onCreado={registrarContexto}
            />
          )}
          {formulario === "ACTIVIDAD" && (
            <FormularioActividadCalendario
              crearActividad={serviciosCalendario.crearActividad}
              onCancelar={() => setFormulario(undefined)}
              onCreada={(actividad) => registrarActividad(actividad)}
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
            <CatalogoAgendas contextos={catalogo?.contextos ?? []} />
            <CatalogoActividades
              actividades={catalogo?.actividadesAsignables ?? []}
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
    </div>
  );
}

function CatalogoAgendas({
  contextos,
}: {
  readonly contextos: readonly ContextoPlanificacionDto[];
}) {
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
        <ul>
          {agendas.map((agenda) => (
            <li key={agenda.id}>
              <strong>{agenda.nombre}</strong>
              {agenda.proposito && <span>{agenda.proposito}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CatalogoActividades({
  actividades,
}: {
  readonly actividades: readonly ActividadDto[];
}) {
  return (
    <section className="panel-contexto" aria-labelledby="catalogo-actividades">
      <p className="sobrelinea">Catálogo</p>
      <h2 id="catalogo-actividades">Actividades existentes</h2>
      {actividades.length === 0 ? (
        <p className="estado-vacio-lineal">Todavía no existen actividades.</p>
      ) : (
        <ul>
          {actividades.map((actividad) => (
            <li key={actividad.id}>
              <strong>{actividad.titulo}</strong>
              <span>{actividad.tipo.replaceAll("_", " ")}</span>
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
