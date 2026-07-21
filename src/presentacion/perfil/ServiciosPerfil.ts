import type {
  CasoDeUsoActualizarPerfilUsuario,
  CasoDeUsoConsultarPerfilUsuario,
  CasoDeUsoCrearPerfilUsuario,
} from "../../aplicacion";

export interface ServiciosPerfil {
  readonly consultar: CasoDeUsoConsultarPerfilUsuario;
  readonly crear: CasoDeUsoCrearPerfilUsuario;
  readonly actualizar: CasoDeUsoActualizarPerfilUsuario;
}
