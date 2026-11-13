import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'parse5';
import { verifyInterior, interiorWarnings, resolveRouteToFile, verifyBlogIndex, publishedBlogSlugs } from '../../scripts/verificar-adopcion.mjs';

const baseline = JSON.parse(readFileSync('docs/registros/adopcion-3d-ultra/interiores-antes.json', 'utf8'));
const elements = node => [node, ...(node.childNodes ?? []).flatMap(elements)];
const attr = (node, name) => node?.attrs?.find(a => a.name === name)?.value;
// Tablas del original: una en el caso RAF, una en el caso CPS y una en la guía; ninguna en las otras tres.
const TABLAS = { '/casos/gemelo-digital-raf-potrerillos': 1, '/casos/analisis-chimenea-cps-salvador': 1, '/guias/gemelos-digitales-fundiciones-cobre': 1 };
for (const [route, before] of Object.entries(baseline.pages)) {
  test(`${route}: contenido, tablas, enlaces y OG construidos`, () => {
    const html = readFileSync(resolveRouteToFile(route, 'dist'), 'utf8');
    assert.deepEqual(verifyInterior(html, before), []);
    const nodes = elements(parse(html));
    assert.equal(nodes.filter(n => n.tagName === 'h1').length, 1);
    // Tarea 6: documento del estándar con su idioma propio, sin robots (como el original) y tablas desplazables.
    assert.equal(nodes.filter(n => n.tagName === 'main').length, 1);
    assert.equal(nodes.filter(n => attr(n, 'data-mcco') === 'grupo').length, 1);
    assert.equal(attr(nodes.find(n => n.tagName === 'html'), 'lang'), route === '/en/faq' ? 'en' : 'es');
    assert.ok(!nodes.some(n => n.tagName === 'meta' && attr(n, 'name') === 'robots'));
    assert.ok(!nodes.some(n => n.tagName === 'link' && /fonts\.google/.test(attr(n, 'href') ?? '')), `${route}: sin Google Fonts`);
    const conClase = c => n => (attr(n, 'class') ?? '').split(/\s+/).includes(c);
    const tablas = nodes.filter(n => n.tagName === 'table');
    assert.equal(tablas.length, TABLAS[route] ?? 0, `${route}: tablas esperadas`);
    for (const contenedor of tablas.map(t => t.parentNode)) {
      assert.ok(conClase('interior-tabla')(contenedor) && attr(contenedor, 'tabindex') === '0', `${route}: tabla sin contenedor desplazable`);
    }
    // Donde la base ya tenía og:image, la vista previa no cambia. Donde no la tenía, el kit v1.4.0 la agrega y queda
    // como aviso del verificador (desviación aceptada hasta ogImage={false} en v1.4.1).
    const previa = before.opengraph.some(m => m.property === 'og:image');
    if (previa) assert.deepEqual(interiorWarnings(html, before), []);
    else assert.ok(interiorWarnings(html, before).length > 0);
    if (route.startsWith('/casos/')) assert.ok(nodes.some(n => n.tagName === 'a' && attr(n, 'href') === '/biblioteca/'));
    if (route === '/en/faq') {
      assert.equal(attr(nodes.find(n => n.tagName === 'html'), 'lang'), 'en');
      const faq = nodes.filter(n => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json')
        .map(n => JSON.parse(n.childNodes.map(t => t.value ?? '').join(''))).find(n => n['@type'] === 'FAQPage');
      assert.equal(faq.mainEntity.length, 10);
      for (const q of faq.mainEntity) assert.ok(before.contenido.includes(q.name));
    }
  });
}

test('el guardián rechaza pérdidas reales de cuerpo y OG, y canonical duplicado', () => {
  const route = '/casos/gemelo-digital-raf-potrerillos';
  const html = readFileSync(resolveRouteToFile(route, 'dist'), 'utf8');
  assert.ok(verifyInterior(html.replace(/(<article[^>]*>)[\s\S]*?<\/article>/, '$1</article>'), baseline.pages[route]).some(e => e.includes('contenido')));
  // Hallazgo OCR 1: las tecnologías intercambiadas entre filas de la tabla ya no pasan.
  const intercambio = html.replace(/(<td[^>]*>)FARO Focus Core</, '$1@@<').replace(/(<td[^>]*>)Autodesk Revit</, '$1FARO Focus Core<').replace('@@<', 'Autodesk Revit<');
  assert.notEqual(intercambio, html);
  assert.ok(verifyInterior(intercambio, baseline.pages[route]).some(e => e.includes('contenido')));
  // Revisión r1: el recuadro de hallazgos del caso CPS también está protegido (cifras intercambiadas entre rótulos).
  const cps = '/casos/analisis-chimenea-cps-salvador';
  const htmlCps = readFileSync(resolveRouteToFile(cps, 'dist'), 'utf8');
  const cifras = htmlCps.replace(/(class="stat-number"[^>]*>)Crítico</, '$1@@<').replace(/(class="stat-number"[^>]*>)0</, '$1Crítico<').replace('>@@<', '>0<');
  assert.notEqual(cifras, htmlCps);
  assert.deepEqual(verifyInterior(htmlCps, baseline.pages[cps]), []);
  assert.ok(verifyInterior(cifras, baseline.pages[cps]).some(e => e.includes('contenido')));
  assert.ok(verifyInterior(html.replace(/<meta property="og:description"[^>]*>/, ''), baseline.pages[route]).some(e => e.includes('og:description')));
  assert.ok(verifyInterior(html.replace('</head>', '<link rel="canonical" href="/otra"></head>'), baseline.pages[route]).some(e => e.includes('canonical')));
});

for (const route of ['/blog/', '/gracias', '/contacto-error', '/404']) {
  test(`${route}: auxiliar estándar, un main/H1/Grupo y robots`, () => {
    const nodes = elements(parse(readFileSync(resolveRouteToFile(route, 'dist'), 'utf8')));
    const tag = name => nodes.filter(n => n.tagName === name);
    assert.equal(tag('main').length, 1);
    assert.equal(tag('h1').length, 1);
    assert.equal(nodes.filter(n => attr(n, 'data-mcco') === 'grupo').length, 1);
    assert.equal(nodes.filter(n => (attr(n, 'class') ?? '').split(/\s+/).includes('std-gnav')).length, 1);
    // El blog depende de sus entradas publicadas (verifyBlogIndex); las otras tres son noindex siempre.
    if (route !== '/blog/') assert.equal(attr(tag('meta').find(n => attr(n, 'name') === 'robots'), 'content'), 'noindex, nofollow');
    assert.ok(!tag('link').some(n => /fonts\.google/.test(attr(n, 'href') ?? '')));
  });
}

test('/blog/: noindex y enlaces según las entradas publicadas', () => {
  const html = readFileSync(resolveRouteToFile('/blog/', 'dist'), 'utf8');
  assert.deepEqual(verifyBlogIndex(html, publishedBlogSlugs('src/content/blog')), []);
});
