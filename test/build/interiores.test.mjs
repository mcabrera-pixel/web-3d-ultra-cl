import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'parse5';
import { verifyInterior, resolveRouteToFile } from '../../scripts/verificar-adopcion.mjs';

const baseline = JSON.parse(readFileSync('docs/registros/adopcion-3d-ultra/interiores-antes.json', 'utf8'));
const elements = node => [node, ...(node.childNodes ?? []).flatMap(elements)];
const attr = (node, name) => node?.attrs?.find(a => a.name === name)?.value;
for (const [route, before] of Object.entries(baseline.pages)) {
  test(`${route}: contenido, tablas, enlaces y OG construidos`, () => {
    const html = readFileSync(resolveRouteToFile(route, 'dist'), 'utf8');
    assert.deepEqual(verifyInterior(html, before), []);
    const nodes = elements(parse(html));
    assert.equal(nodes.filter(n => n.tagName === 'h1').length, 1);
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
  assert.ok(verifyInterior(html.replace(/<article>[\s\S]*?<\/article>/, '<article></article>'), baseline.pages[route]).some(e => e.includes('contenido')));
  assert.ok(verifyInterior(html.replace(/<meta property="og:description"[^>]*>/, ''), baseline.pages[route]).some(e => e.includes('og:description')));
  assert.ok(verifyInterior(html.replace('</head>', '<link rel="canonical" href="/otra"></head>'), baseline.pages[route]).some(e => e.includes('canonical')));
});

for (const route of ['/blog/', '/gracias', '/contacto-error', '/404']) {
  test(`${route}: auxiliar estándar, un main/H1/Grupo y noindex`, () => {
    const nodes = elements(parse(readFileSync(resolveRouteToFile(route, 'dist'), 'utf8')));
    const tag = name => nodes.filter(n => n.tagName === name);
    assert.equal(tag('main').length, 1);
    assert.equal(tag('h1').length, 1);
    assert.equal(nodes.filter(n => attr(n, 'data-mcco') === 'grupo').length, 1);
    assert.equal(nodes.filter(n => (attr(n, 'class') ?? '').split(/\s+/).includes('std-gnav')).length, 1);
    assert.equal(attr(tag('meta').find(n => attr(n, 'name') === 'robots'), 'content'), 'noindex, nofollow');
    assert.ok(!tag('link').some(n => /fonts\.google/.test(attr(n, 'href') ?? '')));
    if (route === '/blog/') assert.ok(!tag('a').some(n => /^\/blog\/[^/]+/.test(attr(n, 'href') ?? '')));
  });
}
