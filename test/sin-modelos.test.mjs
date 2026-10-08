import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, rmdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archivosProhibidos } from '../scripts/sin-modelos.mjs';

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
