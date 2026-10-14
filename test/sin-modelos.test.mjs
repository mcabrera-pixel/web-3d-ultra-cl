import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, rmdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archivosProhibidos, problemasDist } from '../scripts/sin-modelos.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const guardia = join(raiz, 'scripts', 'sin-modelos.mjs');

test('detecta modelos y comprimidos sin importar mayúsculas', () => {
  assert.deepEqual(
    archivosProhibidos(['public/a.webp', 'x/Modelo.FBX', 'b.glb', 'c.zip', 'src/x.astro', 'd.blend']),
    ['x/Modelo.FBX', 'b.glb', 'c.zip', 'd.blend'],
  );
});

test('deja pasar imágenes, json, ajustes y código', () => {
  assert.deepEqual(archivosProhibidos(['public/biblioteca/x/poster.webp', 'public/biblioteca/x/piezas.json', 'tools/equipos/x.json', 'tools/equipos/preparar.py']), []);
});

test('no confunde nombres que solo contienen la extensión', () => {
  assert.deepEqual(archivosProhibidos(['notas.objetivos.md', 'glb-notas.txt', 'a.step.md', 'zipper.js']), []);
});

test('también rechaza las fuentes que traerá F2: 7z, dae, ply, ma, mb, skp y 3mf', () => {
  assert.deepEqual(
    archivosProhibidos(['a.7z', 'b.DAE', 'c.ply', 'd.ma', 'e.mb', 'f.skp', 'g.3mf', 'h.md', 'i.mbx', 'j.map']),
    ['a.7z', 'b.DAE', 'c.ply', 'd.ma', 'e.mb', 'f.skp', 'g.3mf'],
  );
});

