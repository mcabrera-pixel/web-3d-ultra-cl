import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const INICIO = readFileSync('src/legacy/index-body.html', 'utf8');
const DIR = 'src/content/equipos';
// Frontmatter leído con js-yaml, igual que en equipos.test.mjs
const fichas = Object.fromEntries(
  readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => [f.replace(/\.md$/, ''), yaml.load(readFileSync(`${DIR}/${f}`, 'utf8').split(/^---$/m)[1])]),
);
const sinEntidades = (s) => s.replace(/&amp;/g, '&').trim();
// Las tarjetas son las de la sección «Gestión de Activos Mineros»: un enlace a una ficha en otra parte del inicio no cuenta
const SECCION = INICIO.match(/<section id="twins-2"[\s\S]*?<\/section>/)?.[0] ?? '';
// El inicio es HTML legado y no puede leer la colección: cada tarjeta repite el slug, el nombre y el tipo de su ficha
const tarjetas = () => [...SECCION.matchAll(/<a href="\/biblioteca\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, slug, dentro]) => ({
  slug,
  poster: dentro.match(/<img[^>]* src="([^"]*)"/)?.[1],
  alt: sinEntidades(dentro.match(/<img[^>]* alt="([^"]*)"/)?.[1] ?? ''),
  nombre: sinEntidades(dentro.match(/<strong[^>]*>([^<]*)<\/strong>/)?.[1] ?? ''),
  tipo: sinEntidades(dentro.match(/<\/strong>\s*<span[^>]*>([^<]*)<\/span>/)?.[1] ?? ''),
}));

test('el menú del inicio enlaza la biblioteca', () => {
  const menu = INICIO.match(/<nav class="nav-menu">([\s\S]*?)<\/nav>/)?.[1] ?? '';
  assert.match(menu, /<a href="\/biblioteca\/"[^>]*>\s*Biblioteca\s*<\/a>/);
});

test('las 3 tarjetas del inicio calzan con su ficha: slug, nombre, tipo, alt y póster', () => {
  const lista = tarjetas();
  assert.equal(lista.length, 3, 'el inicio muestra 3 tarjetas a fichas');
  assert.equal(new Set(lista.map((t) => t.slug)).size, 3, 'cada tarjeta lleva a una ficha distinta');
  for (const t of lista) {
    const ficha = fichas[t.slug];
    assert.ok(ficha, `${t.slug}: no existe en ${DIR}`);
    assert.equal(t.nombre, ficha.nombre, `${t.slug}: el nombre de la tarjeta no es el de la ficha`);
    assert.equal(t.tipo, ficha.tipo, `${t.slug}: el tipo de la tarjeta no es el de la ficha`);
    assert.equal(t.alt, `Modelo 3D de referencia: ${ficha.nombre}`, `${t.slug}: alt del póster`);
    assert.equal(t.poster, `/biblioteca/${t.slug}/poster.webp`, `${t.slug}: ruta del póster`);
    assert.ok(existsSync(`public${t.poster}`), `${t.slug}: el póster no existe en public/`);
  }
});

test('«Ver Demo Virtual» del héroe lleva a la biblioteca', () => {
  // La demo del inicio ya no existe: los visores viven en las fichas
  const heroe = INICIO.match(/<section class="hero"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.match(heroe, /<a href="\/biblioteca\/"[^>]*>\s*Ver Demo Virtual\s*<\/a>/);
});

test('el inicio ya no embebe visores externos y la CSP no abre marcos para ellos', () => {
  // equal y no doesNotMatch: al fallar, este último imprime el inicio completo (54 mil caracteres)
  assert.equal((INICIO.match(/<iframe/gi) ?? []).length, 0, 'los visores viven en /biblioteca/<slug>, no en iframes del inicio');
  assert.deepEqual(yaml.load(readFileSync('site.yaml', 'utf8')).csp.frame_src, [], 'site.yaml: csp.frame_src debe quedar vacío');
});
