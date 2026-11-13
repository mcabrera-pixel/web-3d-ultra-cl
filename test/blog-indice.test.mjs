// test/blog-indice.test.mjs — el índice del blog se juzga según el número de entradas publicadas.
// Hallazgo OCR 2 de B5-t6: la prueba exigía noindex y cero enlaces para siempre, y fallaría con el primer post.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { verifyBlogIndex, publishedBlogSlugs } from '../scripts/verificar-adopcion.mjs';

const indice = ({ robots, enlaces = [] }) => `<!DOCTYPE html><html lang="es-CL"><head><meta name="robots" content="${robots}"></head>`
  + `<body><main><a href="/">3D Ultra</a><a href="/blog/">Blog</a>${enlaces.map(s => `<a href="/blog/${s}">Post</a>`).join('')}</main></body></html>`;
const NOINDEX = 'noindex, nofollow';
const INDEX = 'index, follow, max-image-preview:large, max-snippet:-1';

describe('verifyBlogIndex', () => {
  it('sin entradas: noindex y sin enlaces a artículos', () => {
    assert.deepEqual(verifyBlogIndex(indice({ robots: NOINDEX }), []), []);
    assert.ok(verifyBlogIndex(indice({ robots: INDEX }), []).length, 'vacío indexable');
    assert.ok(verifyBlogIndex(indice({ robots: NOINDEX, enlaces: ['huerfano'] }), []).length, 'vacío con enlace');
  });

  it('con entradas: indexable y con un enlace por entrada', () => {
    assert.deepEqual(verifyBlogIndex(indice({ robots: INDEX, enlaces: ['uno', 'dos'] }), ['uno', 'dos']), []);
    assert.ok(verifyBlogIndex(indice({ robots: NOINDEX, enlaces: ['uno', 'dos'] }), ['uno', 'dos']).length, 'publicado con noindex');
    assert.ok(verifyBlogIndex(indice({ robots: INDEX, enlaces: ['uno'] }), ['uno', 'dos']).length, 'falta un enlace');
    assert.ok(verifyBlogIndex(indice({ robots: INDEX, enlaces: ['uno', 'borrador'] }), ['uno']).length, 'enlace a algo no publicado');
  });
});

describe('publishedBlogSlugs', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'blog-'));
  const post = (rel, frontmatter) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), `---\n${frontmatter}\n---\nCuerpo\n`); };

  it('cuenta solo Markdown publicado, con el id que genera Astro', () => {
    try {
      writeFileSync(path.join(dir, '_README.md'), 'Instrucciones, no es una entrada.');
      assert.deepEqual(publishedBlogSlugs(dir), []);
      post('Escaneo Láser en Fundición.md', 'title: Uno');
      post('borrador.md', 'title: Dos\ndraft: true');
      post('serie/parte-1.md', 'title: Tres\ndraft: false');
      post('con-slug.md', 'title: Cuatro\nslug: propio');
      assert.deepEqual(publishedBlogSlugs(dir), ['escaneo-láser-en-fundición', 'propio', 'serie/parte-1'].sort());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
