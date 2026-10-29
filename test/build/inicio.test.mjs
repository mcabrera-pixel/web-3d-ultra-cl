// Solo posterior a build: npm run check. No entra en el glob de prebuild.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import yaml from 'js-yaml';
import { verifyInicio } from '../../scripts/verificar-adopcion.mjs';

const html = readFileSync('dist/index.html', 'utf8');
const legacy = readFileSync('src/legacy/index-body.html', 'utf8');
const fichas = Object.fromEntries(readdirSync('src/content/equipos').filter(f => f.endsWith('.md')).map(f => [f.replace(/\.md$/, ''), yaml.load(readFileSync(`src/content/equipos/${f}`, 'utf8').split(/^---$/m)[1])]));
test('la portada construida conserva sus contratos', () => {
  assert.deepEqual(verifyInicio(html, fichas, legacy), []);
});
test('quitar el CTA real del hero hace fallar la validación', () => {
  const alterado = html.replace(/<a\b[^>]*>\s*Ver Demo Virtual\s*<\/a>/, '');
  assert.notEqual(alterado, html, 'la mutación debe retirar el enlace real');
  assert.ok(verifyInicio(alterado, fichas, legacy).includes('Inicio: CTA Ver Demo Virtual'));
});
test('quitar cualquiera de las tres tarjetas reales hace fallar la validación', () => {
  for (const slug of Object.keys(fichas)) {
    const tarjeta = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].find(([t]) => t.includes(`href="/biblioteca/${slug}"`))?.[0];
    assert.ok(tarjeta, `tarjeta construida de ${slug}`);
    const errores = verifyInicio(html.replace(tarjeta, ''), fichas, legacy);
    assert.ok(errores.includes('Inicio: tres tarjetas de equipos'));
    assert.ok(errores.includes(`Inicio: nombre y tipo de ${slug}`));
  }
});
