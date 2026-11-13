import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'src/pages/casos';
// Los cuatro casos migrados de la línea base no cambian de nombre; el caso de demostración de la bomba es la única
// ruta nueva permitida (13-nov-2026).
const BASE = [
  'analisis-chimenea-cps-salvador.astro',
  'gemelo-digital-raf-potrerillos.astro',
  'hornos-isasmelt-extension-vida-util.astro',
  'rueda-moldeo-anodos-potrerillos.astro',
];
const NUEVOS = ['gemelo-digital-bomba-despiece-sap-pi.astro'];

// Spec §6.3: la biblioteca recibe enlaces internos desde el inicio, el hub y los casos.
// Tarea 6: los casos son .astro; un .html homónimo sería un segundo generador para la misma ruta.
test('cada caso enlaza la biblioteca de equipos', () => {
  const archivos = readdirSync(DIR);
  const casos = archivos.filter((f) => f.endsWith('.astro')).sort();
  assert.deepEqual(casos, [...BASE, ...NUEVOS].sort(), `casos .astro esperados en ${DIR}`);
  assert.deepEqual(archivos.filter((f) => f.endsWith('.html')), [], 'sin HTML heredado junto a los .astro');
  for (const f of casos) assert.match(readFileSync(`${DIR}/${f}`, 'utf8'), /href="\/biblioteca\/"/, f);
});

// El caso de la bomba es una demostración con datos de ejemplo: lo dice a la vista, abre la muestra y sus dos estados,
// y rotula cada captura con su origen.
test('el caso de la bomba se presenta como demostración y abre la muestra', () => {
  const src = readFileSync(`${DIR}/${NUEVOS[0]}`, 'utf8');
  assert.match(src, /Caso de demostración/);
  assert.match(src, /datos de ejemplo/i);
  assert.match(src, /Nube simulada desde el modelo/);
  for (const href of ['/muestras/bomba/', '/muestras/bomba/?vista=despiece&pieza=230', '/muestras/bomba/?evento=1']) {
    assert.ok(src.includes(`'${href}'`), `enlace ${href}`);
  }
  assert.match(src, /Abrir la muestra interactiva/);
  const imgs = [...src.matchAll(/src: '(\/media\/captura\/bomba\/[^']+)'/g)].map((m) => m[1]);
  assert.ok(imgs.length >= 5, 'al menos cinco capturas de la muestra');
  assert.match(src, /Captura de la muestra/);
});

// La muestra se publica fuera de buscadores: meta robots noindex y cabecera X-Robots-Tag para /muestras/*.
test('la muestra de la bomba va con noindex y sin los archivos excluidos', () => {
  const html = readFileSync('public/muestras/bomba/index.html', 'utf8');
  assert.match(html, /<meta name="robots" content="noindex/);
  assert.match(html, /<link rel="canonical" href="https:\/\/3d-ultra\.cl\/muestras\/bomba\/">/);
  const archivos = readdirSync('public/muestras/bomba', { recursive: true }).map(String);
  for (const fuera of ['_headers', 'paso-a-paso.html', 'paso-a-paso.css', 'video']) assert.ok(!archivos.includes(fuera), fuera);
  assert.match(readFileSync('public/_headers', 'utf8'), /\/muestras\/\*\r?\n {2}X-Robots-Tag: noindex/);
});
