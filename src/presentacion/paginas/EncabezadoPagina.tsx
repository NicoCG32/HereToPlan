import "./EncabezadoPagina.css";

interface EncabezadoPaginaProps {
  readonly sobrelinea: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly ilustracion?: string;
}

export function EncabezadoPagina({
  sobrelinea,
  titulo,
  descripcion,
  ilustracion,
}: EncabezadoPaginaProps) {
  return (
    <header
      className={`encabezado-pagina${ilustracion ? " encabezado-pagina-ilustrado" : ""}`}
    >
      <div className="contenido-encabezado-pagina">
        <p className="sobrelinea">{sobrelinea}</p>
        <h1>{titulo}</h1>
        <p>{descripcion}</p>
      </div>
      {ilustracion && (
        <img
          className="ilustracion-encabezado-pagina"
          src={ilustracion}
          width="1400"
          height="800"
          alt=""
          aria-hidden="true"
          decoding="async"
        />
      )}
    </header>
  );
}
