import type { TransaccionPuntos } from "../../../dominio";
import type { TransaccionPuntosV1 } from "../registros/TransaccionPuntosV1";

export function convertirTransaccionPuntosEnV1(
  transaccion: TransaccionPuntos,
): TransaccionPuntosV1 {
  return Object.freeze({
    versionEsquema: 1,
    id: transaccion.id,
    tipo: transaccion.tipo,
    cantidad: transaccion.cantidad,
    fuenteTipo: transaccion.fuenteTipo,
    fuenteId: transaccion.fuenteId,
    descripcion: transaccion.descripcion,
    ocurridaEn: transaccion.ocurridaEn.toISOString(),
  });
}
