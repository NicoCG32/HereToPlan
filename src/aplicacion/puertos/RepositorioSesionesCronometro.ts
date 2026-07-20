import type { Identificador, SesionCronometro } from "../../dominio";

export class ErrorConflictoPersistenciaSesionCronometro extends Error {
  constructor(public readonly causa?: unknown) {
    super("La sesión cambió o entra en conflicto con otra sesión abierta.");
    this.name = "ErrorConflictoPersistenciaSesionCronometro";
  }
}

export interface RepositorioSesionesCronometro {
  guardar(sesion: SesionCronometro, revisionEsperada: number): Promise<void>;
  obtenerPorId(id: Identificador): Promise<SesionCronometro | undefined>;
  obtenerPorOperacionId(
    operacionId: Identificador,
  ): Promise<SesionCronometro | undefined>;
  obtenerAbierta(): Promise<SesionCronometro | undefined>;
  listarPorBloque(
    bloqueId: Identificador,
  ): Promise<readonly SesionCronometro[]>;
}
