import type { ArchivoRespaldo } from "../../aplicacion";

const TAMANO_MAXIMO_RESPALDO_BYTES = 25 * 1024 * 1024;

export function descargarArchivoRespaldo(archivo: ArchivoRespaldo): void {
  const blob = new Blob([archivo.contenido], { type: archivo.tipoMime });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.nombre;
  enlace.hidden = true;
  document.body.append(enlace);
  try {
    enlace.click();
  } finally {
    enlace.remove();
    URL.revokeObjectURL(url);
  }
}

export async function leerArchivoRespaldo(archivo: File): Promise<string> {
  if (archivo.size > TAMANO_MAXIMO_RESPALDO_BYTES) {
    throw new Error("El respaldo supera el límite de 25 MiB.");
  }
  try {
    return await archivo.text();
  } catch (causa: unknown) {
    throw new Error("No fue posible leer el archivo seleccionado.", {
      cause: causa,
    });
  }
}
