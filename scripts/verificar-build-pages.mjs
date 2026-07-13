import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RUTA_BASE = "/HereToPlan/";
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const directorioDist = resolve(raiz, "dist");
const indice = resolve(directorioDist, "index.html");

const html = await readFile(indice, "utf8");
const referencias = [...html.matchAll(/(?:src|href)=(["'])(.*?)\1/gu)]
  .map((coincidencia) => coincidencia[2])
  .filter((referencia) =>
    referencia ? !/^(?:[a-z]+:|\/\/|#)/iu.test(referencia) : false,
  );

if (referencias.length === 0) {
  throw new Error("El HTML construido no contiene recursos locales.");
}

const extensiones = new Set();
for (const referencia of referencias) {
  if (!referencia.startsWith(RUTA_BASE)) {
    throw new Error(
      `El recurso ${referencia} no utiliza la ruta base ${RUTA_BASE}.`,
    );
  }

  const rutaPublica = new URL(referencia, "https://example.invalid").pathname;
  const rutaRelativa = decodeURIComponent(rutaPublica.slice(RUTA_BASE.length));
  const archivo = resolve(directorioDist, rutaRelativa);
  if (!archivo.startsWith(`${directorioDist}${sep}`)) {
    throw new Error(`El recurso ${referencia} sale del artefacto publicado.`);
  }

  await access(archivo);
  extensiones.add(extname(archivo));
}

for (const extensionRequerida of [".css", ".js"]) {
  if (!extensiones.has(extensionRequerida)) {
    throw new Error(
      `El artefacto no referencia ningún recurso ${extensionRequerida}.`,
    );
  }
}

console.log(
  `Artefacto válido para ${RUTA_BASE}: ${referencias.length} recursos comprobados.`,
);
