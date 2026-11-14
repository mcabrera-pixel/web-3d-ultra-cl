// Solo posterior a build: npm run check. Favicon: /favicon.ico respondía 404 y dejaba un error de consola, y las páginas
// declaraban /favicon.svg. El sitio lo sirve desde public/favicon.ico (public/favicon.svg, el ícono que ya declaraba,
// en 16, 32 y 48 px) y cada página construida con `Estandar` (todas las de src/layouts/Sitio.astro, incluidas la 404,
// /gracias y /contacto-error) lo declara una sola vez en su <head>, desde el slot head del kit. Mismo camino que
// condron.cl (commits 9ab0ef6 y 4e4b39e), con parse5 y los ayudantes de scripts/ en lugar de un parser nuevo.
// public/favicon.svg se queda en public/.
//
// Excepciones, listadas con su motivo (la prueba falla si cambian):
// - Las muestras estáticas de /muestras/ (bomba y bomba-esencial) tienen su propio HTML, sin el estándar, generado por
//   scripts/importar-muestra.mjs desde un origen fuera del repo, y cada una declara su propio ícono (bomba, su
//   favicon.svg de la muestra; bomba-esencial, `data:,` para no pedir ninguno). Cambiarlo es cambiar la muestra y el
//   script que la reproduce, fuera de este encargo. La prueba exige que sigan con ese único ícono.
// - Los artículos del blog (/blog/<slug>) usan `Post` del kit, que no tiene slot head: el sitio no puede declarar ahí
//   el ícono sin tocar el kit. Hoy no hay ninguno; si se publica uno, la prueba falla a propósito para resolverlo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { publishedBlogSlugs, resolveRouteToFile } from '../../scripts/verificar-adopcion.mjs';
import { MUESTRAS } from '../../scripts/importar-muestra.mjs';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const DIST = path.join(RAIZ, 'dist');
const elements = (node) => [node, ...(node.childNodes ?? []).flatMap(elements)];
const attr = (node, name) => node?.attrs?.find((a) => a.name === name)?.value;
const clases = (node) => (attr(node, 'class') ?? '').split(/\s+/).filter(Boolean);
// <link> con el token icon en rel («icon», «shortcut icon»); apple-touch-icon es otro token y no cuenta.
const iconos = (nodos) => nodos.filter((n) => n.tagName === 'link'
  && (attr(n, 'rel') ?? '').toLowerCase().split(/\s+/).includes('icon'));
// Ícono propio de cada muestra (excepción de arriba).
const ICONO_MUESTRA = { bomba: './favicon.svg', 'bomba-esencial': 'data:,' };

// Páginas HTML del dist (ruta relativa con separador /).
const paginas = readdirSync(DIST, { recursive: true }).map(String)
  .filter((f) => f.endsWith('.html')).map((f) => f.split(path.sep).join('/')).sort();
const nodosDe = new Map(paginas.map((f) => [f, elements(parse(readFileSync(path.join(DIST, f), 'utf8')))]));
const muestraDe = (f) => f.match(/^muestras\/([^/]+)\/index\.html$/)?.[1];

/** Lados de cada imagen de un ICO, comprobando cabecera, directorio y que cada imagen (PNG o BMP) mida lo que dice. */
function ladosDelIco(ico) {
  assert.deepEqual([...ico.subarray(0, 4)], [0, 0, 1, 0], 'cabecera ICO 00 00 01 00');
  const n = ico.readUInt16LE(4);
  assert.ok(n > 0 && ico.length >= 6 + n * 16, `directorio de ${n} imágenes`);
  return Array.from({ length: n }, (_, i) => {
    const e = 6 + i * 16;
    const ancho = ico[e] || 256, alto = ico[e + 1] || 256;
    const largo = ico.readUInt32LE(e + 8), inicio = ico.readUInt32LE(e + 12);
    assert.equal(ancho, alto, `imagen ${i} cuadrada`);
    assert.ok(largo > 0 && inicio + largo <= ico.length, `imagen ${i} dentro del archivo`);
    const datos = ico.subarray(inicio, inicio + largo);
    if (datos.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      assert.deepEqual([datos.readUInt32BE(16), datos.readUInt32BE(20)], [ancho, alto], `PNG ${i} de ${ancho} px`);
    } else {
      assert.equal(datos.readUInt32LE(0), 40, `imagen ${i}: PNG o BMP (BITMAPINFOHEADER)`);
      assert.deepEqual([datos.readInt32LE(4), datos.readInt32LE(8)], [ancho, alto * 2], `BMP ${i} de ${ancho} px`);
    }
    return ancho;
  }).sort((a, b) => a - b);
}

