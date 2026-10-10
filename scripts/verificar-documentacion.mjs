import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const raiz = process.cwd();
const documentos = [
  join(raiz, "README.md"),
  ...(await buscarMarkdown(join(raiz, "docs"))),
  join(raiz, "src/presentacion/recursos/README.md"),
];
const errores = [];
let enlacesLocales = 0;

for (const documento of documentos) {
  const texto = (await readFile(documento, "utf8")).replace(
    /^```[^\n]*\n[\s\S]*?^```\s*$/gm,
    "",
  );
  const enlaces = texto.matchAll(/!?\[[^\]\n]+\]\(([^)\n]+)\)/g);
  for (const enlace of enlaces) {
    const destino = enlace[1].trim().replace(/^<([^>]+)>.*$/, "$1");
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(destino)) continue;
    const rutaSinFragmento = destino.split(/[?#]/)[0];
    enlacesLocales += 1;
    try {
      await access(
        resolve(dirname(documento), decodeURIComponent(rutaSinFragmento)),
      );
    } catch {
      errores.push(
        `${relative(raiz, documento)}: destino ausente o inválido ${destino}`,
      );
    }
  }
}

if (errores.length > 0) {
  console.error(errores.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `${documentos.length} documentos; ${enlacesLocales} enlaces locales comprobados; 0 destinos rotos.`,
  );
}

async function buscarMarkdown(directorio) {
  const entradas = await readdir(directorio, { withFileTypes: true });
  const archivos = [];
  for (const entrada of entradas) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) archivos.push(...(await buscarMarkdown(ruta)));
    else if (entrada.name.endsWith(".md")) archivos.push(ruta);
  }
  return archivos;
}
