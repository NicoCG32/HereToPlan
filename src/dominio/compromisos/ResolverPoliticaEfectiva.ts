import { ErrorDominio } from "../compartido/ErrorDominio";
import { PoliticaCompromiso } from "./PoliticaCompromiso";

export interface CandidatasPoliticaEfectiva {
  readonly explicita?: PoliticaCompromiso;
  readonly actividad?: PoliticaCompromiso;
  readonly agenda?: PoliticaCompromiso;
}

export function resolverPoliticaEfectiva(
  candidatas: CandidatasPoliticaEfectiva,
): PoliticaCompromiso {
  const seleccionada =
    candidatas.explicita ?? candidatas.actividad ?? candidatas.agenda;
  if (!seleccionada) {
    throw new ErrorDominio(
      "POLITICA_EFECTIVA_AUSENTE",
      "Un bloque debe resolver una política efectiva antes de crearse.",
    );
  }
  const vista = seleccionada.obtenerVista();
  return new PoliticaCompromiso({
    rigidez: vista.rigidez,
    autoridadPlazo: vista.autoridadPlazo,
    ajustesPermitidos: vista.ajustesPermitidos,
  });
}
