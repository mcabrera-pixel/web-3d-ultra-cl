import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'src/pages/casos';

// Spec §6.3: la biblioteca recibe enlaces internos desde el inicio, el hub y los casos
test('cada caso enlaza la biblioteca de equipos', () => {
  const casos = readdirSync(DIR).filter((f) => f.endsWith('.html'));
  assert.ok(casos.length >= 4, `solo ${casos.length} casos en ${DIR}`);
  for (const f of casos) assert.match(readFileSync(`${DIR}/${f}`, 'utf8'), /<a href="\/biblioteca\/">/, f);
});
