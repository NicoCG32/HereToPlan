import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const raizProyecto = fileURLToPath(new URL("../", import.meta.url));
const directorioPresentacion = fileURLToPath(
  new URL("../src/presentacion/", import.meta.url),
);
const archivos = await recorrer(directorioPresentacion);
const archivosCss = archivos.filter((archivo) => extname(archivo) === ".css");
const archivosFuente = archivos.filter((archivo) =>
  [".ts", ".tsx"].includes(extname(archivo)),
);
const fuentePresentacion = (
  await Promise.all(archivosFuente.map((archivo) => readFile(archivo, "utf8")))
).join("\n");

const resumen = [];
const clasesCss = new Set();
let comentarios = 0;
for (const archivo of archivosCss) {
  const contenido = await readFile(archivo, "utf8");
  const hoja = postcss.parse(contenido, { from: archivo });
  let reglas = 0;
  let consultas = 0;
  hoja.walkComments(() => {
    comentarios += 1;
  });
  hoja.walkRules((regla) => {
    reglas += 1;
    for (const coincidencia of regla.selector.matchAll(/\.([_a-zA-Z]+[\w-]*)/g))
      clasesCss.add(coincidencia[1]);
  });
  hoja.walkAtRules("media", () => {
    consultas += 1;
  });
  resumen.push({
    archivo: relative(raizProyecto, archivo),
    lineas: contenido.split(/\r?\n/).length - 1,
    reglas,
    consultas,
  });
}

const entrada = postcss.parse(
  await readFile(
    new URL("../src/presentacion/estilos.css", import.meta.url),
    "utf8",
  ),
);
const entradaSoloImporta = entrada.nodes.every(
  (nodo) => nodo.type === "atrule" && nodo.name === "import",
);
const posiblesHuerfanas = [...clasesCss]
  .filter(
    (clase) =>
      !fuentePresentacion.includes(clase) &&
      !/^informe-respaldo-(valido|invalido|incompatible)$/.test(clase) &&
      !/^vista-(dia|semana|mes)$/.test(clase),
  )
  .sort();

console.table(resumen);
console.log(
  `Entrada global sólo con importaciones: ${entradaSoloImporta ? "sí" : "no"}`,
);
console.log(`Comentarios CSS: ${comentarios}`);
console.log(
  `Clases sin literal fuente detectado: ${posiblesHuerfanas.length === 0 ? "ninguna" : posiblesHuerfanas.join(", ")}`,
);

if (!entradaSoloImporta || comentarios > 0) process.exitCode = 1;

async function recorrer(directorio) {
  const resultado = [];
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) resultado.push(...(await recorrer(ruta)));
    else resultado.push(ruta);
  }
  return resultado;
}
