// Solo posterior a build: npm run check. Enlace «Saltar al contenido» del kit v1.4.2 en el HTML construido.
// `Estandar` (aquí, vía Sitio.astro) lo emite como primer hijo del <body>: a.std-saltar hacia main#std-contenido, con
// el texto en el idioma de la página («Skip to content» en /en/faq). `Post` (artículos del blog, hoy sin entradas)
// emite a.mcco-saltar hacia main#mcco-contenido. El sitio no pone un enlace de salto propio: cada página tiene uno
// solo, el del kit, y ese id lo lleva solo el único <main>. Ningún enlace interno a un ancla queda sin destino (de la
// misma página, de otra del sitio o relativo, como ../index.html#contacto) y la hoja de cada página trae la regla
// .std-saltar del kit, que lo oculta hasta recibir el foco. Las muestras estáticas de /muestras/ tienen su propio HTML
// sin el estándar y quedan fuera.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { resolveRouteToFile } from '../../scripts/verificar-adopcion.mjs';

const elements = (node) => [node, ...(node.childNodes ?? []).flatMap(elements)];
const attr = (node, name) => node?.attrs?.find((a) => a.name === name)?.value;
const text = (node) => [node.value ?? '', ...(node.childNodes ?? []).map(text)].join('').replace(/\s+/g, ' ').trim();
const clases = (node) => (attr(node, 'class') ?? '').split(/\s+/).filter(Boolean);
const ORIGEN = 'https://3d-ultra.cl';

// Páginas HTML del dist (ruta relativa con separador /), sin las muestras estáticas.
const archivos = readdirSync('dist', { recursive: true }).map(String)
  .filter((f) => f.endsWith('.html')).map((f) => f.split(path.sep).join('/')).sort();
const paginas = archivos.filter((f) => !f.startsWith('muestras/'));
const nodosDe = new Map(archivos.map((f) => [f, elements(parse(readFileSync(path.join('dist', f), 'utf8')))]));
const idsDe = (f) => nodosDe.get(f).map((n) => attr(n, 'id')).filter(Boolean);

// Archivo del dist que sirve una ruta del sitio (/, /x, /x.html, /x/).
function archivoDe(pathname) {
  const p = decodeURIComponent(pathname).replace(/^\/+/, '');
  for (const c of p === '' || p.endsWith('/') ? [`${p}index.html`] : p.endsWith('.html') ? [p] : [`${p}.html`, `${p}/index.html`]) {
    if (nodosDe.has(c)) return c;
  }
  return null;
}

test('saltar: el dist tiene las páginas de la base de adopción más el caso de demostración', () => {
  const base = JSON.parse(readFileSync('docs/registros/adopcion-3d-ultra/seo-antes.json', 'utf8'));
  // La sonda de 404 de la base (una ruta inexistente, con estado esperado 404) no tiene archivo propio.
  const esperadas = new Set(Object.entries(base.pages).filter(([, p]) => p.expectedStatus === 200)
    .map(([r]) => path.relative('dist', resolveRouteToFile(r, 'dist')).split(path.sep).join('/')));
  esperadas.add('casos/gemelo-digital-bomba-despiece-sap-pi.html');
  assert.deepEqual(paginas, [...esperadas].sort());
});

for (const archivo of paginas) {
  const nodos = nodosDe.get(archivo);
  const body = nodos.find((n) => n.tagName === 'body');
  const mains = nodos.filter((n) => n.tagName === 'main');
  const post = mains.some((n) => attr(n, 'data-mcco') === 'post');
  const [clase, id] = post ? ['mcco-saltar', 'mcco-contenido'] : ['std-saltar', 'std-contenido'];

  test(`saltar: ${archivo} abre con un solo enlace de salto, el del kit, hacia su <main>`, () => {
    assert.ok(post || clases(body).includes('std'), 'la página usa Estandar (body.std) o Post');
    const lang = attr(nodos.find((n) => n.tagName === 'html'), 'lang') ?? '';
    const primero = body.childNodes.find((n) => n.tagName || (n.value ?? '').trim());
    assert.equal(primero?.tagName, 'a', 'el primer hijo del <body> es un enlace');
    assert.ok(clases(primero).includes(clase), `clase ${clase}`);
    assert.equal(attr(primero, 'href'), `#${id}`);
    assert.equal(text(primero), /^es\b/i.test(lang) ? 'Saltar al contenido' : 'Skip to content');
    // Ningún otro enlace de salto, ni del kit ni propio del sitio.
    const saltos = nodos.filter((n) => n.tagName === 'a'
      && (/saltar|skip/i.test(text(n)) || clases(n).some((c) => /saltar|skip/i.test(c))));
    assert.equal(saltos.length, 1, 'un solo enlace de salto');
    // Un solo <main> y es el único elemento con ese id.
    assert.equal(mains.length, 1, 'un solo <main>');
    assert.deepEqual(nodos.filter((n) => attr(n, 'id') === id).map((n) => n.tagName), ['main']);
  });

  test(`saltar: en ${archivo} cada enlace interno a un ancla tiene destino`, () => {
    const url = new URL(`/${archivo}`, ORIGEN);
    const rotos = nodos.filter((n) => n.tagName === 'a' && attr(n, 'href')?.includes('#')).map((n) => attr(n, 'href'))
      .filter((href) => {
        const destino = new URL(href, url);
        if (destino.origin !== ORIGEN || destino.hash.length < 2) return false;
        const pagina = destino.pathname === url.pathname ? archivo : archivoDe(destino.pathname);
        return !pagina || !idsDe(pagina).includes(decodeURIComponent(destino.hash.slice(1)));
      });
    assert.deepEqual(rotos, []);
  });

  test(`saltar: la hoja de ${archivo} trae la regla .${clase} del kit`, () => {
    const css = nodos.filter((n) => n.tagName === 'link' && attr(n, 'rel') === 'stylesheet')
      .map((n) => readFileSync(path.join('dist', attr(n, 'href').split('?')[0]), 'utf8')).join('\n')
      + nodos.filter((n) => n.tagName === 'style').map(text).join('\n');
    assert.match(css, new RegExp(`\\.${clase}\\s*\\{`));
    assert.match(css, new RegExp(`\\.${clase}:focus\\b`));
  });
}
