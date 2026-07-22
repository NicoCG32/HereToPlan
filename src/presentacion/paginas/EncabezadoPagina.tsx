import "./EncabezadoPagina.css";

interface EncabezadoPaginaProps {
  readonly sobrelinea: string;
  readonly titulo: string;
  readonly descripcion: string;
}

export function EncabezadoPagina({
  sobrelinea,
  titulo,
  descripcion,
}: EncabezadoPaginaProps) {
  return (
    <header className="encabezado-pagina">
      <p className="sobrelinea">{sobrelinea}</p>
      <h1>{titulo}</h1>
      <p>{descripcion}</p>
    </header>
  );
}
