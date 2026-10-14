import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const DIR = 'src/content/equipos';
const fichas = () => readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => ({ f, txt: readFileSync(`${DIR}/${f}`, 'utf8') }));
// Textos para personas fuera de los .md: páginas y componentes de la biblioteca, y la lista de experiencias del esquema
const paginas = () => [
  ...['src/pages/biblioteca', 'src/components'].flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.astro')).map((f) => `${d}/${f}`)),
  'src/content.config.ts',
].map((f) => ({ f, txt: readFileSync(f, 'utf8') }));
const cuerpo = (txt) => txt.split(/^---$/m).slice(2).join('---');
// Frontmatter leído con js-yaml, el mismo lector que usa Astro: lo que Astro no puede leer tampoco pasa estas pruebas
const datos = (txt) => yaml.load(txt.split(/^---$/m)[1]);
const faq = (txt) => datos(txt).faq.flatMap(({ q, a }) => [q, a]);
// Lo que lee una persona en la ficha: descripción, bajada, FAQ y cuerpo (sin la experiencia, que sale de la lista
// cerrada del esquema y puede repetirse entre equipos de un mismo proyecto)
const textoVisible = (txt) => [datos(txt).descripcion, datos(txt).bajada, ...faq(txt), cuerpo(txt)].join(' ');
const ngramas = (texto, n) => {
  const p = texto.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ');
  return new Set(Array.from({ length: Math.max(0, p.length - n + 1) }, (_, i) => p.slice(i, i + n).join(' ')));
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

test('el frontmatter de cada ficha se lee como YAML, igual que en Astro', () => {
  // Un valor sin comillas con «: » adentro rompe el build; aquí se ve antes
  for (const { f, txt } of fichas()) {
    try {
      datos(txt);
    } catch (e) {
      assert.fail(`${f}: ${e.reason ?? e.message} (línea ${(e.mark?.line ?? 0) + 1} del archivo)`);
    }
  }
});

test('el cuerpo de cada ficha no repite 8 palabras seguidas de su FAQ', () => {
  for (const { f, txt } of fichas()) {
    const delCuerpo = ngramas(cuerpo(txt), 8);
    for (const texto of faq(txt)) {
      const comun = [...ngramas(texto, 8)].find((x) => delCuerpo.has(x));
      assert.equal(comun, undefined, `${f}: el cuerpo y el FAQ repiten «${comun}»`);
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

test('cada ficha declara la fecha de su última revisión (updated), que el sitemap usa como lastmod', () => {
  for (const { f, txt } of fichas()) {
    const { updated } = datos(txt);
    assert.ok(updated instanceof Date && !Number.isNaN(updated.getTime()), `${f}: updated = ${updated}`);
  }
});

test('llms.txt lista cada ficha (site.yaml → llms.pages)', () => {
  const urls = yaml.load(readFileSync('site.yaml', 'utf8')).llms.pages.map((p) => p.url);
  for (const { f } of fichas()) assert.ok(urls.includes(`/biblioteca/${f.replace(/\.md$/, '')}`), `${f}: falta en llms.pages`);
});

// Ancho y alto de un JPEG: los trae el primer marcador SOF (C0 a CF, salvo C4, C8 y CC)
function medidasJpeg(b) {
  assert.equal(b.readUInt16BE(0), 0xffd8, 'no es un JPEG');
  for (let i = 2; i + 9 < b.length; i += 2 + b.readUInt16BE(i + 2)) {
    const marca = b[i + 1];
    if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) return { ancho: b.readUInt16BE(i + 7), alto: b.readUInt16BE(i + 5) };
  }
  assert.fail('JPEG sin marcador SOF');
}

test('cada ficha tiene su imagen para redes: og.jpg opaco de 1200 × 630 y bajo 300 KB', () => {
  for (const { f } of fichas()) {
    const slug = f.replace(/\.md$/, '');
    const og = readFileSync(`public/biblioteca/${slug}/og.jpg`);
    assert.deepEqual(medidasJpeg(og), { ancho: 1200, alto: 630 }, slug);
    assert.ok(og.length < 300_000, `${slug}: og.jpg pesa ${og.length} bytes`);
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
