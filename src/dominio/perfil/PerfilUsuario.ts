import { ErrorDominio } from "../compartido/ErrorDominio";
import type { Identificador } from "../compartido/tipos";
import {
  copiarFecha,
  exigirIdentificador,
  exigirTexto,
} from "../compartido/validaciones";

export interface DatosPerfilUsuario {
  readonly id: Identificador;
  readonly nombreVisible: string;
  readonly creadoEn: Date;
  readonly actualizadoEn: Date;
}

export class PerfilUsuario {
  public readonly id: Identificador;
  public readonly nombreVisible: string;
  private readonly _creadoEn: Date;
  private readonly _actualizadoEn: Date;

  private constructor(datos: DatosPerfilUsuario) {
    this.id = exigirIdentificador(datos.id, "identificador de perfil");
    this.nombreVisible = normalizarNombreVisible(datos.nombreVisible);
    this._creadoEn = copiarFecha(
      datos.creadoEn,
      "fecha de creación del perfil",
    );
    this._actualizadoEn = copiarFecha(
      datos.actualizadoEn,
      "fecha de actualización del perfil",
    );
    if (this._actualizadoEn < this._creadoEn) {
      throw new ErrorDominio(
        "CRONOLOGIA_PERFIL_INVALIDA",
        "La actualización del perfil no puede ser anterior a su creación.",
      );
    }
  }

  public static crear(
    datos: Omit<DatosPerfilUsuario, "actualizadoEn">,
  ): PerfilUsuario {
    return new PerfilUsuario({ ...datos, actualizadoEn: datos.creadoEn });
  }

  public static rehidratar(datos: DatosPerfilUsuario): PerfilUsuario {
    return new PerfilUsuario(datos);
  }

  public actualizarNombre(
    nombreVisible: string,
    actualizadoEn: Date,
  ): PerfilUsuario {
    return new PerfilUsuario({
      id: this.id,
      nombreVisible,
      creadoEn: this._creadoEn,
      actualizadoEn,
    });
  }

  public get creadoEn(): Date {
    return new Date(this._creadoEn);
  }

  public get actualizadoEn(): Date {
    return new Date(this._actualizadoEn);
  }
}

function normalizarNombreVisible(nombre: string): string {
  const normalizado = exigirTexto(
    nombre,
    "NOMBRE_PERFIL_VACIO",
    "El perfil debe tener un nombre visible.",
  );
  if (Array.from(normalizado).length > 60) {
    throw new ErrorDominio(
      "NOMBRE_PERFIL_DEMASIADO_LARGO",
      "El nombre visible no puede superar 60 caracteres.",
    );
  }
  return normalizado;
}
