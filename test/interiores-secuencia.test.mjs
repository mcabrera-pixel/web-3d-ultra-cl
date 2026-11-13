// test/interiores-secuencia.test.mjs — el guardián de interiores compara la secuencia del cuerpo, no un conjunto.
// Hallazgo OCR 1 de B5-t6: intercambiar dos celdas de la tabla del caso RAF pasaba la verificación.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractInterior, verifyInterior, interiorWarnings } from '../scripts/verificar-adopcion.mjs';

const OG = '<meta property="og:type" content="article"><meta property="og:title" content="Caso">';
const doc = (cuerpo) => `<!DOCTYPE html><html lang="es"><head><link rel="canonical" href="https://3d-ultra.cl/x">${OG}</head><body><article>${cuerpo}</article></body></html>`;

// Tabla de tecnología del caso RAF, tal como estaba en el HTML original.
const FILAS = [
  ['Componente', 'Tecnología', 'Especificación'],
  ['Escaneo láser', 'FARO Focus Core', '±1mm precisión, 1M pts/seg'],
  ['Formatos de salida', 'E57 / RCP / LAS', 'Nube de puntos georreferenciada'],
  ['Procesamiento', 'FARO Scene + ReCap', 'Registro espacial automatizado'],
  ['Modelado BIM', 'Autodesk Revit', 'LOD 300 paramétrico'],
];
const tabla = (filas) => `<h2>5. Tecnología Utilizada</h2><table>${filas.map((f, i) => `<tr>${f.map(c => i ? `<td>${c}</td>` : `<th>${c}</th>`).join('')}</tr>`).join('')}</table>`;
const intercambiar = (filas) => filas.map(f => f.map(c => c === 'FARO Focus Core' ? 'Autodesk Revit' : c === 'Autodesk Revit' ? 'FARO Focus Core' : c));

