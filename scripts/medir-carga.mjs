import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const dist = resolve(process.argv[2] ?? "dist");
const manifest = JSON.parse(
  await readFile(resolve(dist, ".vite/manifest.json"), "utf8"),
);
const entradas = Object.entries(manifest)
  .filter(([, modulo]) => modulo.isEntry)
  .map(([clave]) => clave);
if (!entradas.length) throw new Error("El manifest no contiene entradas.");

const recorridos = new Set();
const js = new Set();
const css = new Set();

function recorrer(clave) {
  if (recorridos.has(clave)) return;
  recorridos.add(clave);
  const modulo = manifest[clave];
  if (!modulo) throw new Error(`Importación ausente en manifest: ${clave}`);
  if (modulo.file.endsWith(".js")) js.add(modulo.file);
  for (const archivo of modulo.css ?? []) css.add(archivo);
  for (const dependencia of modulo.imports ?? []) recorrer(dependencia);
}
entradas.forEach(recorrer);

async function medir(archivo) {
  const ruta = resolve(dist, archivo);
  if (!ruta.startsWith(`${dist}${sep}`)) {
    throw new Error(`El archivo sale del artefacto: ${archivo}`);
  }
  const bytes = await readFile(ruta);
  return {
    archivo,
    bytes: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function listar(directorio) {
  const archivos = [];
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    const ruta = resolve(directorio, entrada.name);
    if (entrada.isDirectory()) archivos.push(...(await listar(ruta)));
    else if (
      entrada.isFile() &&
      [".js", ".css", ".svg", ".png", ".webp", ".avif", ".woff2"].includes(
        extname(ruta),
      )
    ) {
      archivos.push(relative(dist, ruta).split(sep).join("/"));
    }
  }
  return archivos;
}

const inventario = await Promise.all((await listar(dist)).sort().map(medir));
function total(archivos) {
  const suma = { bytes: 0, gzip: 0, brotli: 0 };
  for (const archivo of archivos) {
    const fila = inventario.find((item) => item.archivo === archivo);
    if (!fila) throw new Error(`Recurso inicial ausente: ${archivo}`);
    suma.bytes += fila.bytes;
    suma.gzip += fila.gzip;
    suma.brotli += fila.brotli;
  }
  return suma;
}

console.log(
  JSON.stringify(
    {
      herramientas: {
        node: process.version,
        zlib: process.versions.zlib,
        gzip: "nivel 9, cada archivo por separado",
        brotli: "calidad 11, cada archivo por separado",
      },
      entradas,
      jsInicial: { archivos: [...js], ...total(js) },
      cssInicial: { archivos: [...css], ...total(css) },
      rutasDiferidas: Object.entries(manifest)
        .filter(([, modulo]) => modulo.isDynamicEntry)
        .map(([origen, modulo]) => ({
          origen,
          archivo: modulo.file,
          imports: modulo.imports ?? [],
        })),
      inventario,
    },
    null,
    2,
  ),
);
