// Medición sobre el build optimizado, incluidos imports dinámicos y URL del Worker.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
const dir = path.resolve(process.argv[2] || 'dist');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const entradas = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"/g)].map(m => m[1]);
function grafo(raices) {
  const visto = new Set();
  function visitar(url) {
    const archivo = url.startsWith(dir + path.sep) ? url : path.join(dir, url);
    if (visto.has(archivo)) return;
    visto.add(archivo);
    const fuente = fs.readFileSync(archivo, 'utf8');
    for (const [, referencia] of fuente.matchAll(/["'`]((?:\.\.?\/|\/_astro\/)[^"'`]+\.js)["'`]/g)) {
      visitar(referencia.startsWith('/') ? referencia : path.resolve(path.dirname(archivo), referencia));
    }
  }
  raices.forEach(visitar);
  return [...visto].map(archivo => ({ archivo: path.relative(dir, archivo), gzip: gzipSync(fs.readFileSync(archivo), { level: 9 }).length }));
}
const nube = grafo(entradas.filter(e => /NubeAncla|HistoriaNube/.test(e)));
const campo = grafo(entradas.filter(e => /CampoAntigravity/.test(e)));
const inline = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m, i) => ({ archivo: `inline-${i + 1}`, gzip: gzipSync(m[1], { level: 9 }).length }));
const total = [...grafo(entradas), ...inline];
const suma = a => a.reduce((n, f) => n + f.gzip, 0);
console.log(JSON.stringify({ nube: { bytes: suma(nube), limite: 12000, archivos: nube }, campo: { bytes: suma(campo), limite: 5000, archivos: campo }, total: { bytes: suma(total), archivos: total } }, null, 2));
if (!nube.length || !campo.length || suma(nube) > 12000 || suma(campo) > 5000) process.exitCode = 1;
