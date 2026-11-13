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
  // Dos versiones de la misma muestra, cada una con su despiece y su evento.
  for (const base of ['/muestras/bomba/', '/muestras/bomba-esencial/']) {
    for (const href of [base, `${base}?vista=despiece&pieza=230`, `${base}?evento=1`]) assert.ok(src.includes(`'${href}'`), `enlace ${href}`);
  }
  assert.match(src, /Versión detallada/);
  assert.match(src, /Versión esencial/);
  // Encabezado: la acción principal abre la detallada y la segunda la esencial.
  const encabezado = src.slice(src.indexOf('<h1'), src.indexOf('</Bloque>', src.indexOf('<h1')));
  const acciones = [...encabezado.matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(acciones.slice(0, 2), ['/muestras/bomba/', '/muestras/bomba-esencial/']);
  assert.match(encabezado, /texto: 'Abrir la muestra interactiva' \}/);
  assert.doesNotMatch(src, /\b(Opus|Fable|Claude|GPT|Codex|agentes?)\b/i, 'sin nombrar modelos ni agentes');
  const imgs = [...src.matchAll(/src: '(\/media\/captura\/bomba\/[^']+)'/g)].map((m) => m[1]);
  assert.ok(imgs.length >= 7, 'capturas de las dos versiones');
  assert.ok(imgs.some((i) => i.includes('esencial')), 'captura de la versión esencial');
  assert.match(src, /Captura de la muestra/);
});

// Las figuras quedan centradas en la columna editorial: solo margen en bloque, sin pisar margin-inline.
test('las figuras del caso de la bomba no pisan el margen en línea de la columna', () => {
  const css = readFileSync(`${DIR}/${NUEVOS[0]}`, 'utf8').split('<style>')[1] ?? '';
  for (const clase of ['.caso-figura', '.caso-galeria']) {
    for (const regla of css.matchAll(new RegExp(`${clase.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'g'))) {
      assert.doesNotMatch(regla[1], /(^|;|\s)margin(-left|-right|-inline[a-z-]*)?\s*:/, `${clase}: ${regla[1]}`);
    }
  }
});

// La muestra se publica fuera de buscadores: meta robots noindex y cabecera X-Robots-Tag para /muestras/*.
test('las dos versiones de la muestra van con noindex y sin los archivos excluidos', () => {
  for (const nombre of ['bomba', 'bomba-esencial']) {
    const html = readFileSync(`public/muestras/${nombre}/index.html`, 'utf8');
    assert.match(html, /<meta name="robots" content="noindex/);
    assert.ok(html.includes(`<link rel="canonical" href="https://3d-ultra.cl/muestras/${nombre}/">`), nombre);
    const archivos = readdirSync(`public/muestras/${nombre}`, { recursive: true }).map(String);
    for (const fuera of ['_headers', 'paso-a-paso.html', 'paso-a-paso.css', 'video']) assert.ok(!archivos.includes(fuera), fuera);
  }
  assert.match(readFileSync('public/_headers', 'utf8'), /\/muestras\/\*\r?\n {2}X-Robots-Tag: noindex/);
});
