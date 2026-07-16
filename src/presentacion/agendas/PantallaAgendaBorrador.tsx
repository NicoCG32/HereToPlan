import { useCallback, useEffect, useState } from "react";
import type { AgendaBorradorDto } from "../../aplicacion";
import { EditorAgendaBorrador } from "./EditorAgendaBorrador";
import type { EstadoPantallaAgendaBorrador } from "./EstadoPantallaAgendaBorrador";
import { FormularioCrearAgenda } from "./FormularioCrearAgenda";
import type { ServiciosAgendaBorrador } from "./ServiciosAgendaBorrador";

interface PantallaAgendaBorradorProps {
  readonly servicios: ServiciosAgendaBorrador;
}

export function PantallaAgendaBorrador({
  servicios,
}: PantallaAgendaBorradorProps) {
  const [estado, setEstado] = useState<EstadoPantallaAgendaBorrador>({
    tipo: "cargando",
  });

  const cargar = useCallback(async () => {
    try {
      const agendas = await servicios.listarAgendas.ejecutar();
      const agenda = agendas.at(-1);
      setEstado(agenda ? { tipo: "lista", agenda } : { tipo: "vacio" });
    } catch {
      setEstado({
        tipo: "error",
        mensaje:
          "No fue posible cargar tus agendas. Puedes volver a intentarlo sin perder datos.",
      });
    }
  }, [servicios]);

  useEffect(() => {
    let activa = true;

    void servicios.listarAgendas
      .ejecutar()
      .then((agendas) => {
        if (!activa) return;
        const agenda = agendas.at(-1);
        setEstado(agenda ? { tipo: "lista", agenda } : { tipo: "vacio" });
      })
      .catch(() => {
        if (!activa) return;
        setEstado({
          tipo: "error",
          mensaje:
            "No fue posible cargar tus agendas. Puedes volver a intentarlo sin perder datos.",
        });
      });

    return () => {
      activa = false;
    };
  }, [servicios]);

  const mostrarAgendaCreada = (agendaCreada: {
    id: string;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
    estado: "BORRADOR";
    creadaEn: string;
  }) => {
    const agenda: AgendaBorradorDto = Object.freeze({
      ...agendaCreada,
      bloques: Object.freeze([]),
      minutosPlanificados: 0,
    });
    setEstado({ tipo: "lista", agenda });
  };

  if (estado.tipo === "cargando") {
    return (
      <section className="panel-agenda estado-carga" aria-live="polite">
        <p>Cargando agenda…</p>
      </section>
    );
  }

  if (estado.tipo === "error") {
    return (
      <section className="panel-agenda estado-error" role="alert">
        <h2>No pudimos abrir la agenda</h2>
        <p>{estado.mensaje}</p>
        <button
          className="boton-secundario"
          type="button"
          onClick={() => {
            setEstado({ tipo: "cargando" });
            void cargar();
          }}
        >
          Reintentar
        </button>
      </section>
    );
  }

  if (estado.tipo === "vacio") {
    return (
      <FormularioCrearAgenda
        crearAgenda={servicios.crearAgenda}
        alCrear={mostrarAgendaCreada}
      />
    );
  }

  return (
    <EditorAgendaBorrador
      agenda={estado.agenda}
      guardarBloques={servicios.guardarBloques}
      alGuardar={(agenda) => setEstado({ tipo: "lista", agenda })}
    />
  );
}
