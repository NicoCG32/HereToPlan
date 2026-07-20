import type {
  EstadoSesionCronometro,
  TipoOperacionSesionCronometro,
} from "../../../dominio";

export interface OperacionSesionCronometroV1 {
  readonly id: string;
  readonly tipo: TipoOperacionSesionCronometro;
  readonly ocurridaEn: string;
}

export interface SesionCronometroV1 {
  readonly versionEsquema: 1;
  readonly id: string;
  readonly bloqueId: string;
  readonly estado: EstadoSesionCronometro;
  readonly revision: number;
  readonly operaciones: readonly OperacionSesionCronometroV1[];
  readonly operacionesIds: readonly string[];
  readonly claveAbierta?: "ABIERTA";
}