test('favicon: public/favicon.ico es un ICO real con 16, 32 y 48 px', () => {
  assert.deepEqual(ladosDelIco(readFileSync(path.join(RAIZ, 'public', 'favicon.ico'))), [16, 32, 48]);
});

test('favicon: dist/favicon.ico existe, es un ICO real con 16, 32 y 48 px y es el de public/', () => {
  const ico = readFileSync(path.join(DIST, 'favicon.ico'));
  assert.deepEqual(ladosDelIco(ico), [16, 32, 48]);
  assert.ok(ico.equals(readFileSync(path.join(RAIZ, 'public', 'favicon.ico'))), 'igual a public/favicon.ico');
});

test('favicon: el dist tiene las páginas de la base de adopción, el caso de demostración y las muestras', () => {
  const base = JSON.parse(readFileSync(path.join(RAIZ, 'docs/registros/adopcion-3d-ultra/seo-antes.json'), 'utf8'));
  // La sonda de 404 de la base (una ruta inexistente, con estado esperado 404) no tiene archivo propio; la 404 sí.
  const esperadas = new Set(Object.entries(base.pages).filter(([, p]) => p.expectedStatus === 200)
    .map(([r]) => path.relative(DIST, resolveRouteToFile(r, DIST)).split(path.sep).join('/')));
  for (const f of ['404.html', 'casos/gemelo-digital-bomba-despiece-sap-pi.html']) esperadas.add(f);
  for (const nombre of Object.keys(MUESTRAS)) esperadas.add(`muestras/${nombre}/index.html`);
  assert.deepEqual(paginas, [...esperadas].sort());
  assert.deepEqual(Object.keys(MUESTRAS).sort(), Object.keys(ICONO_MUESTRA).sort(), 'cada muestra tiene su excepción');
});

test('favicon: no hay artículos del blog con Post (sin slot head en el kit: excepción listada)', () => {
  const posts = paginas.filter((f) => nodosDe.get(f).some((n) => n.tagName === 'main' && attr(n, 'data-mcco') === 'post'));
  const mensaje = 'hay artículos con Post del kit, que no tiene slot head: declarar ahí /favicon.ico pide cambiar el kit';
  assert.deepEqual(posts, [], mensaje);
  assert.deepEqual(publishedBlogSlugs(path.join(RAIZ, 'src/content/blog')), [], mensaje);
});

for (const archivo of paginas) {
  const nodos = nodosDe.get(archivo);
  const muestra = muestraDe(archivo);
  if (muestra) {
    test(`favicon: ${archivo} (muestra estática con HTML propio) conserva su único ícono; excepción listada`, () => {
      assert.deepEqual(iconos(nodos).map((n) => attr(n, 'href')), [ICONO_MUESTRA[muestra]],
        'la muestra cambió su ícono: revisar la excepción de esta prueba');
    });
    continue;
  }
  test(`favicon: ${archivo} declara un solo ícono, /favicon.ico, en su <head>`, () => {
    assert.ok(clases(nodos.find((n) => n.tagName === 'body')).includes('std'), 'la página usa Estandar (body.std)');
    const encontrados = iconos(nodos);
    assert.deepEqual(encontrados.map((n) => attr(n, 'href')), ['/favicon.ico']);
    assert.equal(encontrados[0].parentNode?.tagName, 'head', 'el ícono va dentro del <head>');
  });
}
