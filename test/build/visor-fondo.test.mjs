// Solo posterior a build. En las fichas, el fondo de partículas WebGL quedaba detrás de bloques opacos y seguía
// dibujando sin verse (OCR de la Tarea 5). Se comprueba en el JS y CSS que de verdad cargan las fichas: el visor
// conserva su lienzo y su bucle, y el código que creaba el lienzo .bib-fondo ya no existe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const fichas = readdirSync('src/content/equipos').filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));

// Módulos locales que carga la página, siguiendo imports estáticos y dinámicos (comillas o backticks).
function codigoDe(html) {
  const vistos = new Set();
  let codigo = '';
  const seguir = (url) => {
    const limpio = url.split('?')[0];
    if (!limpio.startsWith('/') || vistos.has(limpio)) return;
    vistos.add(limpio);
    const archivo = path.join('dist', limpio);
    if (!existsSync(archivo)) return;
    const js = readFileSync(archivo, 'utf8');
    codigo += '\n' + js;
    for (const m of js.matchAll(/(?:import|from)\s*\(?\s*["'`](\.{1,2}\/[^"'`]+\.js)["'`]/g)) seguir(path.posix.join(path.posix.dirname(limpio), m[1]));
  };
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) seguir(m[1]);
  for (const m of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    codigo += '\n' + m[1];
    for (const i of m[1].matchAll(/(?:import|from)\s*\(?\s*["'`](\/[^"'`]+\.js)["'`]/g)) seguir(i[1]);
  }
  return codigo;
}
const cssDe = (html) => [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => readFileSync(path.join('dist', m[1]), 'utf8')).join('\n')
  + [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

for (const slug of fichas) {
  test(`${slug}: el visor sigue cargando y no se crea ni anima el fondo de partículas`, () => {
    const html = readFileSync(`dist/biblioteca/${slug}.html`, 'utf8');
    const codigo = codigoDe(html);
    assert.ok(codigo.includes('bib-lienzo'), 'el visor sigue usando su lienzo');
    assert.ok(codigo.includes('setAnimationLoop'), 'el visor conserva su bucle de render');
    assert.ok(!codigo.includes('bib-fondo'), 'ningún módulo de la ficha crea el lienzo del fondo');
    assert.ok(!cssDe(html).includes('.bib-fondo'), 'sin estilos para un lienzo que ya no existe');
    assert.equal((html.match(/<canvas\b/g) ?? []).length, 1, 'un solo canvas en el HTML: el del visor');
  });
}
