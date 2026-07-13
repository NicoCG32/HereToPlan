import type { Identificador } from "../compartido/tipos";
import {
  exigirEnteroPositivo,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";
import type { TipoEfectoRecompensa } from "./tipos";

interface DatosDefinicionRecompensa {
  id: Identificador;
  nombre: string;
  descripcion: string;
  costoPuntos: number;
  tipoEfecto: TipoEfectoRecompensa;
}

export class DefinicionRecompensa {
  public readonly id: Identificador;
  public readonly nombre: string;
  public readonly descripcion: string;
  public readonly costoPuntos: number;
  public readonly tipoEfecto: TipoEfectoRecompensa;

  constructor(datos: DatosDefinicionRecompensa) {
    this.id = exigirIdentificador(datos.id, "identificador de recompensa");
    this.nombre = exigirTexto(
      datos.nombre,
      "NOMBRE_RECOMPENSA_VACIO",
      "La recompensa debe tener un nombre.",
    );
    this.descripcion = exigirTexto(
      datos.descripcion,
      "DESCRIPCION_RECOMPENSA_VACIA",
      "La recompensa debe tener una descripción.",
    );
    this.costoPuntos = exigirEnteroPositivo(
      datos.costoPuntos,
      "COSTO_RECOMPENSA_INVALIDO",
      "El costo de la recompensa debe ser un entero positivo.",
    );
    this.tipoEfecto = datos.tipoEfecto;
  }
}