// dist/ temporal con los archivos dados (ruta → contenido)
function distTemporal(archivos) {
  const dist = mkdtempSync(join(tmpdir(), 'sin-modelos-dist-'));
  for (const [ruta, contenido] of Object.entries(archivos)) {
    mkdirSync(dirname(join(dist, ruta)), { recursive: true });
    writeFileSync(join(dist, ruta), contenido);
  }
  return dist;
}
// Los datos del visor como los escribe Visor3D.astro en la ficha
const ficha = (modelo) => `<div data-visor><script type="application/json" class="bib-datos">{"grupos":[],"modelo":"${modelo}"}</script></div>`;
const SANO = {
  'index.html': '<h1>3D Ultra</h1>',
  'biblioteca/index.html': '<h1>Biblioteca</h1>',
  'biblioteca/sandvik-lh621.html': ficha('/modelos/sandvik-lh621.glb'),
  'biblioteca/sandvik-lh621/poster.webp': 'webp',
};
function conDist(archivos, fn) {
  const dist = distTemporal(archivos);
  try {
    return fn(dist);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
}

test('dist sano: sin problemas', () => {
  conDist(SANO, (dist) => assert.deepEqual(problemasDist(dist), []));
});

test('dist: un modelo copiado desde public/ es un problema', () => {
  conDist({ ...SANO, 'assets/Equipo.GLB': 'glb' }, (dist) => {
    const p = problemasDist(dist);
    assert.equal(p.length, 1, p.join('\n'));
    assert.match(p[0], /assets\/Equipo\.GLB/);
  });
});

test('dist: la carpeta _local/ de las pruebas locales es un problema, traiga lo que traiga', () => {
  conDist({ ...SANO, '_local/sandvik-lh621.glb': 'glb', '_local/notas.txt': 'x' }, (dist) => {
    const p = problemasDist(dist);
    assert.equal(p.length, 2, p.join('\n'));
    assert.ok(p.every((x) => /_local\//.test(x)), p.join('\n'));
  });
});

test('dist: una ficha que pide el modelo fuera de /modelos/ es un problema (PUBLIC_MODELOS_BASE olvidado)', () => {
  conDist({ ...SANO, 'biblioteca/sandvik-lh621.html': ficha('/_local/sandvik-lh621.glb') }, (dist) => {
    const p = problemasDist(dist);
    assert.equal(p.length, 1, p.join('\n'));
    assert.match(p[0], /biblioteca\/sandvik-lh621\.html/);
    assert.match(p[0], /\/_local\/sandvik-lh621\.glb/);
  });
});

test('dist: una ficha sin modelo o con el de otro equipo es un problema', () => {
  const archivos = { ...SANO, 'biblioteca/sandvik-lh621.html': '<h1>Sandvik</h1>', 'biblioteca/komatsu-930e-5.html': ficha('/modelos/sandvik-lh621.glb') };
  conDist(archivos, (dist) => {
    const p = problemasDist(dist);
    assert.equal(p.length, 2, p.join('\n'));
    assert.match(p.join('\n'), /sandvik-lh621\.html/);
    assert.match(p.join('\n'), /komatsu-930e-5\.html/);
  });
});

test('con --dist, la guardia falla si hay problemas y da OK con un dist sano', () => {
  conDist({ ...SANO, '_local/sandvik-lh621.glb': 'glb' }, (dist) => {
    const r = spawnSync(process.execPath, [guardia, '--dist', dist], { cwd: raiz, encoding: 'utf8' });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /_local\/sandvik-lh621\.glb/);
  });
  conDist(SANO, (dist) => {
    const r = spawnSync(process.execPath, [guardia, '--dist', dist], { cwd: raiz, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /sin-modelos: .* OK/);
  });
});

// Repo git temporal con una copia de la guardia y los archivos dados, todos en el índice.
function repoTemporal(archivos) {
  const contenedor = mkdtempSync(join(tmpdir(), 'sin-modelos-'));
  const repo = join(contenedor, 'repo');
  const todos = { 'scripts/sin-modelos.mjs': readFileSync(guardia, 'utf8'), ...archivos };
  for (const [ruta, contenido] of Object.entries(todos)) {
    mkdirSync(dirname(join(repo, ruta)), { recursive: true });
    writeFileSync(join(repo, ruta), contenido);
  }
  execFileSync('git', ['init', '-q'], { cwd: repo, stdio: 'pipe' });
  execFileSync('git', ['add', '--', ...Object.keys(todos)], { cwd: repo, stdio: 'pipe' });
  return { contenedor, repo };
}

// Quita la junction sin tocar su destino y luego el contenedor temporal.
function limpiar(contenedor, enlace) {
  try {
    rmdirSync(enlace);
  } catch {
    // el enlace no llegó a crearse
  }
  rmSync(contenedor, { recursive: true, force: true });
}

test('detecta un modelo versionado aunque la guardia se invoque por una junction', () => {
  const { contenedor, repo } = repoTemporal({ 'public/Modelo.GLB': 'glb' });
  const enlace = join(contenedor, 'enlace');
  try {
    symlinkSync(repo, enlace, 'junction');
    const r = spawnSync(process.execPath, ['scripts/sin-modelos.mjs'], { cwd: enlace, encoding: 'utf8' });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /public\/Modelo\.GLB/);
  } finally {
    limpiar(contenedor, enlace);
  }
});

test('por una junction, la guardia cuenta los archivos y da OK sin modelos', () => {
  const { contenedor, repo } = repoTemporal({ 'public/poster.webp': 'webp' });
  const enlace = join(contenedor, 'enlace');
  try {
    symlinkSync(repo, enlace, 'junction');
    const r = spawnSync(process.execPath, ['scripts/sin-modelos.mjs'], { cwd: enlace, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /sin-modelos: OK \(2 archivos revisados\)/);
  } finally {
    limpiar(contenedor, enlace);
  }
});

test('el prebuild corre la guardia, así la CI la ejecuta con npm run build', () => {
  const pkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.prebuild, /node scripts\/sin-modelos\.mjs/);
});

test('el postbuild revisa dist y el prebuild corre las pruebas: npm run build los ejecuta también en la CI', () => {
  const pkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.postbuild ?? '', /node scripts\/sin-modelos\.mjs --dist dist/);
  assert.match(pkg.scripts.prebuild, /npm test/);
});
