// Contrato de CSP del sitio (Tarea 7). _headers lo genera mcco-headers desde site.yaml en prebuild.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const site = yaml.load(readFileSync('site.yaml', 'utf8'));
const csp = Object.fromEntries(readFileSync('public/_headers', 'utf8').match(/Content-Security-Policy: (.*)/)[1]
  .split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));

test('conserva Wasm de Meshopt, blob: del visor, R2 de videos y sin unsafe-eval', () => {
  assert.ok(csp['script-src'].includes("'wasm-unsafe-eval'"));
  assert.ok(!csp['script-src'].includes("'unsafe-eval'"));
  assert.equal(site.csp.unsafe_eval, false);
  assert.ok(csp['connect-src'].includes('blob:'));
  assert.ok(csp['media-src'].includes('https://pub-dd66483f8e7f497f9490ea37068612b0.r2.dev'));
});

test('el Worker de la nube, del mismo origen, queda permitido', () => {
  const worker = csp['worker-src'] ?? csp['child-src'] ?? csp['script-src'];
  assert.ok(worker.includes("'self'"));
});

test('el sitio no pide orígenes remotos que ya no usa', () => {
  assert.deepEqual(site.csp.img_src, []);
  assert.ok(!csp['img-src'].some((o) => o.includes('unsplash')));
  for (const clave of ['style_src', 'font_src']) assert.ok(!(site.csp[clave] ?? []).some((o) => /fonts\.(googleapis|gstatic)/.test(o)), clave);
});

test('mcco-check trata R11-R13 como error', () => {
  assert.equal(site.check?.visual, 'error');
});
