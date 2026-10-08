import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'src/content/equipos';
const fichas = () => readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => ({ f, txt: readFileSync(`${DIR}/${f}`, 'utf8') }));

test('hay 3 fichas en F1', () => {
  assert.deepEqual(fichas().map((x) => x.f).sort(), ['komatsu-930e-5.md', 'pala-ph-4100xpc.md', 'sandvik-lh621.md']);
});

test('ninguna línea que nombra a CODELCO lleva cifras', () => {
  for (const { f, txt } of fichas()) {
    for (const linea of txt.split('\n')) if (/CODELCO/i.test(linea)) assert.doesNotMatch(linea, /\d/, `${f}: ${linea}`);
  }
});

test('sin raya como conector', () => {
  for (const { f, txt } of fichas()) assert.doesNotMatch(txt, /[—–]/, f);
});

test('el cuerpo tiene entre 70 y 260 palabras', () => {
  for (const { f, txt } of fichas()) {
    const cuerpo = txt.split(/^---$/m).slice(2).join('---');
    const palabras = cuerpo.split(/\s+/).filter(Boolean).length;
    assert.ok(palabras >= 70 && palabras <= 260, `${f}: ${palabras} palabras`);
  }
});

test('cada ficha tiene su póster y sus piezas', () => {
  for (const { f } of fichas()) {
    const slug = f.replace(/\.md$/, '');
    readFileSync(`public/biblioteca/${slug}/poster.webp`);
    const piezas = JSON.parse(readFileSync(`public/biblioteca/${slug}/piezas.json`, 'utf8'));
    assert.ok(piezas.grupos.length >= 1 && piezas.marcadas.length >= 3, slug);
  }
});
