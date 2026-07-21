import { createContext, useContext } from "react";
import type { PerfilUsuarioDto } from "../../aplicacion";

export type EstadoCargaSesion = "CARGANDO" | "LISTA" | "ERROR";

export interface SesionAplicacion {
  readonly perfil?: PerfilUsuarioDto;
  readonly saldoPuntos: number;
  readonly carga: EstadoCargaSesion;
  readonly error?: string;
  readonly revisionDatos: number;
  readonly frase: string;
  readonly identidadDisponible: boolean;
  readonly abrirEdicionPerfil: (origen: HTMLElement) => void;
  readonly refrescarPerfil: () => Promise<void>;
  readonly refrescarProyecciones: () => Promise<void>;
  readonly notificarDatosCambiados: () => void;
}

export const ContextoSesion = createContext<SesionAplicacion | undefined>(
  undefined,
);

export function useSesionAplicacion(): SesionAplicacion | undefined {
  return useContext(ContextoSesion);
}
