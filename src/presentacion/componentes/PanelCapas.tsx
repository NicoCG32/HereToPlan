export interface CapaDemostracion {
  nombre: string;
  mensaje: string;
}

interface PropiedadesPanelCapas {
  capas: readonly CapaDemostracion[];
}

export function PanelCapas({ capas }: PropiedadesPanelCapas) {
  return (
    <section className="rejilla-capas" aria-label="Capas de la aplicación">
      {capas.map((capa) => (
        <article className="tarjeta-capa" key={capa.nombre}>
          <h2>{capa.nombre}</h2>
          <p>{capa.mensaje}</p>
        </article>
      ))}
    </section>
  );
}