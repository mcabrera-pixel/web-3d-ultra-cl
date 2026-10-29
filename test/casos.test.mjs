import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'src/pages/casos';

// Spec §6.3: la biblioteca recibe enlaces internos desde el inicio, el hub y los casos
test('cada caso enlaza la biblioteca de equipos', () => {
  const casos = readdirSync(DIR).filter((f) => /\.(html|astro)$/.test(f));
  assert.equal(casos.length, 4, `se esperan cuatro casos en ${DIR}`);
  assert.equal(new Set(casos.map(f => f.replace(/\.(html|astro)$/, ''))).size, 4, 'sin dos generadores para una ruta');
  for (const f of casos) assert.match(readFileSync(`${DIR}/${f}`, 'utf8'), /href="\/biblioteca\/"/, f);
});