describe('verifyInterior: secuencia del contenido', () => {
  it('acepta el mismo cuerpo', () => {
    const html = doc(tabla(FILAS));
    assert.deepEqual(verifyInterior(html, extractInterior(html)), []);
  });

  it('rechaza el intercambio de celdas entre filas que reprodujo OCR', () => {
    const base = extractInterior(doc(tabla(FILAS)));
    const errores = verifyInterior(doc(tabla(intercambiar(FILAS))), base);
    assert.ok(errores.some(e => e.includes('contenido')), JSON.stringify(errores));
  });

  it('rechaza el intercambio sobre la línea base real del caso RAF', () => {
    const base = JSON.parse(readFileSync('docs/registros/adopcion-3d-ultra/interiores-antes.json', 'utf8')).pages['/casos/gemelo-digital-raf-potrerillos'];
    const og = base.opengraph.map(m => `<meta property="${m.property}" content="${m.content}">`).join('');
    const render = (contenido) => `<!DOCTYPE html><html><head><link rel="canonical" href="${base.opengraph[1].content}">${og}</head><body><article>`
      + contenido.map(t => `<p>${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('')
      + base.enlaces.map(a => `<a href="${a.href}">${a.texto}</a>`).join('') + '</article></body></html>';
    assert.ok(base.contenido.includes('FARO Focus Core') && base.contenido.includes('Autodesk Revit'));
    assert.deepEqual(verifyInterior(render(base.contenido), base), [], 'control: la base renderizada cumple');
    const errores = verifyInterior(render(intercambiar([base.contenido])[0]), base);
    assert.ok(errores.some(e => e.includes('contenido')), JSON.stringify(errores));
  });

  it('rechaza cambiar el orden de dos párrafos', () => {
    const base = extractInterior(doc('<p>Primero</p><p>Segundo</p><p>Tercero</p>'));
    assert.ok(verifyInterior(doc('<p>Primero</p><p>Tercero</p><p>Segundo</p>'), base).some(e => e.includes('contenido')));
  });

  it('rechaza perder una repetición', () => {
    const base = extractInterior(doc('<table><tr><td>Sí</td><td>Sí</td><td>No</td></tr></table>'));
    assert.ok(verifyInterior(doc('<table><tr><td>Sí</td><td>No</td></tr></table>'), base).some(e => e.includes('contenido')));
  });

  it('admite piezas nuevas de presentación sin alterar el orden de lo heredado', () => {
    const base = extractInterior(doc('<p>Primero</p><p>Segundo</p>'));
    assert.deepEqual(verifyInterior(doc('<h1>Título</h1><p>Primero</p><h2>Rótulo</h2><p>Segundo</p>'), base), []);
  });

  it('rechaza enlaces del cuerpo en otro orden', () => {
    const base = extractInterior(doc('<p><a href="/a">A</a></p><p><a href="/b">B</a></p>'));
    const errores = verifyInterior(doc('<p><a href="/b">B</a></p><p><a href="/a">A</a></p>'), base);
    assert.ok(errores.some(e => e.includes('enlaces')), JSON.stringify(errores));
  });
});

// Revisión r1, menor 1: el cuerpo incluye hero, rótulos, cifras del recuadro y cierre, en orden de documento.
// El original no tiene <main>: se lee <body> sin la barra ni el pie antiguos. La página nueva se lee en <main>.
const ORIGINAL = `<!DOCTYPE html><html lang="es"><head>${OG}</head><body>
<div class="top-bar"><a href="../index.html">3D<span>ULTRA</span></a><a href="../index.html#contacto">Contacto</a></div>
<div class="article-hero"><span class="tag">Caso de Estudio</span><h1>Chimenea CPS</h1><p class="meta">Por 3D Ultra</p></div>
<article><div class="ai-capsule"><div class="label">Resumen AI</div><p>Resumen.</p></div>
<h2>4. Resultados</h2><div class="results-box"><h3>Hallazgos</h3>
<div class="stat"><span class="stat-number">Crítico</span><span class="stat-label">Deformaciones fuera de tolerancia</span></div>
<div class="stat"><span class="stat-number">0</span><span class="stat-label">Días de detención</span></div></div></article>
<div class="cta-section"><h2>¿Tiene un desafío similar?</h2><p>Sin costo.</p><a href="../index.html#contacto" class="btn">Solicitar Evaluación</a></div>
<footer>© 2026 3D Ultra</footer></body></html>`;
const nueva = (cambios = (s) => s) => cambios(`<!DOCTYPE html><html lang="es"><head><link rel="canonical" href="https://3d-ultra.cl/x">${OG}</head><body class="std">
<nav class="std-gnav"><a href="/#contacto">Contacto</a></nav><div class="std-subnav"><a href="/#contacto">Contactar</a></div><main>
<section><p class="interior-etiqueta">Caso de Estudio</p><h1>Chimenea CPS</h1><p class="interior-linea">Por 3D Ultra</p></section>
<article><section><div class="ai-capsule"><div class="label">Resumen AI</div><p>Resumen.</p></div></section>
<section><h2>4. Resultados</h2><div class="results-box"><h3>Hallazgos</h3>
<div class="stat"><span class="stat-number">Crítico</span><span class="stat-label">Deformaciones fuera de tolerancia</span></div>
<div class="stat"><span class="stat-number">0</span><span class="stat-label">Días de detención</span></div></div></section></article>
<section><h2>¿Tiene un desafío similar?</h2><p>Sin costo.</p><div class="std-acciones"><a href="../index.html#contacto" class="std-pildora">Solicitar Evaluación</a></div></section>
</main><footer class="pie-sitio"><p>Pie nuevo</p></footer><section data-mcco="grupo"><p>Grupo</p></section></body></html>`);

describe('verifyInterior: cobertura de hero, rótulos, recuadro y cierre', () => {
  const base = extractInterior(ORIGINAL);

  it('la base incluye hero, rótulo, cifras y cierre, sin la barra ni el pie antiguos', () => {
    for (const t of ['Caso de Estudio', 'Chimenea CPS', 'Por 3D Ultra', 'Resumen AI', 'Crítico', 'Días de detención', 'Sin costo.', 'Solicitar Evaluación']) {
      assert.ok(base.contenido.includes(t), t);
    }
    assert.ok(!base.contenido.includes('© 2026 3D Ultra') && !base.contenido.includes('Contacto'));
    assert.deepEqual(base.enlaces.map(e => e.href), ['../index.html#contacto']);
  });

  it('la página nueva con el mismo cuerpo cumple, aunque cambien barra, pie y bloque Grupo', () => {
    assert.deepEqual(verifyInterior(nueva(), base), []);
  });

  it('rechaza el intercambio de cifras del recuadro CPS', () => {
    const html = nueva(s => s.replace('>Crítico<', '>@@<').replace('>0<', '>Crítico<').replace('>@@<', '>0<'));
    assert.ok(verifyInterior(html, base).some(e => e.includes('contenido')));
  });

  it('rechaza cambios en el rótulo de la cápsula, el hero o el cierre', () => {
    for (const [de, a] of [['Resumen AI', 'Resumen IA'], ['>Caso de Estudio<', '>Caso<'], ['Solicitar Evaluación', 'Escribir']]) {
      assert.ok(verifyInterior(nueva(s => s.replace(de, a)), base).some(e => e.includes('contenido')), de);
    }
  });
});

// Revisión r1, importante 1: una imagen de vista previa que la base no tenía se avisa, sin fallar.
describe('interiorWarnings: imágenes de vista previa agregadas', () => {
  const head = (metas) => `<!DOCTYPE html><html><head><link rel="canonical" href="https://3d-ultra.cl/x">${metas}</head><body><main><p>Hola</p></main></body></html>`;
  const sinImagen = extractInterior(head('<meta property="og:type" content="article">'));
  const conImagen = extractInterior(head('<meta property="og:type" content="article"><meta property="og:image" content="https://3d-ultra.cl/og.webp">'));
  const kit = head('<meta property="og:type" content="article"><meta property="og:image" content="https://3d-ultra.cl/og.webp"><meta name="twitter:image" content="https://3d-ultra.cl/og.webp">');

  it('avisa og:image y twitter:image si la base no tenía imagen, y no lo cuenta como error', () => {
    const avisos = interiorWarnings(kit, sinImagen);
    assert.ok(avisos.some(a => a.includes('og:image')) && avisos.some(a => a.includes('twitter:image')), JSON.stringify(avisos));
    assert.deepEqual(verifyInterior(kit, sinImagen), []);
  });

  it('no avisa si la imagen es la misma que ya tenía la base', () => {
    assert.deepEqual(interiorWarnings(kit, conImagen), []);
  });

  it('avisa si la imagen cambia respecto de la base', () => {
    assert.ok(interiorWarnings(kit.replaceAll('og.webp', 'otra.webp'), conImagen).length);
  });
});
