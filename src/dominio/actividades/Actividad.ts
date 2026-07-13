import type { Identificador } from "../compartido/tipos";
import { exigirIdentificador, exigirTexto } from "../compartido/validaciones";
import type { TipoActividad } from "./tipos";

interface DatosActividad {
  id: Identificador;
  titulo: string;
  tipo: TipoActividad;
  descripcion?: string;
}

export class Actividad {
  public readonly id: Identificador;
  public readonly titulo: string;
  public readonly tipo: TipoActividad;
  public readonly descripcion: string | undefined;

  constructor(datos: DatosActividad) {
    this.id = exigirIdentificador(datos.id, "identificador de actividad");
    this.titulo = exigirTexto(
      datos.titulo,
      "TITULO_ACTIVIDAD_VACIO",
      "La actividad debe tener un título.",
    );
    this.tipo = datos.tipo;
    this.descripcion = datos.descripcion?.trim() || undefined;
  }
}
