import type { CalendarioDto } from "../../aplicacion";

export type EstadoPersistenciaCalendario =
  "sin_cambios" | "guardando" | "guardado";

export type EstadoPantallaCalendario =
  | Readonly<{ tipo: "cargando" }>
  | Readonly<{
      tipo: "vacio";
      calendario: CalendarioDto;
      persistencia: EstadoPersistenciaCalendario;
    }>
  | Readonly<{
      tipo: "lista";
      calendario: CalendarioDto;
      persistencia: EstadoPersistenciaCalendario;
    }>
  | Readonly<{
      tipo: "error";
      mensaje: string;
      reintentable: boolean;
      persistencia: "error";
    }>;
