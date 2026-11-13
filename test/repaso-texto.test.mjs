import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentos, hallazgos, repasar } from '../scripts/repaso-texto.mjs';

test('segmentos: texto visible, title, metas de descripción, alt y aria-label; sin scripts ni estilos', () => {
  const html = `<html><head><title>Título  de prueba</title><meta name="description" content="Descripción breve">
    <meta property="og:title" content="Título OG"><style>.a::after{content:"→"}</style></head>
    <body><p>Hola <strong>mundo</strong></p><img src="a.webp" alt="Foto de faena"><button aria-label="Cerrar menú">x</button>
    <script>alert("¡no cuenta!")</script><script type="application/ld+json">{"a":"¡tampoco!"}</script></body></html>`;
  const t = segmentos(html);
  for (const s of ['Título de prueba', 'Descripción breve', 'Título OG', 'Hola', 'mundo', 'Foto de faena', 'Cerrar menú']) assert.ok(t.includes(s), s);
  assert.ok(!t.some(s => /no cuenta|tampoco|→/.test(s)));
});

test('hallazgos: emoji, flecha, raya como conector, exclamación y voseo', () => {
  const casos = {
    emoji: 'Resumen 🤖 citable',
    flecha: 'escaneo → modelo',
    raya: 'Caso RAF — Potrerillos',
    exclamacion: '¡Escríbanos hoy',
    voseo: 'Si querés, escribinos',
  };
  for (const [regla, texto] of Object.entries(casos)) assert.deepEqual(hallazgos(texto).map(h => h.regla), [regla], regla);
});

test('hallazgos: no confunde comillas latinas, rangos con guion corto ni pretéritos con voseo', () => {
  for (const texto of ['Rótulo «Render 3D»', 'Entre 2–3 semanas', 'Ayer elegí el modelo', 'Correo: a@b.cl', 'Paso 1 de 3']) {
    assert.deepEqual(hallazgos(texto), [], texto);
  }
});

test('repasar: lo heredado registrado se informa aparte y lo nuevo es hallazgo', () => {
  const paginas = [{ archivo: 'dist/a.html', html: '<p>Caso RAF — Potrerillos</p><p>Texto nuevo — con raya</p><p>Sin problemas</p>' }];
  const r = repasar(paginas, ['Caso RAF — Potrerillos', 'Registro que ya no aparece']);
  assert.deepEqual(r.hallazgos.map(h => h.texto), ['Texto nuevo — con raya']);
  assert.deepEqual(r.heredados.map(h => h.texto), ['Caso RAF — Potrerillos']);
  assert.deepEqual(r.sinUso, ['Registro que ya no aparece']);
});
