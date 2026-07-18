import {
  PoliticaCompromiso,
  type VistaPoliticaCompromiso,
} from "../../../dominio";
import type { PoliticaCompromisoV1 } from "../registros/AgendaV1";

export function convertirPoliticaEnV1(
  politica: VistaPoliticaCompromiso,
): PoliticaCompromisoV1 {
  return Object.freeze({
    versionEsquema: 1,
    rigidez: politica.rigidez,
    autoridadPlazo: politica.autoridadPlazo,
    ajustesPermitidos: Object.freeze([...politica.ajustesPermitidos]),
  });
}

export function rehidratarPoliticaDesdeV1(
  registro: PoliticaCompromisoV1,
): PoliticaCompromiso {
  const version = (registro as { readonly versionEsquema?: unknown })
    .versionEsquema;
  if (version !== undefined && Number(version) !== 1) {
    const versionLegible =
      typeof version === "string" || typeof version === "number"
        ? String(version)
        : "desconocida";
    throw new Error(
      `La versión ${versionLegible} de la política no está soportada.`,
    );
  }
  return new PoliticaCompromiso({
    rigidez: registro.rigidez,
    autoridadPlazo: registro.autoridadPlazo,
    ajustesPermitidos: registro.ajustesPermitidos,
  });
}
