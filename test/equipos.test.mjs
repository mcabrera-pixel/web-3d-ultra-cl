import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'src/content/equipos';
const fichas = () => readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => ({ f, txt: readFileSync(`${DIR}/${f}`, 'utf8') }));
// Textos para personas fuera de los .md: páginas y componentes de la biblioteca, y la lista de experiencias del esquema
const paginas = () => [
  ...['src/pages/biblioteca', 'src/components'].flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.astro')).map((f) => `${d}/${f}`)),
  'src/content.config.ts',
].map((f) => ({ f, txt: readFileSync(f, 'utf8') }));
const cuerpo = (txt) => txt.split(/^---$/m).slice(2).join('---');
// Lo que lee una persona en la ficha: descripción, bajada, preguntas y respuestas del FAQ y cuerpo (sin la experiencia,
// que sale de la lista cerrada del esquema y puede repetirse entre equipos de un mismo proyecto)
const textoVisible = (txt) => {
  const campos = txt.split(/^---$/m)[1].split('\n').map((l) => l.match(/^\s*(?:- )?(?:descripcion|bajada|q|a): (.*)$/)?.[1]).filter(Boolean);
  return [...campos, cuerpo(txt)].join(' ');
};
const ngramas = (texto, n) => {
  const p = texto.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ');
  return new Set(p.slice(0, p.length - n + 1).map((_, i) => p.slice(i, i + n).join(' ')));
};

test('hay 3 fichas en F1', () => {
  assert.deepEqual(fichas().map((x) => x.f).sort(), ['komatsu-930e-5.md', 'pala-ph-4100xpc.md', 'sandvik-lh621.md']);
});

test('ninguna línea que nombra a CODELCO lleva cifras', () => {
  for (const { f, txt } of [...fichas(), ...paginas()]) {
    for (const linea of txt.split('\n')) if (/CODELCO/i.test(linea)) assert.doesNotMatch(linea, /\d/, `${f}: ${linea}`);
  }
});

test('sin raya como conector', () => {
  for (const { f, txt } of [...fichas(), ...paginas()]) assert.doesNotMatch(txt, /[—–]/, f);
});

test('el cuerpo tiene entre 70 y 260 palabras', () => {
  for (const { f, txt } of fichas()) {
    const palabras = cuerpo(txt).split(/\s+/).filter(Boolean).length;
    assert.ok(palabras >= 70 && palabras <= 260, `${f}: ${palabras} palabras`);
  }
});

test('las fichas no repiten entre sí una frase de 8 palabras seguidas', () => {
  const lista = fichas().map(({ f, txt }) => ({ f, g: ngramas(textoVisible(txt), 8) }));
  for (const [i, a] of lista.entries()) {
    for (const b of lista.slice(i + 1)) {
      const comun = [...a.g].find((x) => b.g.has(x));
      assert.equal(comun, undefined, `${a.f} y ${b.f} repiten «${comun}»`);
    }
  }
});

test('el cuerpo de cada ficha nombra los sistemas de su piezas.json', () => {
  for (const { f, txt } of fichas()) {
    const piezas = JSON.parse(readFileSync(`public/biblioteca/${f.replace(/\.md$/, '')}/piezas.json`, 'utf8'));
    for (const { titulo } of piezas.grupos) {
      // Palabra completa: «Carga» no cuenta dentro de «cargador»
      const nombra = new RegExp(`(?<!\\p{L})${titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\p{L})`, 'iu');
      assert.match(cuerpo(txt), nombra, `${f}: falta el sistema «${titulo}»`);
    }
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
