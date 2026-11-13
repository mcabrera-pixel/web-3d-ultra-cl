import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'src/pages/casos';

// Spec §6.3: la biblioteca recibe enlaces internos desde el inicio, el hub y los casos.
// Tarea 6: los cuatro casos son .astro; un .html homónimo sería un segundo generador para la misma ruta.
test('cada caso enlaza la biblioteca de equipos', () => {
  const archivos = readdirSync(DIR);
  const casos = archivos.filter((f) => f.endsWith('.astro'));
  assert.equal(casos.length, 4, `se esperan cuatro casos .astro en ${DIR}`);
  assert.deepEqual(archivos.filter((f) => f.endsWith('.html')), [], 'sin HTML heredado junto a los .astro');
  for (const f of casos) assert.match(readFileSync(`${DIR}/${f}`, 'utf8'), /href="\/biblioteca\/"/, f);
});
