// Importación de muestras interactivas a public/muestras/<nombre>/ con los ajustes de conformidad del sitio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ajustarHTML, quitarFuentes, generarMuestra, MUESTRAS, EXCLUIR } from '../scripts/importar-muestra.mjs';

const BASE = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Muestra</title>
<meta name="description" content="vieja">
</head><body><div class="marca"><div class="sello"></div><b>3D ULTRA</b></div><div id="pie">pie</div><div>resto</div></body></html>`;
const CONF = { nombre: 'prueba', titulo: 'Título de prueba', descripcion: 'Descripción de prueba con más de setenta caracteres para que la meta quede en el rango.', marca: '<div class="marca">', entidadDespuesDe: '<div id="pie">pie</div>' };
const cuenta = (s, re) => (s.match(re) ?? []).length;
const listar = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((d) => d.isFile())
  .map((d) => relative(dir, join(d.parentPath, d.name)).replaceAll('\\', '/'));

test('ajustarHTML deja la muestra fuera de buscadores, con canonical, Open Graph y descripción propias', () => {
  const out = ajustarHTML(BASE, CONF);
  assert.match(out, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(out, /<link rel="canonical" href="https:\/\/3d-ultra\.cl\/muestras\/prueba\/">/);
  assert.match(out, /<meta property="og:title" content="Título de prueba">/);
  assert.match(out, /<meta property="og:description" content="Descripción de prueba/);
  assert.equal(cuenta(out, /<meta name="description"/g), 1);
  assert.doesNotMatch(out, /content="vieja"/);
  assert.match(out, /<link rel="stylesheet" href="\.\/conformidad-mcco\.css">/);
});

test('ajustarHTML convierte la marca en el único h1 y conserva su contenido anidado', () => {
  const out = ajustarHTML(BASE, CONF);
  assert.equal(cuenta(out, /<h1[\s>]/g), 1);
  assert.match(out, /<h1 class="marca" data-mcco-marca><div class="sello"><\/div><b>3D ULTRA<\/b><\/h1><div id="pie">/);
});

test('ajustarHTML agrega la línea de la entidad con clase y sin estilos en línea', () => {
  const out = ajustarHTML(BASE, CONF);
  assert.match(out, /<div id="pie">pie<\/div><p class="mcco-entidad">3D Ultra · Inversiones MCCO SpA · <span class="mcco-rut">RUT 77\.715\.147-9<\/span> · Suecia 283, of\. 402, Providencia, Santiago<\/p>/);
  assert.doesNotMatch(out, /\sstyle=/);
});

test('ajustarHTML falla con un origen que ya trae h1, ya fue ajustado o no tiene las anclas', () => {
  assert.throws(() => ajustarHTML(BASE.replace('<body>', '<body><h1>x</h1>'), CONF), /h1/);
  assert.throws(() => ajustarHTML(ajustarHTML(BASE, CONF), CONF), /ajustad/);
  assert.throws(() => ajustarHTML(BASE, { ...CONF, marca: '<div class="otra">' }), /marca/);
  assert.throws(() => ajustarHTML(BASE, { ...CONF, entidadDespuesDe: '<p>nada</p>' }), /entidad/);
});

test('quitarFuentes retira Montserrat de la pila y rechaza fuentes remotas', () => {
  assert.equal(quitarFuentes('body { font-family: Montserrat, "Segoe UI", sans-serif; }'), 'body { font-family: "Segoe UI", sans-serif; }');
  assert.throws(() => quitarFuentes('@import url(https://fonts.googleapis.com/css2?family=Inter);'), /remota/);
});

test('generarMuestra excluye los archivos que no se publican y agrega la hoja de conformidad', () => {
  for (const fuera of ['_headers', 'paso-a-paso.html', 'paso-a-paso.css', 'video']) assert.ok(EXCLUIR.includes(fuera), fuera);
  const conf = MUESTRAS.bomba;
  if (!existsSync(conf.origen)) return; // la carpeta de origen vive fuera del repo (no está en la CI)
  const archivos = generarMuestra('bomba');
  assert.ok(archivos.has('index.html') && archivos.has('conformidad-mcco.css'));
  for (const ruta of archivos.keys()) assert.ok(!EXCLUIR.some((e) => ruta === e || ruta.startsWith(`${e}/`)), ruta);
});

// Las dos versiones publicadas cumplen lo mismo, y si su origen está en disco, son exactamente lo que genera el script.
for (const nombre of Object.keys(MUESTRAS)) {
  test(`public/muestras/${nombre}: conformidad y reproducibilidad`, () => {
    const dir = join('public/muestras', nombre);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    assert.ok(html.includes(`<link rel="canonical" href="https://3d-ultra.cl/muestras/${nombre}/">`));
    assert.match(html, /<meta property="og:title"/);
    assert.equal(cuenta(html, /<h1[\s>]/g), 1);
    assert.match(html, /class="mcco-entidad"/);
    assert.doesNotMatch(html, /\sstyle=/);
    const publicados = listar(dir);
    for (const f of publicados.filter((p) => /\.(css|html|js)$/.test(p))) assert.doesNotMatch(readFileSync(join(dir, f), 'utf8'), /Montserrat|fonts\.googleapis/, f);
    for (const fuera of EXCLUIR) assert.ok(!publicados.some((p) => p === fuera || p.startsWith(`${fuera}/`)), fuera);
    if (!existsSync(MUESTRAS[nombre].origen)) return;
    const generados = generarMuestra(nombre);
    assert.deepEqual([...generados.keys()].sort(), publicados.sort());
    for (const [ruta, contenido] of generados) assert.ok(contenido.equals(readFileSync(join(dir, ruta))), `${ruta} difiere de lo que genera el script`);
  });
}
