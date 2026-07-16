import type { AgendaBorradorDto } from "../../aplicacion";

export type EstadoPantallaAgendaBorrador =
  | Readonly<{ tipo: "cargando" }>
  | Readonly<{ tipo: "vacio" }>
  | Readonly<{ tipo: "lista"; agenda: AgendaBorradorDto }>
  | Readonly<{ tipo: "error"; mensaje: string }>;
