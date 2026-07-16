import type {
  CrearAgendaBorrador,
  GuardarBloquesAgendaBorrador,
  ListarAgendasBorrador,
} from "../../aplicacion";

export interface ServiciosAgendaBorrador {
  readonly crearAgenda: CrearAgendaBorrador;
  readonly guardarBloques: GuardarBloquesAgendaBorrador;
  readonly listarAgendas: ListarAgendasBorrador;
}
